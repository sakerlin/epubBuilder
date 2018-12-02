#!/usr/bin/env node
const program = require('commander')
const fs = require('fs')
// const { exec } = require('child_process') // 載入 child_process 模組
const exec = require('child-process-promise').exec
const speperator = 'TTTTTTT'
// http://www.skylerzhang.com/node/2015/01/08/commandline/
program.version('0.0.1').usage('<fileName>').parse(process.argv)

// 刪除空白行 並加入分隔符號
const preProccessFnc = (str) => {
  let newArr = []
  let arr = str.split('\n') // 分割
  arr.map((line) => {
    let val = line.trim()
    if (val !== '') {
      const volpatt = /^第[零一二三四五六七八九十百千]{1,7}[集卷冊]/
      const volpatt1 = /^第\d{1,4}[集卷冊]/
      const volpatt2 = /^[上下]半篇{1,12}(.*)$/
      const volresult = volpatt1.test(val) || volpatt.test(val) || volpatt2.test(val)

      const pattb = /^章(.{1,5})$/
      const pattc = /^第\d{1,4}[章節]/
      const patt = /^第[零一二兩三四五六七八九十百千]{1,7}[章節]/
      const result = pattc.test(val) || pattb.test(val) || patt.test(val) || /^引子/.test(val) || /^序章/.test(val) || /^序幕/.test(val) || val.includes('內容簡介') || /^尾聲/.test(val) || /^完本感言/.test(val)

      if (result || volresult) {
        val = val.replace(/\s+/g, "")
        val = val.replace('集', '集 ')
        val = val.replace('卷', '卷 ')
        val = val.replace('冊', '冊 ')
        val = val.replace('篇', '篇 ')
        val = val.replace('章', '章 ')
        val = val.replace('節', '節 ')
        val = "\n" + val + "\n"
      }
      newArr.push(val)
    }
  })
  return newArr.join('\n') // 重组
}


const file = `${process.cwd()}/${program.args}`
let filename = `${program.args}`.split('.')
const ouputFileName = './' + filename[0] + '_formated.txt'

exec('rm -f ' +　ouputFileName)
.then((result) => {
  let stdout = result.stdout
  let stderr = result.stderr
  console.log('stdout: ', stdout)
  console.log('stderr: ', stderr)
  if (!program.args.length) {
    program.help()
  } else {
    // 從參數讀入檔名


    if (fs.existsSync(file)) {
      // 讀取原始文字檔
      fs.readFile(file, 'utf8', function (err, data) {
        if (!err) {
          // 預處理
          const preProccess = preProccessFnc(data)
          if (preProccess) {
            fs.writeFile(ouputFileName, preProccess, function (err) {
              if (err) {
                console.log(err)
              }
            })
          }

        }
      })
    } else {
      console.log('File not exist!!!')
    }
  }
})
.catch(function (err) {
  console.error('ERROR: ', err)
})
