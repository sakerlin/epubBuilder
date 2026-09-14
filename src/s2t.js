#!/usr/bin/env node
'use strict'

const OpenCC = require('opencc-js')
const fs = require('fs')
const {
  parseFileProgram,
  outputBeside,
  exitIfMissing
} = require('./lib/cli-utils')

const { inputFile: file } = parseFileProgram('s2t')
exitIfMissing(file)

const ouputFileName = outputBeside(file, '_S2T.txt')

fs.readFile(file, function (err, data) {
  if (err) {
    console.error(err)
    process.exitCode = 1
    return
  }

  const converter = OpenCC.Converter({ from: 'cn', to: 'tw' })
  const converted = converter(data.toString('utf8'))

  fs.writeFile(ouputFileName, converted, function (writeErr) {
    if (writeErr) {
      console.error(writeErr)
      process.exitCode = 1
      return
    }
    console.log('wrote', ouputFileName)
  })
})
