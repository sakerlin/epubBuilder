#!/usr/bin/env node
const OpenCC = require('opencc')
const program = require('commander')
const fs = require('fs')
 

program.version('0.0.1').usage('<fileName>').parse(process.argv)

let text
if (!program.args.length) {
  program.help()
} else {
  // 從參數讀入檔名
  const file = `${process.cwd()}/${program.args}`
  let filename = `${program.args}`.split('.')
  const prefix = filename[0]
   
  const ouputFileName = prefix + '_S2T.txt'
  if (fs.existsSync(file)) {
    // 讀取原始文字檔
    fs.readFile(file, function (err, data) {
      if (!err) {
        const converter = new OpenCC('s2t.json');

        converter.convertPromise(data).then(converted => { 
						fs.writeFile(ouputFileName, converted, function (err) {
							if (err) {
								console.log(err)
							}
						})
        });
      }
    })
  } else {
    console.log('File not exist!!!')
  }
}
