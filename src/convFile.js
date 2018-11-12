#!/usr/bin/env node
const {tify} = require('chinese-conv')
const program = require('commander')
const fs = require('fs')
const chardet = require('chardet')
const iconv = require('iconv-lite')

program.version('0.0.1').usage('<fileName>').parse(process.argv)

let text
if (!program.args.length) {
  program.help()
} else {
  // 從參數讀入檔名
  const file = `${process.cwd()}/${program.args}`
  let filename = `${program.args}`.split('.')
  const prefix = filename[0]
  let isGBK = chardet.detectFileSync(file) === 'GB18030'
  const ouputFileName = prefix + '_CHT.txt'
  if (fs.existsSync(file)) {
    // 讀取原始文字檔
    fs.readFile(file, function (err, data) {
      if (!err) {
        if (isGBK) { // gbk才轉
          data = iconv.decode(data, 'gbk')
          console.log('decode gbk')

          let u8 = data.toString('utf-8')
          text = tify(u8)
          // 寫檔
          fs.writeFile(ouputFileName, text, function (err) {
            if (err) {
              console.log(err)
            }
          })
        } else {
          console.log(`${program.args} not a bgk encode file`)
        }
      }
    })
  } else {
    console.log('File not exist!!!')
  }
}
