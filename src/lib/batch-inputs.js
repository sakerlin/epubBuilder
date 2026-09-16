'use strict'

const fs = require('fs')
const path = require('path')

const TEXT_EXTS = new Set(['.txt', '.text', '.md'])

/**
 * Expand CLI inputs (files and/or directories) into sorted text paths.
 * Explicit file arguments are always included; directories collect .txt/.md.
 */
function collectInputFiles (inputs, opts = {}) {
  const exts = opts.exts || TEXT_EXTS
  const recursive = opts.recursive !== false
  const out = []
  const seen = new Set()

  function push (abs) {
    if (seen.has(abs)) return
    seen.add(abs)
    out.push(abs)
  }

  function walkDir (dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true })
    for (const ent of entries) {
      if (ent.name.startsWith('.')) continue
      const full = path.join(dir, ent.name)
      if (ent.isDirectory()) {
        if (recursive) walkDir(full)
      } else if (ent.isFile()) {
        const ext = path.extname(ent.name).toLowerCase()
        if (exts.has(ext)) push(full)
      }
    }
  }

  const list = (inputs && inputs.length) ? inputs : []
  if (!list.length) throw new Error('No input files or directories given')

  for (const item of list) {
    const abs = path.resolve(item)
    if (!fs.existsSync(abs)) throw new Error('File not exist: ' + abs)
    const st = fs.statSync(abs)
    if (st.isFile()) push(abs)
    else if (st.isDirectory()) walkDir(abs)
    else throw new Error('Not a file or directory: ' + abs)
  }

  out.sort((a, b) => a.localeCompare(b, 'en'))
  if (!out.length) {
    throw new Error('No input files found in: ' + list.join(', '))
  }
  return out
}

function defaultOutPath (inputFile, outDir) {
  const stem = path.parse(inputFile).name
  if (outDir) return path.join(path.resolve(outDir), stem + '.epub')
  return path.join(path.dirname(inputFile), stem + '.epub')
}

module.exports = {
  collectInputFiles,
  defaultOutPath,
  TEXT_EXTS
}
