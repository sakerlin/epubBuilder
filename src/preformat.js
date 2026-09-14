#!/usr/bin/env node
'use strict'

const fs = require('fs')
const { rmFile } = require('./lib/fs-utils')
const {
  parseFileProgram,
  outputBeside,
  exitIfMissing
} = require('./lib/cli-utils')

const { inputFile: file } = parseFileProgram('preformat')
exitIfMissing(file)

// 刪除空白行 並加入分隔符號
const preProccessFnc = (str) => {
  const newArr = []
  const arr = str.split('\n')
  arr.forEach((line) => {
    let val = line.trim()
    if (val === '') return

    const volpatt = /^第[零一二三四五六七八九十百千]{1,7}[集卷冊]/
    const volpatt1 = /^第\d{1,4}[集卷冊]/
    const volpatt2 = /^[上下]半篇{1,12}(.*)$/
    const volresult = volpatt1.test(val) || volpatt.test(val) || volpatt2.test(val)

    const pattb = /^章(.{1,5})$/
    const pattc = /^第\d{1,4}[章節]/
    const patt = /^第[零一二兩三四五六七八九十百千]{1,7}[章節]/
    const result = pattc.test(val) || pattb.test(val) || patt.test(val) ||
      /^引子/.test(val) || /^序章/.test(val) || /^序幕/.test(val) ||
      val.includes('內容簡介') || /^尾聲/.test(val) || /^完本感言/.test(val)

    if (result || volresult) {
      val = val.replace(/\s+/g, '')
      val = val.replace('集', '集 ')
      val = val.replace('卷', '卷 ')
      val = val.replace('冊', '冊 ')
      val = val.replace('篇', '篇 ')
      val = val.replace('章', '章 ')
      val = val.replace('節', '節 ')
      val = '\n' + val + '\n'
    }
    newArr.push(val)
  })
  return newArr.join('\n')
}

const ouputFileName = outputBeside(file, '_formated.txt')
rmFile(ouputFileName)

fs.readFile(file, 'utf8', function (err, data) {
  if (err) {
    console.error(err)
    process.exitCode = 1
    return
  }
  const preProccess = preProccessFnc(data)
  if (!preProccess) return
  fs.writeFile(ouputFileName, preProccess, function (writeErr) {
    if (writeErr) {
      console.error(writeErr)
      process.exitCode = 1
      return
    }
    console.log('wrote', ouputFileName)
  })
})
