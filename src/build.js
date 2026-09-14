#!/usr/bin/env node
'use strict'

const fs = require('fs')
const path = require('path')
const { Command } = require('commander')
const OpenCC = require('opencc-js')
const { loadRules } = require('./lib/chapter-rules')
const { preformatText, splitIntoChapters } = require('./lib/text-pipeline')
const { buildEpub } = require('./lib/epub-pack')

const program = new Command()

program
  .name('epubbuild')
  .description('Build an EPUB 3 from a plain text novel file')
  .version('1.2.0')
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

  const rules = loadRules(opts.rules || null)
  let text = fs.readFileSync(inputFile, 'utf8')

  if (opts.s2t) {
    const converter = OpenCC.Converter({ from: 'cn', to: 'tw' })
    text = converter(text)
  }

  if (opts.preformat) {
    text = preformatText(text, rules)
  }

  const chapters = splitIntoChapters(text, rules)
  console.log('chapters:', chapters.length, '| rules:', rules.source)

  if (opts.dumpChapters) {
    const dump = path.resolve(process.cwd(), opts.dumpChapters)
    fs.writeFileSync(dump, JSON.stringify(chapters, null, 2), 'utf8')
    console.log('dumped chapters →', dump)
  }

  const result = await buildEpub({
    chapters,
    title,
    author: opts.author,
    language: opts.lang,
    coverPath: opts.cover || null,
    outPath
  })

  console.log('wrote', result.outPath)
  console.log('uuid', result.uuid)
}

program.parse(process.argv)
