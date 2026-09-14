#!/usr/bin/env node
'use strict'

const fs = require('fs')
const path = require('path')
const { rmFiles } = require('./lib/fs-utils')
const {
  parseFileProgram,
  outputBeside,
  ensureDir,
  exitIfMissing
} = require('./lib/cli-utils')

const SPLITE_DIR = path.join(process.cwd(), 'spliteFile')

const { inputFile: file } = parseFileProgram('mdconver')
exitIfMissing(file)

const preProccessFnc = (str) => {
  const newArr = []
  const arr = str.split('\n')
  arr.forEach((line) => {
    let val = line.trim()
    if (val === '') return

    const volpatt = /^第[零一二三四五六七八九十百千]{1,7}[集卷]/
    const volpatt1 = /^第\d{1,4}[集卷]/
    const volpatt2 = /^[上下]半篇{1,12}(.*)$/
    const volresult = volpatt1.test(val) || volpatt.test(val) || volpatt2.test(val)

    const pattb = /^章(.{1,5})$/
    const pattc = /^第\d{1,4}[章節]/
    const patt = /^第[零一二兩三四五六七八九十百千]{1,7}[章節]/
    const result = pattc.test(val) || pattb.test(val) || patt.test(val) ||
      /^引子/.test(val) || /^序章/.test(val) || /^序幕/.test(val) ||
      val.includes('內容簡介') || /^尾聲/.test(val) || /^完本感言/.test(val)

    if (result) {
      console.log(val)
      val = '##' + val
    } else if (volresult) {
      console.log(val)
      val = '#' + val
    }
    newArr.push(val)
  })
  return newArr.join('\n')
}

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
