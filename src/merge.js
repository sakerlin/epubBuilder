#!/usr/bin/env node
'use strict'

const fs = require('fs')
const path = require('path')
const { Command } = require('commander')
const { rmFiles } = require('./lib/fs-utils')
const { ensureDir, readUtf8 } = require('./lib/cli-utils')
const { loadRules } = require('./lib/chapter-rules')
const { preformatText } = require('./lib/text-pipeline')

const program = new Command()
program
  .name('mergetxt')
  .version('1.3.1')
  .description('Merge ./pm/<n>/*.txt with shared preformat rules')
  .option('-r, --rules <file>', 'chapter rules JSON (same as epubbuild)')
  .option('--pm <dir>', 'source directory', 'pm')
  .option('-o, --output <file>', 'output file', 'pms.txt')
  .showHelpAfterError()
  .parse(process.argv)

const opts = program.opts()
const rules = loadRules(opts.rules || null)
const SPLITE_DIR = path.join(process.cwd(), 'spliteFile')
const pmDir = path.resolve(process.cwd(), opts.pm)
const outFile = path.resolve(process.cwd(), opts.output)

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
    const data = readUtf8(full)
    fs.appendFileSync(outFile, preformatText(data, rules) + '\n')
  })
})

console.log('wrote', outFile)
console.log('rules', rules.source)
