#!/usr/bin/env node
'use strict'

const fs = require('fs')
const path = require('path')
const { countChildren } = require('./lib/fs-utils')

const dirName = process.argv[2]
const dryrun = process.argv.includes('--dryrun')

if (!dirName) {
  console.error('Usage: renameDir <dirName> [--dryrun]')
  process.exit(1)
}

console.log('dryrun =', dryrun)

const root = path.resolve(process.cwd(), dirName)
if (!fs.existsSync(root)) {
  console.error('Directory not exist: ' + root)
  process.exit(1)
}

const dirs = fs.readdirSync(root)
dirs.forEach((dir) => {
  if (!dir.includes('-')) return

  const newName = dir.replace(/-/g, '').replace(/\s+/g, '')
  const srcDir = path.join(root, dir)
  const destDir = path.join(root, newName)
  console.log(`mv ${srcDir} ${destDir}`)

  try {
    if (fs.statSync(srcDir).isDirectory() && countChildren(srcDir) === 0) {
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
      process.exitCode = 1
    }
  }
})
