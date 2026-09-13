#!/usr/bin/env node
const OpenCC = require('opencc-js')
const program = require('commander')
const fs = require('fs')
const {
  requireInputFile,
  outputBeside,
  exitIfMissing
} = require('./lib/cli-utils')

program.version('0.0.1').usage('<fileName>').parse(process.argv)

if (!program.args.length) {
  program.help()
}

const file = requireInputFile(program)
exitIfMissing(file)

const ouputFileName = outputBeside(file, '_S2T.txt')

fs.readFile(file, function (err, data) {
  if (err) {
    console.error(err)
    process.exitCode = 1
    return
  }

  // Simplified (cn) -> Traditional (tw)
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
