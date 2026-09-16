#!/usr/bin/env node
'use strict'

const fs = require('fs')
const path = require('path')
const { Command } = require('commander')
const OpenCC = require('opencc-js')
const { loadRules } = require('./lib/chapter-rules')
const {
  preformatText,
  splitIntoChapters,
  convertS2TChunked
} = require('./lib/text-pipeline')
const { buildEpub } = require('./lib/epub-pack')
const { createProgress, formatBytes } = require('./lib/progress')
const { validateEpubFile, validateChapterManifest } = require('./lib/epub-validate')

const program = new Command()

program
  .name('epubbuild')
  .description('Build an EPUB 3 from a plain text novel file')
  .version('1.4.0')
  .argument('<fileName>', 'input UTF-8 text file')
  .option('-o, --output <file>', 'output .epub path')
  .option('-t, --title <title>', 'book title (default: input stem)')
  .option('-a, --author <author>', 'author name', 'Unknown')
  .option('-l, --lang <lang>', 'language tag (written into OPF + xhtml)', 'zh-TW')
  .option('-c, --cover <image>', 'cover image (jpg/png/gif/webp)')
  .option('-r, --rules <file>', 'chapter rules JSON (volume/chapter regex arrays)')
  .option('--s2t', 'convert Simplified → Traditional (TW) before split', false)
  .option('--no-preformat', 'skip blank-line / title tidy preformat')
  .option('--dump-chapters <file>', 'also write chapter JSON for debugging')
  .option('-v, --verbose', 'verbose progress (more frequent ticks)', false)
  .option('-q, --quiet', 'only print final output path (and errors)', false)
  // D: split knobs
  .option('--max-heading-length <n>', 'max chars for a line to count as heading', (v) => parseInt(v, 10))
  .option('--jianjie-as <mode>', 'how to treat 簡介 lines: volume|chapter|body', 'volume')
  .option('--title-style <style>', 'TOC title style: short|full|arc', 'short')
  // E: output quality
  .option('--css <file>', 'custom CSS file (replaces default stylesheet)')
  .option('--front-toc', 'insert a human-readable TOC page after cover', false)
  .option('--spine-toc', 'include machine nav in spine (linear=no)', false)
  // C: validate
  .option('--no-validate', 'skip post-build EPUB structure validation')
  .showHelpAfterError()
  .action(async (fileName, opts) => {
    try {
      await runBuild(fileName, opts)
    } catch (err) {
      console.error(err && err.message ? err.message : err)
      process.exitCode = 1
    }
  })

function assertEnum (value, allowed, label) {
  if (!allowed.includes(value)) {
    throw new Error(label + ' must be one of: ' + allowed.join('|') + ' (got ' + value + ')')
  }
}

async function runBuild (fileName, opts) {
  assertEnum(opts.jianjieAs || 'volume', ['volume', 'chapter', 'body'], '--jianjie-as')
  assertEnum(opts.titleStyle || 'short', ['short', 'full', 'arc'], '--title-style')

  const progress = createProgress({ quiet: opts.quiet, verbose: opts.verbose })
  const inputFile = path.resolve(process.cwd(), fileName)
  if (!fs.existsSync(inputFile)) {
    throw new Error('File not exist: ' + inputFile)
  }

  const stem = path.parse(inputFile).name
  const title = opts.title || stem
  const outPath = path.resolve(
    process.cwd(),
    opts.output || path.join(path.dirname(inputFile), stem + '.epub')
  )

  const st = fs.statSync(inputFile)
  progress.phase('read', formatBytes(st.size) + ' ← ' + inputFile)

  const overrides = {
    jianjieMode: opts.jianjieAs || 'volume',
    titleStyle: opts.titleStyle || 'short'
  }
  if (Number.isFinite(opts.maxHeadingLength) && opts.maxHeadingLength > 0) {
    overrides.maxHeadingLength = opts.maxHeadingLength
  }

  const rules = loadRules(opts.rules || null, overrides)
  progress.info('rules: ' + rules.source +
    ' | maxHeadingLength=' + rules.maxHeadingLength +
    ' | jianjie=' + rules.jianjieMode +
    ' | titleStyle=' + rules.titleStyle)

  let text = fs.readFileSync(inputFile, 'utf8')
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1)

  if (opts.s2t) {
    progress.phase('s2t', 'Simplified → Traditional')
    const converter = OpenCC.Converter({ from: 'cn', to: 'tw' })
    text = convertS2TChunked(text, converter, {
      onProgress: (cur, total) => progress.tick('s2t', cur, total)
    })
  }

  if (opts.preformat) {
    progress.phase('preformat')
    text = preformatText(text, rules, {
      onProgress: (cur, total) => progress.tick('preformat', cur, total)
    })
  }

  progress.phase('split')
  const chapters = splitIntoChapters(text, rules, {
    onProgress: (cur, total) => progress.tick('split', cur, total)
  })
  text = null

  if (!opts.quiet) {
    console.error('[epubbuild] chapters: ' + chapters.length)
  }

  const man = validateChapterManifest(chapters)
  if (!man.ok) {
    throw new Error('chapter manifest invalid:\n- ' + man.errors.join('\n- '))
  }

  if (opts.dumpChapters) {
    progress.phase('dump-chapters')
    const dump = path.resolve(process.cwd(), opts.dumpChapters)
    fs.writeFileSync(dump, JSON.stringify(chapters, null, 2), 'utf8')
    if (!opts.quiet) console.error('[epubbuild] dumped → ' + dump)
  }

  let cssText
  if (opts.css) {
    const cssPath = path.resolve(process.cwd(), opts.css)
    if (!fs.existsSync(cssPath)) throw new Error('CSS not found: ' + cssPath)
    cssText = fs.readFileSync(cssPath, 'utf8')
    progress.info('css: ' + cssPath)
  }

  progress.phase('pack', '→ ' + outPath)
  const result = await buildEpub({
    chapters,
    title,
    author: opts.author,
    language: opts.lang,
    coverPath: opts.cover || null,
    outPath,
    cssText,
    frontToc: !!opts.frontToc,
    spineToc: !!opts.spineToc,
    freeChapterBodies: true,
    onProgress: (cur, total, label) => progress.tick(label || 'pack', cur, total)
  })

  if (opts.validate !== false) {
    progress.phase('validate')
    const report = validateEpubFile(result.outPath)
    if (!report.ok) {
      throw new Error('EPUB validation failed:\n- ' + report.errors.join('\n- '))
    }
    if (!opts.quiet && report.warnings.length) {
      for (const w of report.warnings) console.error('[epubbuild] warn: ' + w)
    }
    progress.info('validate ok entries=' + report.entryCount + ' xhtml=' + report.xhtmlCount)
  }

  progress.summary({
    chapters: result.chapterCount,
    bytes: result.bytes,
    outPath: result.outPath
  })

  if (!opts.quiet) {
    console.log('wrote', result.outPath)
    console.log('uuid', result.uuid)
  }
}

program.parse(process.argv)
