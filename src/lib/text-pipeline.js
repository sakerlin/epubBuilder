'use strict'

const { classifyLine } = require('./chapter-rules')

/**
 * Light title spacing tidy — keep a single space after 引子 / 第N篇 markers.
 * Avoid nuking all whitespace (that broke "引子 開篇" → "引子開篇").
 */
function tidyTitle (val) {
  let s = val.replace(/\s+/g, ' ').trim()
  // "第N章" glued forms are fine; ensure readable spaces after 篇/卷 markers when followed by more text
  s = s.replace(/(第[零一二三四五六七八九十百千两兩\d]{1,8}[篇章卷集冊])(?=\S)/g, '$1 ')
  s = s.replace(/\s+/g, ' ').trim()
  return s
}

/**
 * Normalize blank lines and optionally tidy volume/chapter title spacing.
 * @param {string} text
 * @param {ReturnType<import('./chapter-rules').loadRules>} rules
 * @param {{ tidyTitles?: boolean }} [opts]
 */
function preformatText (text, rules, opts = {}) {
  const tidyTitles = opts.tidyTitles !== false
  const out = []
  for (const line of text.split('\n')) {
    let val = line.trim()
    if (!val) continue
    const kind = classifyLine(val, rules)
    if (tidyTitles && (kind === 'volume' || kind === 'chapter')) {
      val = tidyTitle(val)
    }
    out.push(val)
  }
  return out.join('\n')
}

/**
 * Split text into structural chapters for EPUB.
 * @returns {Array<{ id: string, level: 1|2, title: string, paragraphs: string[] }>}
 */
function splitIntoChapters (text, rules) {
  const lines = text.split('\n')
  const chapters = []
  let current = null
  let idx = 0

  const start = (level, title) => {
    idx++
    current = {
      id: 'chap_' + String(idx).padStart(4, '0'),
      level,
      title,
      paragraphs: []
    }
    chapters.push(current)
  }

  for (const raw of lines) {
    const val = raw.trim()
    if (!val) continue
    const kind = classifyLine(val, rules)
    if (kind === 'volume') {
      start(1, val)
      continue
    }
    if (kind === 'chapter') {
      start(2, val)
      continue
    }
    if (!current) {
      // Book title lines before first heading → attach later or keep as front matter chapter
      start(2, '正文')
    }
    current.paragraphs.push(val)
  }

  if (!chapters.length) {
    start(2, '正文')
  }

  // Drop empty leading "正文" placeholder if a real heading follows with all content moved...
  // Actually leading 正文 only holds pre-heading lines (e.g. 《人途》); keep it.

  return chapters
}

module.exports = {
  preformatText,
  splitIntoChapters,
  tidyTitle
}
