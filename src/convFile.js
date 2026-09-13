#!/usr/bin/env node
const { tify } = require('chinese-conv')
const program = require('commander')
const fs = require('fs')
const chardet = require('chardet')
const iconv = require('iconv-lite')
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

const detected = chardet.detectFileSync(file)
const isGBK = detected === 'GB18030' || detected === 'GBK' || detected === 'GB2312'
const ouputFileName = outputBeside(file, '_CHT.txt')

if (!isGBK) {
  console.log(file + ' is not a GBK/GB18030 encoded file (detected: ' + detected + ')')
  process.exitCode = 1
  process.exit(1)
}

fs.readFile(file, function (err, data) {
  if (err) {
    console.error(err)
    process.exitCode = 1
    return
  }
  // gbk / gb18030 才轉
  data = iconv.decode(data, 'gbk')
  console.log('decode gbk (detected:', detected + ')')

  let u8 = data.toString('utf8')
  const text = tify(u8)
  fs.writeFile(ouputFileName, text, function (writeErr) {
    if (writeErr) {
      console.error(writeErr)
      process.exitCode = 1
      return
    }
    console.log('wrote', ouputFileName)
  })
})
