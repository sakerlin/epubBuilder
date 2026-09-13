#!/usr/bin/env node
const program = require('commander')
const fs = require('fs')
const path = require('path')
const { rmFiles } = require('./lib/fs-utils')
const { ensureDir } = require('./lib/cli-utils')

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
        val = '\n' + val
      } else if (volresult) {
        console.log(val)
        val = '\n' + val
      }
      newArr.push(val)
    }
  })
  return newArr.join('\n') // 重组
}

if (!program.args.length) {
  program.help()
}

ensureDir(SPLITE_DIR)
rmFiles(SPLITE_DIR, (name) => name.endsWith('.xhtml'))

const pmDir = path.join(process.cwd(), 'pm')
if (!fs.existsSync(pmDir)) {
  console.error('Directory not exist: ' + pmDir)
  process.exit(1)
}

let subdirs = fs.readdirSync(pmDir)
let newArr = subdirs.map((fns) => {
  return parseInt(fns, 10)
})
newArr.sort((a, b) => { return a - b })
newArr.forEach((subdir) => {
  if (Number.isNaN(subdir)) return
  const sub = path.join(pmDir, String(subdir))
  if (!fs.statSync(sub).isDirectory()) return
  const txtfiles = fs.readdirSync(sub)

  txtfiles.sort((a, b) => {
    const na = parseInt(a.replace('.txt', ''), 10)
    const nb = parseInt(b.replace('.txt', ''), 10)
    return na - nb
  })
  txtfiles.forEach((txtfile) => {
    const full = path.join(sub, txtfile)
    console.log(full)
    let data = fs.readFileSync(full, 'utf8')
    const pdata = preProccessFnc(data)
    fs.appendFileSync(path.join(process.cwd(), 'pms.txt'), pdata)
  })
})
