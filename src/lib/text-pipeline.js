'use strict'

const { classifyLine } = require('./chapter-rules')
const { displayTitle } = require('./title-clean')

/**
 * Light title spacing tidy — keep readable spaces after 篇/卷 markers.
 */
function tidyTitle (val) {
  let s = val.replace(/\s+/g, ' ').trim()
  s = s.replace(/(第[零一二三四五六七八九十百千两兩\d]{1,8}[篇章卷集冊])(?=\S)/g, '$1 ')
  s = s.replace(/\s+/g, ' ').trim()
  return s
}

/**
 * Normalize blank lines and optionally tidy volume/chapter title spacing.
 * @param {string} text
 * @param {ReturnType<import('./chapter-rules').loadRules>} rules
 * @param {{ tidyTitles?: boolean, onProgress?: (cur: number, total: number) => void }} [opts]
 */
function preformatText (text, rules, opts = {}) {
  const tidyTitles = opts.tidyTitles !== false
  const onProgress = opts.onProgress
  const lines = text.split('\n')
  const total = lines.length
  const out = []
  for (let i = 0; i < lines.length; i++) {
    let val = lines[i].trim()
    if (!val) {
      if (onProgress && (i % 2000 === 0 || i + 1 === total)) onProgress(i + 1, total)
      continue
    }
    const kind = classifyLine(val, rules)
    if (tidyTitles && (kind === 'volume' || kind === 'chapter')) {
      val = tidyTitle(val)
    }
    out.push(val)
    if (onProgress && (i % 2000 === 0 || i + 1 === total)) onProgress(i + 1, total)
  }
  return out.join('\n')
}

/**
 * Split text into structural chapters for EPUB.
 * @returns {Array<{ id: string, level: 1|2, title: string, rawTitle: string, paragraphs: string[] }>}
 */
function splitIntoChapters (text, rules, opts = {}) {
  const onProgress = opts.onProgress
  const lines = text.split('\n')
  const total = lines.length
  const chapters = []
  let current = null
  let idx = 0

  const start = (level, rawTitle) => {
    idx++
    const cleaned = tidyTitle(rawTitle)
    current = {
      id: 'chap_' + String(idx).padStart(4, '0'),
      level,
      title: displayTitle(cleaned, level),
      rawTitle: cleaned,
      paragraphs: []
    }
    chapters.push(current)
  }

  for (let i = 0; i < lines.length; i++) {
    const val = lines[i].trim()
    if (!val) {
      if (onProgress && (i % 2000 === 0 || i + 1 === total)) onProgress(i + 1, total)
      continue
    }
    const kind = classifyLine(val, rules)
    if (kind === 'volume') {
      start(1, val)
    } else if (kind === 'chapter') {
      start(2, val)
    } else {
      if (!current) start(2, '正文')
      current.paragraphs.push(val)
    }
    if (onProgress && (i % 2000 === 0 || i + 1 === total)) onProgress(i + 1, total)
  }

  if (!chapters.length) {
    start(2, '正文')
  }

  return chapters
}

/**
 * Convert text Simplified→Traditional in chunks with progress (avoids one giant silent freeze).
 * @param {string} text
 * @param {(s: string) => string} convertFn
 * @param {{ onProgress?: (cur: number, total: number) => void, chunkLines?: number }} [opts]
 */
function convertS2TChunked (text, convertFn, opts = {}) {
  const chunkLines = opts.chunkLines || 800
  const onProgress = opts.onProgress
  const lines = text.split('\n')
  const total = lines.length
  const out = []
  for (let i = 0; i < lines.length; i += chunkLines) {
    const slice = lines.slice(i, i + chunkLines).join('\n')
    out.push(convertFn(slice))
    if (onProgress) onProgress(Math.min(i + chunkLines, total), total)
  }
  return out.join('\n')
}

module.exports = {
  preformatText,
  splitIntoChapters,
  tidyTitle,
  displayTitle,
  convertS2TChunked
}
