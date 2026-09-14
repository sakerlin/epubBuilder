'use strict'

const fs = require('fs')
const path = require('path')

const DEFAULT_PATH = path.join(__dirname, 'default-chapter-rules.json')

function loadRules (rulesPath) {
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
  return compileRules({ volume, chapter }, file)
}

function compileRules (rules, source) {
  const toRegex = (p, kind, i) => {
    try {
      return new RegExp(p)
    } catch (err) {
      throw new Error('Invalid ' + kind + ' regex [' + i + '] in ' + (source || 'rules') + ': ' + p + ' (' + err.message + ')')
    }
  }
  return {
    source: source || 'inline',
    volume: (rules.volume || []).map((p, i) => toRegex(p, 'volume', i)),
    chapter: (rules.chapter || []).map((p, i) => toRegex(p, 'chapter', i))
  }
}

/**
 * @returns {'volume'|'chapter'|'body'}
 */
function classifyLine (line, compiled) {
  const val = line.trim()
  if (!val) return 'body'
  for (const re of compiled.chapter) {
    if (re.test(val)) return 'chapter'
  }
  for (const re of compiled.volume) {
    if (re.test(val)) return 'volume'
  }
  return 'body'
}

module.exports = {
  DEFAULT_PATH,
  loadRules,
  compileRules,
  classifyLine
}
