#!/usr/bin/env node
const program = require('commander')
const fs = require('fs')
const path = require('path')
const { rmFiles } = require('./lib/fs-utils')
const {
  requireInputFile,
  inputStem,
  ensureDir,
  exitIfMissing
} = require('./lib/cli-utils')

const speperator = 'TTTTTTT'
const SPLITE_DIR = path.join(process.cwd(), 'spliteFile')

// http://www.skylerzhang.com/node/2015/01/08/commandline/
program.version('0.0.1').usage('<fileName>').parse(process.argv)

// 刪除空白行 並加入分隔符號
const deleteEmptyLine = (str) => {
  let newArr = []
  let arr = str.split('\n') // 分割
  arr.map((line) => {
    let val = line.trim()
    if (val !== '') {
      const volpatt = /^第[零一二三四五六七八九十百千]{1,7}[集卷冊]/
      const volpatt1 = /^第\d{1,4}[集卷冊]/
      const volpatt2 = /^[上下]半篇{1,12}(.*)$/
      const volpatt3 = /^卷(.{1,12})$/
      const volresult = volpatt1.test(val) || volpatt.test(val) || volpatt2.test(val) || volpatt3.test(val)
      const pattb = /^章(.{1,20})$/
      const pattc = /^第\d{1,4}[章節]/
      const patt = /^第[零一二兩三四五六七八九十百千]{1,7}[章節]/
      const result = pattc.test(val) || pattb.test(val) || patt.test(val) || /^引子/.test(val) || /^序章/.test(val) || /^序幕/.test(val) || val.includes('內容簡介') || /^尾聲/.test(val) || /^終章/.test(val) || /^完本感言/.test(val)

      if (result) {
        console.log(val)
        val = speperator + '<h3>' + val + '</h3>'
      } else if (volresult) {
        console.log(val)
        val = speperator + '<h2>' + val + '</h2>'
      } else {
        val = '<p>' + val + '</p>'
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

const prefix = inputStem(file)
console.log('input:', file, 'prefix:', prefix)

fs.readFile(file, 'utf8', function (err, data) {
  if (err) {
    console.error(err)
    process.exitCode = 1
    return
  }
  const preProccess = deleteEmptyLine(data)
  const chapters = preProccess.split(speperator)
  console.log('Total Chapters count :', chapters.length)
  let cnt = 0
  chapters.forEach((chapter) => {
    cnt++
    if (!chapter) return
    const ouputFileName = path.join(SPLITE_DIR, prefix + '_' + cnt + '.xhtml')
    const mchapter = '<?xml version=\'1.0\' encoding=\'utf-8\'?>' + '\n' +
              '<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="zh-TW">' + '\n' +
              '<head>' + '\n' +
              '<link rel="stylesheet" type="text/css" href="css/main.css"/>' + '\n' +
              '<script src="js/main.js" type="text/javascript"></script>' + '\n' +
              '<style>' + '\n' +
              'p {  text-indent : 2em;  }' + '\n' +
              '</style>' + '\n' +
              '<title></title>' + '\n' +
              '</head>' + '\n' +
              '<body>' + '\n' +
              '<div>' + '\n' +
              chapter + '</div>' + '\n' +
              '</body>' + '\n' +
              '</html>'
    try {
      fs.writeFileSync(ouputFileName, mchapter)
    } catch (writeErr) {
      console.error(writeErr)
      process.exitCode = 1
    }
  })
})
