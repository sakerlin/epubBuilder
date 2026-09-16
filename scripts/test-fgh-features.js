#!/usr/bin/env node
'use strict'

const fs = require('fs')
const path = require('path')
const os = require('os')
const { execFileSync } = require('child_process')
const { collectInputFiles } = require('../src/lib/batch-inputs')
const { buildChaptersFromFile } = require('../src/lib/stream-pipeline')
const { loadRules } = require('../src/lib/chapter-rules')
const { validateEpubFile } = require('../src/lib/epub-validate')

async function main () {
  const root = path.join(__dirname, '..')
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'epub-fgh-'))
  const dirA = path.join(tmp, 'in')
  const dirB = path.join(tmp, 'out')
  fs.mkdirSync(dirA)
  fs.mkdirSync(dirB)

  const body = [
    '引子 開篇',
    '序。',
    '第一篇 示範篇 示範篇第一章',
    '文。',
    '第一篇 示範篇 示範篇第二章',
    '文二。'
  ].join('\n')

  fs.writeFileSync(path.join(dirA, 'a.txt'), body, 'utf8')
  fs.writeFileSync(path.join(dirA, 'b.txt'), body, 'utf8')
  fs.writeFileSync(path.join(dirA, 'skip.bin'), Buffer.from([0, 1, 2]))

  const files = collectInputFiles([dirA])
  if (files.length !== 2) {
    console.error('expected 2 txt files', files)
    process.exit(1)
  }
  console.log('batch collect OK', files.map((f) => path.basename(f)))

  const rules = loadRules(null)
  const streamed = await buildChaptersFromFile(path.join(dirA, 'a.txt'), rules, {
    stream: true,
    preformat: true
  })
  if (streamed.mode !== 'stream' || streamed.chapters.length < 3) {
    console.error('stream pipeline unexpected', streamed)
    process.exit(1)
  }
  console.log('stream OK', streamed.chapters.length)

  const full = await buildChaptersFromFile(path.join(dirA, 'a.txt'), rules, {
    stream: false,
    preformat: true
  })
  if (full.mode !== 'full') {
    console.error('full mode expected')
    process.exit(1)
  }
  if (full.chapters.length !== streamed.chapters.length) {
    console.error('stream/full chapter mismatch', full.chapters.length, streamed.chapters.length)
    process.exit(1)
  }

  // titles should match
  for (let i = 0; i < full.chapters.length; i++) {
    if (full.chapters[i].title !== streamed.chapters[i].title) {
      console.error('title mismatch', i, full.chapters[i].title, streamed.chapters[i].title)
      process.exit(1)
    }
  }

  execFileSync(process.execPath, [
    path.join(root, 'src/build.js'),
    dirA,
    '--out-dir', dirB,
    '--stream',
    '-q'
  ], { stdio: 'inherit' })

  const epubs = fs.readdirSync(dirB).filter((n) => n.endsWith('.epub'))
  if (epubs.length !== 2) {
    console.error('batch epubs', epubs)
    process.exit(1)
  }
  for (const n of epubs) {
    const rep = validateEpubFile(path.join(dirB, n))
    if (!rep.ok) {
      console.error('validate', n, rep.errors)
      process.exit(1)
    }
  }

  const demo = path.join(root, 'examples', 'demo-novel.txt')
  const demoOut = path.join(tmp, 'demo.epub')
  execFileSync(process.execPath, [
    path.join(root, 'src/build.js'),
    demo,
    '-o', demoOut,
    '-t', '示範小說',
    '--front-toc',
    '-q'
  ], { stdio: 'inherit' })
  if (!validateEpubFile(demoOut).ok) {
    console.error('demo novel validate fail')
    process.exit(1)
  }

  console.log('FGH smoke OK')
  fs.rmSync(tmp, { recursive: true, force: true })
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
