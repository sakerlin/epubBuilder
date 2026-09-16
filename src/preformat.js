#!/usr/bin/env node
'use strict'

const fs = require('fs')
const { rmFile } = require('./lib/fs-utils')
const {
  parseFileProgram,
  outputBeside,
  exitIfMissing,
  readUtf8
} = require('./lib/cli-utils')
const { preformatText } = require('./lib/text-pipeline')

const { inputFile: file, rules } = parseFileProgram('preformat')
exitIfMissing(file)

const ouputFileName = outputBeside(file, '_formated.txt')
rmFile(ouputFileName)

try {
  const text = readUtf8(file)
  const out = preformatText(text, rules)
  fs.writeFileSync(ouputFileName, out, 'utf8')
  console.log('wrote', ouputFileName)
  console.log('rules', rules.source)
} catch (err) {
  console.error(err && err.message ? err.message : err)
  process.exitCode = 1
}
