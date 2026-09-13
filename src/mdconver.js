#!/usr/bin/env node
const program = require('commander')
const fs = require('fs')
const path = require('path')
const { rmFiles } = require('./lib/fs-utils')
const {
  requireInputFile,
  outputBeside,
  ensureDir,
  exitIfMissing
} = require('./lib/cli-utils')

const speperator = 'TTTTTTT'
const SPLITE_DIR = path.join(process.cwd(), 'spliteFile')
// http://www.skylerzhang.com/node/2015/01/08/commandline/
program.version('0.0.1').usage('<fileName>').parse(process.argv)

// 刪除空白行 並加入分隔符號
const preProccessFnc = (str) => {
  let newArr = []
  let arr = str.split('\n') // 分割
  arr.map((line) => {
    let val = line.trim()
    if (val !== '') {
      const volpatt = /^第[零一二三四五六七八九十百千]{1,7}[集卷]/
      const volpatt1 = /^第\d{1,4}[集卷]/
      const volpatt2 = /^[上下]半篇{1,12}(.*)$/
      const volresult = volpatt1.test(val) || volpatt.test(val) || volpatt2.test(val)

      const pattb = /^章(.{1,5})$/
      const pattc = /^第\d{1,4}[章節]/
      const patt = /^第[零一二兩三四五六七八九十百千]{1,7}[章節]/
      const result = pattc.test(val) || pattb.test(val) || patt.test(val) || /^引子/.test(val) || /^序章/.test(val) || /^序幕/.test(val) || val.includes('內容簡介') || /^尾聲/.test(val) || /^完本感言/.test(val)

      if (result) {
        console.log(val)
        val = '##' + val
      } else if (volresult) {
        console.log(val)
        val = '#' + val
      }
      newArr.push(val)
    }
  })
  return newArr.join('\n') // 重组
}

if (!program.args.length) {
  program.help()
}

const file = requireInputFile(program)
exitIfMissing(file)

ensureDir(SPLITE_DIR)
rmFiles(SPLITE_DIR, (name) => name.endsWith('.xhtml'))

const ouputFileName = outputBeside(file, '_MD.txt')

fs.readFile(file, 'utf8', function (err, data) {
  if (err) {
    console.error(err)
    process.exitCode = 1
    return
  }
  const preProccess = preProccessFnc(data)
  if (preProccess) {
    fs.writeFile(ouputFileName, preProccess, function (writeErr) {
      if (writeErr) {
        console.error(writeErr)
        process.exitCode = 1
        return
      }
      console.log('wrote', ouputFileName)
    })
  }
})
