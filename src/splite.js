#!/usr/bin/env node
const program = require('commander')
const fs = require('fs')
// const { exec } = require('child_process') // 載入 child_process 模組
const exec = require('child-process-promise').exec
const speperator = 'TTTTTTT'
// http://www.skylerzhang.com/node/2015/01/08/commandline/
program.version('0.0.1').usage('<fileName>').parse(process.argv)

// 刪除空白行 並加入分隔符號
const deleteEmptyLine = (str) => {
  let newArr = []
  let arr = str.split('\n') // 分割
  arr.map((line) => {
    let val = line.trim()
    if (val !== '') {
      const volpatt = /^第(.{1,5})集/
      const volresult = volpatt.test(val)
      const patt = /^第(.{1,5})章/
      const pattb = /^章(.{1,5})/
      const result = pattb.test(val) || patt.test(val) || /^引子/.test(val) || /^序章/.test(val) || val.includes('內容簡介') || /^尾聲/.test(val) || /^完本感言/.test(val)

      // const result = patt.test(val) && !val.includes('章若水') && !val.includes('章若雲')
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

exec('rm -rf ./spliteFile/*.xhtml')
.then((result) => {
  let stdout = result.stdout
  let stderr = result.stderr
  console.log('stdout: ', stdout)
  console.log('stderr: ', stderr)
  if (!program.args.length) {
    program.help()
  } else {
    // 從參數讀入檔名
    const file = `${process.cwd()}/${program.args}`
    let filename = `${program.args}`.split('.')
    console.log(filename)
    const prefix = filename[0]
    if (fs.existsSync(file)) {
      // 讀取原始文字檔
      fs.readFile(file, 'utf8', function (err, data) {
        if (!err) {
          // 預處理
          const preProccess = deleteEmptyLine(data)
          // console.log(preProccess)
          // 分割成章節 array
          const chapters = preProccess.split(speperator)
          console.log('Total Chapters count :', chapters.length)
          let cnt = 0
          chapters.map((chapter) => { // 輸出分割 xhtml
            // 輸出檔名
            cnt++
            const ouputFileName = './spliteFile/' + prefix + '_' + cnt + '.xhtml'
            // console.log('output filename :', ouputFileName)
            let mchapter = '<?xml version=\'1.0\' encoding=\'utf-8\'?>' + '\n' +
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
            if (chapter) {
              fs.writeFile(ouputFileName, mchapter, function (err) {
                if (err) {
                  console.log(err)
                }
              })
            }
          })
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
