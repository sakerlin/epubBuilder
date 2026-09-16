#!/usr/bin/env node
'use strict'

const fs = require('fs')
const path = require('path')
const os = require('os')
const { execFileSync } = require('child_process')
const { validateEpubFile } = require('../src/lib/epub-validate')
const { loadRules, classifyLine } = require('../src/lib/chapter-rules')
const { displayTitle } = require('../src/lib/title-clean')
const { splitIntoChapters, preformatText } = require('../src/lib/text-pipeline')

const root = path.join(__dirname, '..')
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'epub-cde-'))
const txt = path.join(tmp, 'book.txt')
const epub = path.join(tmp, 'book.epub')
const css = path.join(tmp, 'custom.css')

fs.writeFileSync(css, 'body { color: #222; }\nimg.cover { border: 0; }\n', 'utf8')
fs.writeFileSync(txt, [
  '第一篇 再見篇 《再見篇》簡介',
  '簡介文。',
  '第一篇 再見篇 再見篇第二十一章 紈褲',
  '章文。'
].join('\n'), 'utf8')

// D: jianjie-as body should not create volume heading
{
  const rules = loadRules(null, { jianjieMode: 'body', titleStyle: 'arc' })
  const ch = splitIntoChapters(preformatText(fs.readFileSync(txt, 'utf8'), rules), rules)
  const titles = ch.map((c) => c.title)
  if (titles.some((t) => t.includes('簡介'))) {
    console.error('jianjie-as=body still created 簡介 heading', titles)
    process.exit(1)
  }
  const arc = displayTitle('第一篇 再見篇 再見篇第二十一章 紈褲', 2, 'arc')
  if (arc !== '再見·第二十一章 紈褲' && arc !== '再見篇·第二十一章 紈褲') {
    // arcName strips 篇 → 再見
    if (!arc.includes('第二十一章') || !arc.includes('·')) {
      console.error('arc title unexpected', arc)
      process.exit(1)
    }
  }
  console.log('D knobs OK', { titles, arc })
}

// C+E build with front-toc + css + validate
execFileSync(process.execPath, [
  path.join(root, 'src/build.js'),
  txt,
  '-o', epub,
  '-t', '測試',
  '-l', 'zh-TW',
  '--css', css,
  '--front-toc',
  '--title-style', 'short',
  '-q'
], { stdio: 'inherit', cwd: tmp })

const report = validateEpubFile(epub)
if (!report.ok) {
  console.error('validate failed', report.errors)
  process.exit(1)
}
if (report.xhtmlCount < 2) {
  console.error('expected toc + chapters xhtml', report)
  process.exit(1)
}

// lang in xhtml
const { readZipEntries } = require('../src/lib/epub-validate')
const entries = readZipEntries(fs.readFileSync(epub))
const sample = entries.find((e) => e.name.includes('chap_') && e.name.endsWith('.xhtml'))
if (!sample || !sample.data.toString('utf8').includes('xml:lang="zh-TW"')) {
  console.error('chapter xhtml missing lang')
  process.exit(1)
}
if (!entries.some((e) => e.name === 'OEBPS/text/toc.xhtml')) {
  console.error('front toc missing')
  process.exit(1)
}
const cssEntry = entries.find((e) => e.name === 'OEBPS/styles/main.css')
if (!cssEntry.data.toString('utf8').includes('color: #222')) {
  console.error('custom css not applied')
  process.exit(1)
}

// max-heading-length tiny → fewer headings
{
  const rules = loadRules(null, { maxHeadingLength: 5 })
  const long = '第一篇 再見篇 再見篇第二十一章'
  if (classifyLine(long, rules) !== 'body') {
    console.error('max-heading-length should force body for long line')
    process.exit(1)
  }
}

console.log('CDE smoke OK', report)
fs.rmSync(tmp, { recursive: true, force: true })
