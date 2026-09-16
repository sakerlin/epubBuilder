#!/usr/bin/env node
'use strict'

const fs = require('fs')
const path = require('path')
const os = require('os')
const { execFileSync } = require('child_process')

const root = path.join(__dirname, '..')
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'epubbuilder-cli-'))
const txt = path.join(tmp, 'book.txt')

const body = [
  '引子 開篇',
  '序文。',
  '第一篇 再見篇 《再見篇》簡介',
  '簡介內文。',
  '第一篇 再見篇 再見篇第二十一章',
  '章內文。'
].join('\n')
fs.writeFileSync(txt, body, 'utf8')

function run (script, args) {
  return execFileSync(process.execPath, [path.join(root, script), ...args], {
    encoding: 'utf8',
    cwd: tmp
  })
}

// preformat uses shared rules
run('src/preformat.js', [txt])
const formatted = path.join(tmp, 'book_formated.txt')
if (!fs.existsSync(formatted)) {
  console.error('preformat missing output')
  process.exit(1)
}
const ftext = fs.readFileSync(formatted, 'utf8')
if (!ftext.includes('引子') || !ftext.includes('第二十一章')) {
  console.error('preformat content unexpected:\n' + ftext)
  process.exit(1)
}

// splite
run('src/splite.js', [formatted])
const spliteDir = path.join(tmp, 'spliteFile')
const xhtmls = fs.readdirSync(spliteDir).filter((n) => n.endsWith('.xhtml'))
if (xhtmls.length < 3) {
  console.error('splite expected >=3 xhtml, got', xhtmls)
  process.exit(1)
}
const joined = xhtmls.map((n) => fs.readFileSync(path.join(spliteDir, n), 'utf8')).join('\n')
if (!joined.includes('第二十一章') || !joined.includes('<p>')) {
  console.error('splite xhtml unexpected')
  process.exit(1)
}

// mdconver
run('src/mdconver.js', [txt])
const md = fs.readFileSync(path.join(tmp, 'book_MD.txt'), 'utf8')
if (!md.includes('##') || !md.includes('第二十一章')) {
  console.error('mdconver unexpected:\n' + md)
  process.exit(1)
}

// same chapter count as epubbuild dump
const dump = path.join(tmp, 'ch.json')
execFileSync(process.execPath, [
  path.join(root, 'src/build.js'),
  txt,
  '-o', path.join(tmp, 't.epub'),
  '--dump-chapters', dump,
  '-q'
], { cwd: tmp, stdio: 'pipe' })

const chapters = JSON.parse(fs.readFileSync(dump, 'utf8'))
// splite file count should match non-empty chapters
const nonempty = chapters.filter((c) => !(c.title === '正文' && (!c.paragraphs || !c.paragraphs.length)))
if (xhtmls.length !== nonempty.length) {
  console.error('splite/epubbuild chapter count mismatch', xhtmls.length, nonempty.length)
  process.exit(1)
}

console.log('smoke-cli-pipeline OK', {
  preformat: true,
  splite: xhtmls.length,
  mdconver: true,
  epubChapters: chapters.length
})
fs.rmSync(tmp, { recursive: true, force: true })
