#!/usr/bin/env node
'use strict'

const fs = require('fs')
const path = require('path')
const { rmFiles } = require('./lib/fs-utils')
const { ensureDir } = require('./lib/cli-utils')

const SPLITE_DIR = path.join(process.cwd(), 'spliteFile')
const pmDir = path.join(process.cwd(), 'pm')
const outFile = path.join(process.cwd(), 'pms.txt')

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
      val = '\n' + val
    } else if (volresult) {
      console.log(val)
      val = '\n' + val
    }
    newArr.push(val)
  })
  return newArr.join('\n')
}

ensureDir(SPLITE_DIR)
rmFiles(SPLITE_DIR, (name) => name.endsWith('.xhtml'))

if (!fs.existsSync(pmDir)) {
  console.error('Directory not exist: ' + pmDir)
  process.exit(1)
}

if (fs.existsSync(outFile)) fs.rmSync(outFile, { force: true })

const subdirs = fs.readdirSync(pmDir)
  .map((fns) => parseInt(fns, 10))
  .filter((n) => !Number.isNaN(n))
  .sort((a, b) => a - b)

subdirs.forEach((subdir) => {
  const sub = path.join(pmDir, String(subdir))
  if (!fs.statSync(sub).isDirectory()) return
  const txtfiles = fs.readdirSync(sub).sort((a, b) => {
    const na = parseInt(a.replace('.txt', ''), 10)
    const nb = parseInt(b.replace('.txt', ''), 10)
    return na - nb
  })
  txtfiles.forEach((txtfile) => {
    const full = path.join(sub, txtfile)
    console.log(full)
    const data = fs.readFileSync(full, 'utf8')
    fs.appendFileSync(outFile, preProccessFnc(data))
  })
})

console.log('wrote', outFile)
