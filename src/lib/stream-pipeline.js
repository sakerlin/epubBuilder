'use strict'

const fs = require('fs')
const readline = require('readline')
const { classifyLine } = require('./chapter-rules')
const { displayTitle } = require('./title-clean')
const {
  tidyTitle,
  preformatText,
  splitIntoChapters,
  convertS2TChunked
} = require('./text-pipeline')

/**
 * Line-stream chapter build: never holds the full novel string.
 * Supports optional per-line s2t + title tidy (same classify rules).
 *
 * @param {string} filePath
 * @param {object} rules
 * @param {{
 *   s2t?: boolean,
 *   convertFn?: (s: string) => string,
 *   preformat?: boolean,
 *   onProgress?: (linesRead: number) => void,
 *   progressEvery?: number
 * }} [opts]
 */
async function splitFileStreaming (filePath, rules, opts = {}) {
  const preformat = opts.preformat !== false
  const convertFn = opts.convertFn || null
  const onProgress = opts.onProgress
  const progressEvery = opts.progressEvery || 2000

  const stream = fs.createReadStream(filePath, { encoding: 'utf8' })
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity })

  const chapters = []
  let current = null
  let idx = 0
  let linesRead = 0
  let isFirst = true

  const start = (level, rawTitle) => {
    idx++
    const cleaned = tidyTitle(rawTitle)
    const style = (rules && rules.titleStyle) || 'short'
    current = {
      id: 'chap_' + String(idx).padStart(4, '0'),
      level,
      title: displayTitle(cleaned, level, style),
      rawTitle: cleaned,
      paragraphs: []
    }
    chapters.push(current)
  }

  for await (let line of rl) {
    linesRead++
    if (isFirst) {
      if (line.charCodeAt(0) === 0xFEFF) line = line.slice(1)
      isFirst = false
    }
    if (convertFn) line = convertFn(line)

    let val = line.trim()
    if (!val) {
      if (onProgress && linesRead % progressEvery === 0) onProgress(linesRead)
      continue
    }

    const kind = classifyLine(val, rules)
    if (preformat && (kind === 'volume' || kind === 'chapter')) {
      val = tidyTitle(val)
    }

    if (kind === 'volume') {
      start(1, val)
    } else if (kind === 'chapter') {
      start(2, val)
    } else {
      if (!current) start(2, '正文')
      current.paragraphs.push(val)
    }

    if (onProgress && linesRead % progressEvery === 0) onProgress(linesRead)
  }

  if (onProgress) onProgress(linesRead)

  if (!chapters.length) {
    start(2, '正文')
  }

  return { chapters, linesRead }
}

/**
 * Choose stream vs full-read pipeline.
 * @param {string} filePath
 * @param {object} rules
 * @param {object} opts
 */
async function buildChaptersFromFile (filePath, rules, opts = {}) {
  const st = fs.statSync(filePath)
  const forceStream = opts.stream === true
  const forceFull = opts.stream === false
  const autoStream = st.size >= (opts.streamThreshold || 2 * 1024 * 1024)
  const useStream = forceStream || (!forceFull && autoStream)

  if (useStream) {
    return Object.assign(
      { mode: 'stream', bytes: st.size },
      await splitFileStreaming(filePath, rules, opts)
    )
  }

  let text = fs.readFileSync(filePath, 'utf8')
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1)

  if (opts.convertFn) {
    text = convertS2TChunked(text, opts.convertFn, {
      onProgress: opts.onProgress
        ? (cur, total) => opts.onProgress(cur, total, 's2t')
        : undefined
    })
  }

  if (opts.preformat !== false) {
    text = preformatText(text, rules, {
      onProgress: opts.onProgress
        ? (cur, total) => opts.onProgress(cur, total, 'preformat')
        : undefined
    })
  }

  const chapters = splitIntoChapters(text, rules, {
    onProgress: opts.onProgress
      ? (cur, total) => opts.onProgress(cur, total, 'split')
      : undefined
  })

  return {
    mode: 'full',
    bytes: st.size,
    chapters,
    linesRead: text.split('\n').length,
    textForDump: null
  }
}

module.exports = {
  splitFileStreaming,
  buildChaptersFromFile
}
