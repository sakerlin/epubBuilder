#!/usr/bin/env node
'use strict'

const fs = require('fs')
const path = require('path')
const { rmFiles } = require('./lib/fs-utils')
const {
  parseFileProgram,
  inputStem,
  ensureDir,
  exitIfMissing,
  readUtf8
} = require('./lib/cli-utils')
const { preformatText, splitIntoChapters } = require('./lib/text-pipeline')
const { xhtmlChapter } = require('./lib/epub-pack')

const SPLITE_DIR = path.join(process.cwd(), 'spliteFile')

const { inputFile: file, rules } = parseFileProgram('splite')
exitIfMissing(file)

ensureDir(SPLITE_DIR)
rmFiles(SPLITE_DIR, (name) => name.endsWith('.xhtml'))

const prefix = inputStem(file)
console.log('input:', file, 'prefix:', prefix)
console.log('rules', rules.source)

try {
  const text = readUtf8(file)
  const chapters = splitIntoChapters(preformatText(text, rules), rules)
  console.log('Total Chapters count :', chapters.length)

  let cnt = 0
  for (const ch of chapters) {
    // skip empty leading placeholder
    if (ch.title === '正文' && (!ch.paragraphs || ch.paragraphs.length === 0)) continue
    cnt++
    const outName = path.join(SPLITE_DIR, prefix + '_' + cnt + '.xhtml')
    // relative css path matches historical Sigil layout expectation
    const xhtml = xhtmlChapter(ch, 'css/main.css')
    fs.writeFileSync(outName, xhtml, 'utf8')
  }
  console.log('wrote', cnt, 'xhtml →', SPLITE_DIR)
} catch (err) {
  console.error(err && err.message ? err.message : err)
  process.exitCode = 1
}
