#!/usr/bin/env node
'use strict'

const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')
const os = require('os')

const root = path.join(__dirname, '..')
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'epubbuilder-smoke-'))
const txt = path.join(tmp, 'novel.txt')
const epub = path.join(tmp, 'novel.epub')

const body = [
  '引子 開篇',
  '序文一段。',
  '第一篇 再見篇 《再見篇》簡介',
  '這是簡介內文。',
  '第一篇 再見篇 再見篇第一章 紈褲',
  '章內第一段。',
  '第一篇 再見篇 再見篇第二十一章',
  '章內第二段。',
  '第五篇 厚積篇 厚積篇第六篇',
  '誤用篇當章。',
  '第二章 繼續',
  '更多內容。',
  '这是简体句子。'
].join('\n')

fs.writeFileSync(txt, body, 'utf8')

execFileSync(process.execPath, [
  path.join(root, 'src/build.js'),
  txt,
  '-o', epub,
  '--title', '測試之書',
  '--author', 'saker',
  '--s2t',
  '--dump-chapters', path.join(tmp, 'chapters.json')
], { stdio: 'inherit', cwd: root })

if (!fs.existsSync(epub) || fs.statSync(epub).size < 100) {
  console.error('epub missing or too small')
  process.exit(1)
}

// Verify ZIP local headers: first entry should be mimetype stored
const buf = fs.readFileSync(epub)
const sig = buf.readUInt32LE(0)
if (sig !== 0x04034b50) {
  console.error('not a zip')
  process.exit(1)
}
const nameLen = buf.readUInt16LE(26)
const extraLen = buf.readUInt16LE(28)
const method = buf.readUInt16LE(8)
const name = buf.slice(30, 30 + nameLen).toString('utf8')
if (name !== 'mimetype') {
  console.error('first zip entry is not mimetype:', name)
  process.exit(1)
}
if (method !== 0) {
  console.error('mimetype must be stored (method=0), got', method)
  process.exit(1)
}
const dataStart = 30 + nameLen + extraLen
const mime = buf.slice(dataStart, dataStart + 20).toString('utf8')
if (mime !== 'application/epub+zip') {
  console.error('bad mimetype payload', mime)
  process.exit(1)
}

const chapters = JSON.parse(fs.readFileSync(path.join(tmp, 'chapters.json'), 'utf8'))
if (chapters.length < 6) {
  console.error('expected >=6 chapters, got', chapters.length)
  process.exit(1)
}
const titles = chapters.map((c) => c.title)
const joined = titles.join('\n')
if (!joined.includes('第二十一章') || !joined.includes('引子')) {
  console.error('missing expected titles:\n' + joined)
  process.exit(1)
}
// TOC cleanup expectations
const expectTitles = ['再見篇·簡介', '第一章 紈褲', '第二十一章', '第六篇']
for (const t of expectTitles) {
  if (!titles.includes(t)) {
    console.error('expected cleaned title missing:', t, '\ngot:\n' + joined)
    process.exit(1)
  }
}
// long raw prefix should not remain as display title
if (titles.some((t) => t.includes('第一篇 再見篇 再見篇'))) {
  console.error('display title still has long raw prefix:\n' + joined)
  process.exit(1)
}
const sixth = chapters.find((c) => c.rawTitle && c.rawTitle.includes('厚積篇第六篇'))
if (!sixth || sixth.level !== 2) {
  console.error('厚積篇第六篇 should be chapter level 2', sixth)
  process.exit(1)
}

// s2t should have converted 简体
const flat = JSON.stringify(chapters)
if (flat.includes('简体') && !flat.includes('簡體')) {
  console.error('s2t did not convert simplified text')
  process.exit(1)
}

console.log('smoke-epub OK', epub, 'chapters=', chapters.length)
fs.rmSync(tmp, { recursive: true, force: true })
