#!/usr/bin/env node
const fs = require('fs')
const path = require('path')
const { countChildren } = require('./lib/fs-utils')

process.argv.forEach(function (val, index, array) {
  console.log(index + ': ' + val)
})
const dirName = process.argv[2]
const dryrun = process.argv.indexOf('--dryrun') !== -1
console.log('dryrun =========', dryrun)

fs.readdir(`./${dirName}`, (err, dirs) => {
  if (err) {
    console.error(err)
    return
  }
  dirs.map((dir) => {
    if (dir.indexOf('-') !== -1) {
      let newName = dir.replace(/-/g, '').replace(/\s+/g, '')
      let srcDir = path.join('.', dirName, dir)
      let destDir = path.join('.', dirName, newName)
      console.log(`mv ${srcDir} ${destDir}`)

      // 空目錄偵測（取代 ls -A | wc -l）
      try {
        const n = countChildren(srcDir)
        if (n === 0) {
          console.log('Directory ' + srcDir + ' is empty.')
        }
      } catch (e) {
        console.error(e)
      }

      if (!dryrun) {
        try {
          fs.renameSync(srcDir, destDir)
        } catch (e) {
          console.error('ERROR: ', e)
        }
      }
    }
  })
})
