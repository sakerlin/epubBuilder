'use strict'

const fs = require('fs')
const path = require('path')
const { isChapterLikeHeading } = require('./title-clean')

const DEFAULT_PATH = path.join(__dirname, 'default-chapter-rules.json')

function loadRules (rulesPath, overrides = {}) {
  const file = rulesPath
    ? path.resolve(process.cwd(), rulesPath)
    : DEFAULT_PATH
  const raw = JSON.parse(fs.readFileSync(file, 'utf8'))
  if (!raw || typeof raw !== 'object') {
    throw new Error('Invalid chapter rules JSON: ' + file)
  }
  const volume = Array.isArray(raw.volume) ? raw.volume : []
  const chapter = Array.isArray(raw.chapter) ? raw.chapter : []
  if (!volume.length && !chapter.length) {
    throw new Error('Chapter rules need volume[] and/or chapter[] patterns')
  }
  const merged = Object.assign({}, raw, overrides)
  return compileRules(merged, file)
}

function compileRules (rules, source) {
  const toRegex = (p, kind, i) => {
    try {
      return new RegExp(p)
    } catch (err) {
      throw new Error('Invalid ' + kind + ' regex [' + i + '] in ' + (source || 'rules') + ': ' + p + ' (' + err.message + ')')
    }
  }
  const jianjieMode = ['volume', 'chapter', 'body'].includes(rules.jianjieMode)
    ? rules.jianjieMode
    : 'volume'
  const titleStyle = ['short', 'full', 'arc'].includes(rules.titleStyle)
    ? rules.titleStyle
    : 'short'

  return {
    source: source || 'inline',
    maxHeadingLength: Number(rules.maxHeadingLength) > 0 ? Number(rules.maxHeadingLength) : 48,
    rejectProsePunctuation: rules.rejectProsePunctuation !== false,
    jianjieMode,
    titleStyle,
    volume: (rules.volume || []).map((p, i) => toRegex(p, 'volume', i)),
    chapter: (rules.chapter || []).map((p, i) => toRegex(p, 'chapter', i))
  }
}

function looksLikeProse (val) {
  return /[。！？；「」『』]/.test(val)
}

function isJianjieLine (val) {
  return /簡介|简介/.test(val)
}

/**
 * @returns {'volume'|'chapter'|'body'}
 */
function classifyLine (line, compiled) {
  const val = line.trim()
  if (!val) return 'body'

  const maxLen = compiled.maxHeadingLength || 48
  if (val.length > maxLen) return 'body'
  if (compiled.rejectProsePunctuation !== false && looksLikeProse(val)) return 'body'

  if (isJianjieLine(val)) {
    const mode = compiled.jianjieMode || 'volume'
    if (mode === 'body') return 'body'
    if (mode === 'chapter') return 'chapter'
    // volume: continue (prefer volume match below if any)
  }

  if (isChapterLikeHeading(val)) return 'chapter'

  for (const re of compiled.chapter) {
    if (re.test(val)) return 'chapter'
  }
  for (const re of compiled.volume) {
    if (re.test(val)) return 'volume'
  }

  // bare 簡介 with volume mode and no volume regex hit
  if (isJianjieLine(val) && (compiled.jianjieMode || 'volume') === 'volume') {
    return 'volume'
  }

  return 'body'
}

module.exports = {
  DEFAULT_PATH,
  loadRules,
  compileRules,
  classifyLine
}
