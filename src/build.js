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

const program = new Command()

program
  .name('epubbuild')
  .description('Build an EPUB 3 from a plain text novel file')
  .version('1.3.0')
  .argument('<fileName>', 'input UTF-8 text file')
  .option('-o, --output <file>', 'output .epub path')
  .option('-t, --title <title>', 'book title (default: input stem)')
  .option('-a, --author <author>', 'author name', 'Unknown')
  .option('-l, --lang <lang>', 'language tag', 'zh-TW')
  .option('-c, --cover <image>', 'cover image (jpg/png/gif/webp)')
  .option('-r, --rules <file>', 'chapter rules JSON (volume/chapter regex arrays)')
  .option('--s2t', 'convert Simplified → Traditional (TW) before split', false)
  .option('--no-preformat', 'skip blank-line / title tidy preformat')
  .option('--dump-chapters <file>', 'also write chapter JSON for debugging')
  .option('-v, --verbose', 'verbose progress (more frequent ticks)', false)
  .option('-q, --quiet', 'only print final output path (and errors)', false)
  .showHelpAfterError()
  .action(async (fileName, opts) => {
    try {
      await runBuild(fileName, opts)
    } catch (err) {
      console.error(err && err.message ? err.message : err)
      process.exitCode = 1
    }
  })

async function runBuild (fileName, opts) {
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

  const rules = loadRules(opts.rules || null)
  progress.info('rules: ' + rules.source)

  let text = fs.readFileSync(inputFile, 'utf8')
  // Drop BOM if present
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
  // free source text ASAP
  text = null

  if (!opts.quiet) {
    console.error('[epubbuild] chapters: ' + chapters.length)
  }

  if (opts.dumpChapters) {
    progress.phase('dump-chapters')
    const dump = path.resolve(process.cwd(), opts.dumpChapters)
    // dump without huge paragraph bodies unless verbose? keep full for debug
    fs.writeFileSync(dump, JSON.stringify(chapters, null, 2), 'utf8')
    if (!opts.quiet) console.error('[epubbuild] dumped → ' + dump)
  }

  progress.phase('pack', '→ ' + outPath)
  const result = await buildEpub({
    chapters,
    title,
    author: opts.author,
    language: opts.lang,
    coverPath: opts.cover || null,
    outPath,
    freeChapterBodies: true,
    onProgress: (cur, total, label) => progress.tick(label || 'pack', cur, total)
  })

  progress.summary({
    chapters: result.chapterCount,
    bytes: result.bytes,
    outPath: result.outPath
  })

  if (!opts.quiet) {
    console.log('wrote', result.outPath)
    console.log('uuid', result.uuid)
  } else {
    console.log(result.outPath)
  }
}

program.parse(process.argv)
