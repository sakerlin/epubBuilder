'use strict'

const fs = require('fs')
const zlib = require('zlib')

const SIG_LOCAL = 0x04034b50
const SIG_CENTRAL = 0x02014b50
const METHOD_STORE = 0
const METHOD_DEFLATE = 8

/**
 * Minimal ZIP reader (local headers) — enough for EPUB structure checks.
 * @returns {Array<{ name: string, method: number, data: Buffer }>}
 */
function readZipEntries (buf) {
  const entries = []
  let o = 0
  while (o + 30 <= buf.length) {
    const sig = buf.readUInt32LE(o)
    if (sig === SIG_CENTRAL || sig === 0x06054b50) break
    if (sig !== SIG_LOCAL) {
      // skip junk / padding
      o++
      continue
    }
    const method = buf.readUInt16LE(o + 8)
    const compSize = buf.readUInt32LE(o + 18)
    const nameLen = buf.readUInt16LE(o + 26)
    const extraLen = buf.readUInt16LE(o + 28)
    const nameStart = o + 30
    const name = buf.slice(nameStart, nameStart + nameLen).toString('utf8')
    const dataStart = nameStart + nameLen + extraLen
    const comp = buf.slice(dataStart, dataStart + compSize)
    let data
    if (method === METHOD_STORE) {
      data = comp
    } else if (method === METHOD_DEFLATE) {
      data = zlib.inflateRawSync(comp)
    } else {
      throw new Error('Unsupported zip method ' + method + ' for ' + name)
    }
    entries.push({ name, method, data })
    o = dataStart + compSize
  }
  return entries
}

function firstLocalNameAndMethod (buf) {
  if (buf.length < 30 || buf.readUInt32LE(0) !== SIG_LOCAL) {
    return null
  }
  const method = buf.readUInt16LE(8)
  const nameLen = buf.readUInt16LE(26)
  const name = buf.slice(30, 30 + nameLen).toString('utf8')
  return { name, method }
}

/**
 * Validate a built .epub on disk.
 * @param {string} epubPath
 * @returns {{ ok: boolean, errors: string[], warnings: string[], entryCount: number }}
 */
function validateEpubFile (epubPath) {
  const errors = []
  const warnings = []
  const buf = fs.readFileSync(epubPath)

  const first = firstLocalNameAndMethod(buf)
  if (!first) {
    errors.push('not a zip (missing local file header)')
  } else {
    if (first.name !== 'mimetype') {
      errors.push('first zip entry must be mimetype, got: ' + first.name)
    }
    if (first.method !== METHOD_STORE) {
      errors.push('mimetype must be stored (method=0), got method=' + first.method)
    }
  }

  let entries
  try {
    entries = readZipEntries(buf)
  } catch (err) {
    errors.push('zip read failed: ' + (err.message || err))
    return { ok: false, errors, warnings, entryCount: 0 }
  }

  const names = new Set(entries.map((e) => e.name))
  const need = [
    'mimetype',
    'META-INF/container.xml',
    'OEBPS/content.opf',
    'OEBPS/nav.xhtml',
    'OEBPS/styles/main.css'
  ]
  for (const n of need) {
    if (!names.has(n)) errors.push('missing entry: ' + n)
  }

  const mime = entries.find((e) => e.name === 'mimetype')
  if (mime) {
    const text = mime.data.toString('utf8').trim()
    if (text !== 'application/epub+zip') {
      errors.push('mimetype payload incorrect: ' + JSON.stringify(text))
    }
  }

  const container = entries.find((e) => e.name === 'META-INF/container.xml')
  if (container) {
    const c = container.data.toString('utf8')
    if (!c.includes('OEBPS/content.opf')) {
      errors.push('container.xml does not point to OEBPS/content.opf')
    }
  }

  const opfEntry = entries.find((e) => e.name === 'OEBPS/content.opf')
  const navEntry = entries.find((e) => e.name === 'OEBPS/nav.xhtml')
  if (opfEntry) {
    const opf = opfEntry.data.toString('utf8')
    if (!opf.includes('properties="nav"') && !opf.includes("properties='nav'")) {
      errors.push('content.opf missing nav item properties="nav"')
    }
    const hrefs = [...opf.matchAll(/href="([^"]+)"/g)].map((m) => m[1])
    for (const href of hrefs) {
      const full = href.startsWith('OEBPS/') ? href : ('OEBPS/' + href)
      // opf is inside OEBPS/, hrefs are relative to OEBPS/
      const rel = 'OEBPS/' + href.replace(/^\.\//, '')
      if (!names.has(rel) && !names.has(full)) {
        // skip remote
        if (!/^https?:/i.test(href)) {
          errors.push('OPF href missing in zip: ' + href)
        }
      }
    }
    const idrefs = [...opf.matchAll(/idref="([^"]+)"/g)].map((m) => m[1])
    const ids = [...opf.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1])
    const idSet = new Set(ids)
    for (const id of idrefs) {
      if (!idSet.has(id)) errors.push('spine idref not in manifest: ' + id)
    }
  }

  if (navEntry) {
    const nav = navEntry.data.toString('utf8')
    const links = [...nav.matchAll(/href="([^"]+)"/g)].map((m) => m[1])
    for (const href of links) {
      const rel = 'OEBPS/' + href.replace(/^\.\//, '')
      if (!names.has(rel)) {
        errors.push('nav href missing in zip: ' + href)
      }
    }
    if (!nav.includes('epub:type="toc"') && !nav.includes("epub:type='toc'")) {
      warnings.push('nav.xhtml may be missing epub:type="toc"')
    }
  }

  const xhtmlCount = [...names].filter((n) => n.startsWith('OEBPS/text/') && n.endsWith('.xhtml')).length
  if (xhtmlCount < 1) errors.push('no chapter xhtml under OEBPS/text/')

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    entryCount: entries.length,
    xhtmlCount
  }
}

/**
 * In-memory checks before zip (manifest list vs chapter ids).
 */
function validateChapterManifest (chapters) {
  const errors = []
  const ids = new Set()
  for (const ch of chapters || []) {
    if (!ch.id) errors.push('chapter missing id')
    else if (ids.has(ch.id)) errors.push('duplicate chapter id: ' + ch.id)
    else ids.add(ch.id)
    if (!ch.title && ch.title !== '') errors.push('chapter missing title: ' + ch.id)
  }
  if (!chapters || !chapters.length) errors.push('no chapters')
  return { ok: errors.length === 0, errors }
}

module.exports = {
  validateEpubFile,
  validateChapterManifest,
  readZipEntries,
  firstLocalNameAndMethod
}
