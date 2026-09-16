#!/usr/bin/env node
'use strict'

const fs = require('fs')
const path = require('path')
const { loadRules, classifyLine } = require('../src/lib/chapter-rules')
const { displayTitle } = require('../src/lib/title-clean')
const { preformatText, splitIntoChapters } = require('../src/lib/text-pipeline')

const root = path.join(__dirname, '..')
const fixturesDir = path.join(root, 'test', 'fixtures')
const novelsDir = path.join(fixturesDir, 'novels')
const unitPath = path.join(fixturesDir, 'unit-cases.json')

let failed = 0

function assert (cond, msg) {
  if (!cond) {
    console.error('FAIL:', msg)
    failed++
  }
}

function runUnitCases () {
  const unit = JSON.parse(fs.readFileSync(unitPath, 'utf8'))
  const rules = loadRules(null)

  console.log('— classifyLine —')
  for (const c of unit.classify) {
    const got = classifyLine(c.line, rules)
    assert(got === c.expect, 'classify "' + c.line + '" => ' + got + ' expected ' + c.expect)
  }

  console.log('— displayTitle —')
  for (const c of unit.displayTitle) {
    const got = displayTitle(c.raw, c.level)
    assert(got === c.expect, 'displayTitle "' + c.raw + '" => "' + got + '" expected "' + c.expect + '"')
  }
}

function slimChapters (chapters) {
  return chapters
    .filter((ch) => !(ch.title === '正文' && (!ch.paragraphs || ch.paragraphs.length === 0)))
    .map((ch) => ({ level: ch.level, title: ch.title }))
}

function runNovelFixtures () {
  const rules = loadRules(null)
  const files = fs.readdirSync(novelsDir).filter((n) => n.endsWith('.txt'))
  console.log('— novel fixtures (' + files.length + ') —')

  for (const name of files) {
    const base = name.replace(/\.txt$/, '')
    const txtPath = path.join(novelsDir, name)
    const expPath = path.join(novelsDir, base + '.expected.json')
    assert(fs.existsSync(expPath), 'missing expected for ' + name)

    const text = fs.readFileSync(txtPath, 'utf8')
    const chapters = splitIntoChapters(preformatText(text, rules), rules)
    const got = slimChapters(chapters)
    const expected = JSON.parse(fs.readFileSync(expPath, 'utf8'))

    assert(
      got.length === expected.length,
      base + ' chapter count ' + got.length + ' != ' + expected.length + '\n got=' + JSON.stringify(got)
    )

    for (let i = 0; i < Math.min(got.length, expected.length); i++) {
      assert(
        got[i].level === expected[i].level && got[i].title === expected[i].title,
        base + '[' + i + '] got ' + JSON.stringify(got[i]) + ' expected ' + JSON.stringify(expected[i])
      )
    }

    // prose line with 第一 must stay inside a chapter body, not become its own heading
    if (base === 'intro-midline') {
      const ch21 = chapters.find((c) => c.title === '第二十一章')
      assert(!!ch21, 'intro-midline missing 第二十一章')
      const body = (ch21.paragraphs || []).join('\n')
      assert(body.includes('風大先生第一個回過神來'), 'prose with 第一 should remain body text')
    }

    console.log('  OK', base, '(' + got.length + ' chapters)')
  }
}

runUnitCases()
runNovelFixtures()

if (failed) {
  console.error('\n' + failed + ' assertion(s) failed')
  process.exit(1)
}
console.log('\nchapter-fixtures OK')
