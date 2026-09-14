'use strict'

const { classifyLine } = require('./chapter-rules')

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
      val = val.replace(/\s+/g, '')
      val = val
        .replace('集', '集 ')
        .replace('卷', '卷 ')
        .replace('冊', '冊 ')
        .replace('篇', '篇 ')
        .replace('章', '章 ')
        .replace('節', '節 ')
        .trim()
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
      start(2, '正文')
    }
    current.paragraphs.push(val)
  }

  if (!chapters.length) {
    start(2, '正文')
  }

  return chapters
}

module.exports = {
  preformatText,
  splitIntoChapters
}
