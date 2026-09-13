#!/usr/bin/env node
const path = require('path')
const fs = require('fs')
const { exec } = require('./lib/exec')
const { ensureDir } = require('./lib/cli-utils')

const spliteDir = path.join(process.cwd(), 'spliteFile')
const outZip = path.join(process.cwd(), 'spliteFile.zip')

console.log('do zip -------------')
ensureDir(spliteDir)

if (!fs.existsSync(spliteDir) || fs.readdirSync(spliteDir).length === 0) {
  console.error('Nothing to zip: ' + spliteDir + ' is missing or empty.')
  process.exit(1)
}

exec('zip -r "' + outZip + '" "' + spliteDir + '"')
  .then((result) => {
    if (result.stdout) console.log('stdout: ', result.stdout)
    if (result.stderr) console.log('stderr: ', result.stderr)
    console.log('wrote', outZip)
  })
  .catch((err) => {
    console.error('ERROR: zip failed.')
    console.error(err && err.message ? err.message : err)
    console.error('Need the Info-Zip `zip` CLI on PATH (common on macOS/Linux).')
    console.error('On Windows: install zip, or manually compress the spliteFile folder.')
    process.exitCode = 1
  })
