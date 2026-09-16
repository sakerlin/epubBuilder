'use strict'

const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const { ZipFile } = require('yazl')

function xmlEscape (s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function langAttrs (language) {
  const lang = language || 'zh-TW'
  return 'xml:lang="' + xmlEscape(lang) + '" lang="' + xmlEscape(lang) + '"'
}

function xhtmlChapter (chapter, cssHref, language) {
  const paras = (chapter.paragraphs || [])
    .map((p) => '    <p>' + xmlEscape(p) + '</p>')
    .join('\n')
  const heading = chapter.level === 1
    ? '    <h2 id="' + xmlEscape(chapter.id) + '">' + xmlEscape(chapter.title) + '</h2>'
    : '    <h3 id="' + xmlEscape(chapter.id) + '">' + xmlEscape(chapter.title) + '</h3>'

  return '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<!DOCTYPE html>\n' +
    '<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" ' + langAttrs(language) + '>\n' +
    '<head>\n' +
    '  <meta charset="UTF-8"/>\n' +
    '  <title>' + xmlEscape(chapter.title) + '</title>\n' +
    '  <link rel="stylesheet" type="text/css" href="' + cssHref + '"/>\n' +
    '</head>\n' +
    '<body>\n' +
    '  <section epub:type="' + (chapter.level === 1 ? 'part' : 'chapter') + '">\n' +
    heading + '\n' +
    (paras ? paras + '\n' : '') +
    '  </section>\n' +
    '</body>\n' +
    '</html>\n'
}

function navDocument (chapters, title, language, cssHref) {
  const items = chapters.map((ch) => {
    const href = 'text/' + ch.id + '.xhtml'
    return '      <li><a href="' + href + '">' + xmlEscape(ch.title) + '</a></li>'
  }).join('\n')

  const css = cssHref
    ? '  <link rel="stylesheet" type="text/css" href="' + cssHref + '"/>\n'
    : ''

  return '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<!DOCTYPE html>\n' +
    '<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" ' + langAttrs(language) + '>\n' +
    '<head>\n' +
    '  <meta charset="UTF-8"/>\n' +
    '  <title>' + xmlEscape(title) + ' - 目錄</title>\n' +
    css +
    '</head>\n' +
    '<body>\n' +
    '  <nav epub:type="toc" id="toc">\n' +
    '    <h1>目錄</h1>\n' +
    '    <ol>\n' +
    items + '\n' +
    '    </ol>\n' +
    '  </nav>\n' +
    '</body>\n' +
    '</html>\n'
}

/** Linear TOC page in spine (readable page, not only machine nav). */
function frontTocDocument (chapters, title, language) {
  const items = chapters.map((ch) =>
    '    <li><a href="' + ch.id + '.xhtml">' + xmlEscape(ch.title) + '</a></li>'
  ).join('\n')

  return '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<!DOCTYPE html>\n' +
    '<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" ' + langAttrs(language) + '>\n' +
    '<head>\n' +
    '  <meta charset="UTF-8"/>\n' +
    '  <title>' + xmlEscape(title) + ' - 目錄</title>\n' +
    '  <link rel="stylesheet" type="text/css" href="../styles/main.css"/>\n' +
    '</head>\n' +
    '<body>\n' +
    '  <section epub:type="toc">\n' +
    '    <h1>目錄</h1>\n' +
    '    <ol class="toc">\n' +
    items + '\n' +
    '    </ol>\n' +
    '  </section>\n' +
    '</body>\n' +
    '</html>\n'
}

function containerXml () {
  return '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">\n' +
    '  <rootfiles>\n' +
    '    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>\n' +
    '  </rootfiles>\n' +
    '</container>\n'
}

function defaultCss () {
  return 'html, body {\n' +
    '  height: 100%;\n' +
    '}\n' +
    'body {\n' +
    '  font-family: "Noto Serif CJK TC", "Source Han Serif TC", "PingFang TC", serif;\n' +
    '  line-height: 1.7;\n' +
    '  margin: 1em;\n' +
    '}\n' +
    'h1, h2, h3 { text-align: center; margin: 1.2em 0 0.8em; font-weight: 600; }\n' +
    'p { text-indent: 2em; margin: 0.4em 0; }\n' +
    'ol.toc { padding-left: 1.4em; }\n' +
    'ol.toc li { margin: 0.35em 0; text-indent: 0; }\n' +
    '/* cover: centered, full-bleed friendly */\n' +
    'body.cover-page {\n' +
    '  margin: 0;\n' +
    '  padding: 0;\n' +
    '  display: flex;\n' +
    '  align-items: center;\n' +
    '  justify-content: center;\n' +
    '  min-height: 100vh;\n' +
    '  background: #000;\n' +
    '}\n' +
    'body.cover-page section { margin: 0; width: 100%; }\n' +
    'img.cover {\n' +
    '  display: block;\n' +
    '  max-width: 100%;\n' +
    '  max-height: 100vh;\n' +
    '  width: auto;\n' +
    '  height: auto;\n' +
    '  margin: 0 auto;\n' +
    '  object-fit: contain;\n' +
    '}\n'
}

function coverPage (imageName, language) {
  return '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<!DOCTYPE html>\n' +
    '<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" ' + langAttrs(language) + '>\n' +
    '<head>\n' +
    '  <meta charset="UTF-8"/>\n' +
    '  <title>Cover</title>\n' +
    '  <link rel="stylesheet" type="text/css" href="../styles/main.css"/>\n' +
    '</head>\n' +
    '<body class="cover-page">\n' +
    '  <section epub:type="cover">\n' +
    '    <img class="cover" src="../images/' + xmlEscape(imageName) + '" alt="cover"/>\n' +
    '  </section>\n' +
    '</body>\n' +
    '</html>\n'
}

function mediaTypeForExt (ext) {
  switch (String(ext).toLowerCase()) {
    case '.png': return 'image/png'
    case '.gif': return 'image/gif'
    case '.webp': return 'image/webp'
    case '.svg': return 'image/svg+xml'
    case '.jpeg':
    case '.jpg':
    default: return 'image/jpeg'
  }
}

function contentOpf (opts) {
  const {
    title,
    author,
    language,
    uuid,
    chapters,
    coverImageName,
    coverMediaType,
    modified,
    frontToc,
    spineToc
  } = opts

  const manifestCover = coverImageName
    ? '    <item id="cover-image" href="images/' + coverImageName + '" media-type="' + coverMediaType + '" properties="cover-image"/>\n' +
      '    <item id="cover" href="text/cover.xhtml" media-type="application/xhtml+xml"/>\n'
    : ''

  const manifestFrontToc = frontToc
    ? '    <item id="front-toc" href="text/toc.xhtml" media-type="application/xhtml+xml"/>\n'
    : ''

  const manifestChaps = chapters.map((ch) =>
    '    <item id="' + ch.id + '" href="text/' + ch.id + '.xhtml" media-type="application/xhtml+xml"/>'
  ).join('\n')

  const spineCover = coverImageName ? '    <itemref idref="cover"/>\n' : ''
  const spineFront = frontToc ? '    <itemref idref="front-toc"/>\n' : ''
  const spineNav = spineToc ? '    <itemref idref="nav" linear="no"/>\n' : ''
  const spineChaps = chapters.map((ch) => '    <itemref idref="' + ch.id + '"/>').join('\n')

  const metaCover = coverImageName ? '    <meta name="cover" content="cover-image"/>\n' : ''

  return '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="BookId" xml:lang="' + xmlEscape(language) + '">\n' +
    '  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">\n' +
    '    <dc:identifier id="BookId">urn:uuid:' + uuid + '</dc:identifier>\n' +
    '    <dc:title>' + xmlEscape(title) + '</dc:title>\n' +
    '    <dc:creator>' + xmlEscape(author) + '</dc:creator>\n' +
    '    <dc:language>' + xmlEscape(language) + '</dc:language>\n' +
    '    <meta property="dcterms:modified">' + modified + '</meta>\n' +
    metaCover +
    '  </metadata>\n' +
    '  <manifest>\n' +
    '    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>\n' +
    '    <item id="css" href="styles/main.css" media-type="text/css"/>\n' +
    manifestCover +
    manifestFrontToc +
    manifestChaps + '\n' +
    '  </manifest>\n' +
    '  <spine>\n' +
    spineCover +
    spineFront +
    spineNav +
    spineChaps + '\n' +
    '  </spine>\n' +
    '</package>\n'
}

/**
 * Build an EPUB 3 file on disk.
 */
function buildEpub (options) {
  const title = options.title || 'Untitled'
  const author = options.author || 'Unknown'
  const language = options.language || 'zh-TW'
  const chapters = options.chapters || []
  const outPath = options.outPath
  const onProgress = options.onProgress
  const freeChapterBodies = options.freeChapterBodies !== false
  const frontToc = !!options.frontToc
  const spineToc = !!options.spineToc
  const cssText = options.cssText != null ? String(options.cssText) : defaultCss()

  if (!outPath) throw new Error('outPath required')
  if (!chapters.length) throw new Error('no chapters to pack')

  const uuid = crypto.randomUUID()
  const modified = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')

  let coverImageName = null
  let coverMediaType = null
  let coverBuf = null
  if (options.coverPath) {
    const abs = path.resolve(options.coverPath)
    if (!fs.existsSync(abs)) throw new Error('Cover not found: ' + abs)
    const ext = path.extname(abs) || '.jpg'
    coverImageName = 'cover' + ext.toLowerCase()
    coverMediaType = mediaTypeForExt(ext)
    coverBuf = fs.readFileSync(abs)
  }

  const spineMeta = chapters.map((ch) => ({
    id: ch.id,
    title: ch.title,
    level: ch.level
  }))

  const shellEntries = [
    { name: 'META-INF/container.xml', data: containerXml() },
    {
      name: 'OEBPS/content.opf',
      data: contentOpf({
        title,
        author,
        language,
        uuid,
        chapters: spineMeta,
        coverImageName,
        coverMediaType,
        modified,
        frontToc,
        spineToc
      })
    },
    { name: 'OEBPS/nav.xhtml', data: navDocument(spineMeta, title, language, 'styles/main.css') },
    { name: 'OEBPS/styles/main.css', data: cssText }
  ]

  if (coverImageName && coverBuf) {
    shellEntries.push({ name: 'OEBPS/images/' + coverImageName, data: coverBuf })
    shellEntries.push({ name: 'OEBPS/text/cover.xhtml', data: coverPage(coverImageName, language) })
  }

  if (frontToc) {
    shellEntries.push({
      name: 'OEBPS/text/toc.xhtml',
      data: frontTocDocument(spineMeta, title, language)
    })
  }

  const absOut = path.resolve(outPath)
  fs.mkdirSync(path.dirname(absOut), { recursive: true })

  const totalSteps = shellEntries.length + chapters.length
  let step = 0

  return new Promise((resolve, reject) => {
    const zipfile = new ZipFile()
    const out = fs.createWriteStream(absOut)

    out.on('error', reject)
    zipfile.outputStream.on('error', reject)
    out.on('close', () => {
      let bytes = 0
      try { bytes = fs.statSync(absOut).size } catch (_) {}
      resolve({
        outPath: absOut,
        uuid,
        chapterCount: chapters.length,
        bytes
      })
    })

    zipfile.outputStream.pipe(out)

    zipfile.addBuffer(Buffer.from('application/epub+zip'), 'mimetype', { compress: false })

    for (const e of shellEntries) {
      const buf = Buffer.isBuffer(e.data) ? e.data : Buffer.from(e.data, 'utf8')
      zipfile.addBuffer(buf, e.name)
      step++
      if (onProgress) onProgress(step, totalSteps, 'pack-meta')
    }

    for (let i = 0; i < chapters.length; i++) {
      const ch = chapters[i]
      const xhtml = xhtmlChapter(ch, '../styles/main.css', language)
      zipfile.addBuffer(Buffer.from(xhtml, 'utf8'), 'OEBPS/text/' + ch.id + '.xhtml')
      if (freeChapterBodies) ch.paragraphs = null
      step++
      if (onProgress) onProgress(step, totalSteps, 'pack-chapters')
    }

    zipfile.end()
  })
}

module.exports = {
  buildEpub,
  xmlEscape,
  xhtmlChapter,
  defaultCss,
  navDocument,
  frontTocDocument
}
