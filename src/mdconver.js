#!/usr/bin/env node
'use strict'

const fs = require('fs')
const {
  parseFileProgram,
  outputBeside,
  exitIfMissing,
  readUtf8
} = require('./lib/cli-utils')
const { preformatText, splitIntoChapters } = require('./lib/text-pipeline')

const { inputFile: file, rules } = parseFileProgram('mdconver')
exitIfMissing(file)

const ouputFileName = outputBeside(file, '_MD.txt')

try {
  const text = readUtf8(file)
  const chapters = splitIntoChapters(preformatText(text, rules), rules)
  const lines = []
  for (const ch of chapters) {
    if (ch.title === '正文' && (!ch.paragraphs || ch.paragraphs.length === 0)) continue
    const mark = ch.level === 1 ? '#' : '##'
    lines.push(mark + ch.title)
    for (const p of ch.paragraphs || []) lines.push(p)
  }
  fs.writeFileSync(ouputFileName, lines.join('\n'), 'utf8')
  console.log('wrote', ouputFileName)
  console.log('chapters', chapters.length, '| rules', rules.source)
} catch (err) {
  console.error(err && err.message ? err.message : err)
  process.exitCode = 1
}
