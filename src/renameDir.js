#!/usr/bin/env node
const program = require('commander')
const fs = require('fs')
// const { exec } = require('child_process') // 載入 child_process 模組
const exec = require('child-process-promise').exec
process.argv.forEach(function (val, index, array) {
  console.log(index + ': ' + val);
})
const dirName = process.argv[2]
const dryrun = process.argv.indexOf('--dryrun') !== -1
console.log('dryrun =========', dryrun )
fs.readdir(`./${dirName}`, (err, dirs) => {
  if(err) {
     console.error(err)
     return
   } else {
     dirs.map((dir) => {
       //console.log(dir)
       if(dir.indexOf('-') !== -1) {
          let newName = dir.replace(/-/g, "").replace(/\s+/g, "")
         // let srcDir = `./${dirName}/${dir.replace(/(\s+)/g, '\\$1')}`
         let srcDir = `./${dirName}/${dir.replace(/ /g, '\\ ')}`
         // console.log(srcDir)
         console.log(`mv ${srcDir} ./${dirName}/${newName}`)
         // 刪除空目錄
         exec( `ls -A  ${srcDir} | wc -l`)
         .then((result) => {
           let stdout = result.stdout
           let stderr = result.stderr
           if(stdout) {
             // console.log('stdout: ', stdout)
             var numberOfFilesAsString = stdout.trim();
             if( numberOfFilesAsString === '0' ){
              console.log( 'Directory ' + srcDir + ' is empty.' );
                if (!dryrun) {
                 // exec( `rm -r ${srcDir}`)
                 // .then((result) => {
                 //   console.log('do rm ' + srcDir);
                 //   let stderr = result.stderr
                 //   if (stderr) {
                 //     console.log(stderr)
                 //   }
                 // })
               }
             }
             else {
                 // console.log( 'Directory ' + dir + ' contains ' + numberOfFilesAsString + ' files/directories.' );
             }
           }
           if(stderr) {
             console.log('stderr: ', stderr)
           }
         })
         if (!dryrun) {
           exec(`mv ./${dirName}/${dir.replace(/(\s+)/g, '\\$1')} ./${dirName}/${newName}`)
           .then((result) => {
             let stdout = result.stdout
             let stderr = result.stderr
             if(stdout) {
               console.log('stdout: ', stdout)
             }
             if(stderr) {
               console.log('stderr: ', stderr)
             }
           })
           .catch(function (err) {
             console.error('ERROR: ', err)
           })
         }
       }
     })
   }
})
