#!/usr/bin/env node
'use strict'

const fs = require('fs')
const path = require('path')
const { Command } = require('commander')
const OpenCC = require('opencc-js')
const { loadRules } = require('./lib/chapter-rules')
const { buildEpub } = require('./lib/epub-pack')
const { createProgress, formatBytes } = require('./lib/progress')
const { validateEpubFile, validateChapterManifest } = require('./lib/epub-validate')
const { buildChaptersFromFile } = require('./lib/stream-pipeline')
const { collectInputFiles, defaultOutPath } = require('./lib/batch-inputs')

const program = new Command()

program
  .name('epubbuild')
  .description('Build EPUB 3 from plain text novel file(s) or directories')
  .version('1.5.0')
  .argument('<inputs...>', 'input .txt/.md file(s) and/or directories')
  .option('-o, --output <file>', 'output .epub path (single-file mode only)')
  .option('--out-dir <dir>', 'batch output directory (one epub per input)')
  .option('-t, --title <title>', 'book title (single-file only; default: input stem)')
  .option('-a, --author <author>', 'author name', 'Unknown')
  .option('-l, --lang <lang>', 'language tag (written into OPF + xhtml)', 'zh-TW')
  .option('-c, --cover <image>', 'cover image (jpg/png/gif/webp)')
  .option('-r, --rules <file>', 'chapter rules JSON (volume/chapter regex arrays)')
  .option('--s2t', 'convert Simplified → Traditional (TW) before split', false)
  .option('--no-preformat', 'skip blank-line / title tidy preformat')
  .option('--dump-chapters <file>', 'write chapter JSON (single-file mode)')
  .option('-v, --verbose', 'verbose progress (more frequent ticks)', false)
  .option('-q, --quiet', 'only print final output path(s) (and errors)', false)
  .option('--max-heading-length <n>', 'max chars for a line to count as heading', (v) => parseInt(v, 10))
  .option('--jianjie-as <mode>', 'how to treat 簡介 lines: volume|chapter|body', 'volume')
  .option('--title-style <style>', 'TOC title style: short|full|arc', 'short')
  .option('--css <file>', 'custom CSS file (replaces default stylesheet)')
  .option('--front-toc', 'insert a human-readable TOC page after cover', false)
  .option('--spine-toc', 'include machine nav in spine (linear=no)', false)
  .option('--no-validate', 'skip post-build EPUB structure validation')
  .option('--stream', 'force line-stream pipeline (lower peak memory)')
  .option('--no-stream', 'force full-file read pipeline')
  .option('--stream-threshold <bytes>', 'auto-stream when file larger than this (default 2MB)', (v) => parseInt(v, 10))
  .showHelpAfterError()
  .action(async (inputs, opts) => {
    try {
      await runMain(inputs, opts)
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

function resolveStreamMode (opts) {
  if (opts.stream === true) return true
  if (opts.noStream === true || opts.stream === false) return false
  return undefined // auto
}

async function runMain (inputs, opts) {
  assertEnum(opts.jianjieAs || 'volume', ['volume', 'chapter', 'body'], '--jianjie-as')
  assertEnum(opts.titleStyle || 'short', ['short', 'full', 'arc'], '--title-style')

  const files = collectInputFiles(inputs)
  const batch = files.length > 1 || !!opts.outDir

  if (batch) {
    if (opts.output) {
      throw new Error('Use --out-dir for batch mode (not -o/--output)')
    }
    if (opts.title) {
      console.error('[epubbuild] warn: --title ignored in batch mode (using each file stem)')
    }
    if (opts.dumpChapters) {
      throw new Error('--dump-chapters is only supported in single-file mode')
    }
    if (opts.outDir) {
      fs.mkdirSync(path.resolve(opts.outDir), { recursive: true })
    }
  } else if (opts.outDir && !opts.output) {
    fs.mkdirSync(path.resolve(opts.outDir), { recursive: true })
  }

  let cssText
  if (opts.css) {
    const cssPath = path.resolve(process.cwd(), opts.css)
    if (!fs.existsSync(cssPath)) throw new Error('CSS not found: ' + cssPath)
    cssText = fs.readFileSync(cssPath, 'utf8')
  }

  const overrides = {
    jianjieMode: opts.jianjieAs || 'volume',
    titleStyle: opts.titleStyle || 'short'
  }
  if (Number.isFinite(opts.maxHeadingLength) && opts.maxHeadingLength > 0) {
    overrides.maxHeadingLength = opts.maxHeadingLength
  }
  const rules = loadRules(opts.rules || null, overrides)

  let convertFn = null
  if (opts.s2t) {
    const converter = OpenCC.Converter({ from: 'cn', to: 'tw' })
    convertFn = (s) => converter(s)
  }

  const streamMode = resolveStreamMode(opts)
  const streamThreshold = Number.isFinite(opts.streamThreshold) && opts.streamThreshold > 0
    ? opts.streamThreshold
    : 2 * 1024 * 1024

  const results = []
  let failures = 0

  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    const progress = createProgress({ quiet: opts.quiet, verbose: opts.verbose })
    const label = batch ? ('[' + (i + 1) + '/' + files.length + '] ') : ''

    try {
      const outPath = batch || opts.outDir
        ? defaultOutPath(file, opts.outDir || null)
        : path.resolve(process.cwd(), opts.output || defaultOutPath(file, null))

      const title = (!batch && opts.title) ? opts.title : path.parse(file).name

      progress.phase(label + 'read', formatBytes(fs.statSync(file).size) + ' ← ' + file)
      progress.info('rules: ' + rules.source +
        ' | maxHeadingLength=' + rules.maxHeadingLength +
        ' | jianjie=' + rules.jianjieMode +
        ' | titleStyle=' + rules.titleStyle)

      if (convertFn) progress.phase(label + 's2t+split')
      else progress.phase(label + 'split')

      const built = await buildChaptersFromFile(file, rules, {
        stream: streamMode,
        streamThreshold,
        preformat: opts.preformat !== false,
        convertFn,
        onProgress: (cur, total, phase) => {
          if (typeof total === 'number') progress.tick(phase || 'stream', cur, total)
          else progress.tick('stream-lines', cur, cur)
        }
      })

      progress.info('pipeline=' + built.mode + ' lines=' + built.linesRead)
      if (!opts.quiet) {
        console.error('[epubbuild] ' + label + 'chapters: ' + built.chapters.length)
      }

      const man = validateChapterManifest(built.chapters)
      if (!man.ok) {
        throw new Error('chapter manifest invalid:\n- ' + man.errors.join('\n- '))
      }

      if (!batch && opts.dumpChapters) {
        progress.phase('dump-chapters')
        const dump = path.resolve(process.cwd(), opts.dumpChapters)
        fs.writeFileSync(dump, JSON.stringify(built.chapters, null, 2), 'utf8')
        if (!opts.quiet) console.error('[epubbuild] dumped → ' + dump)
      }

      progress.phase(label + 'pack', '→ ' + outPath)
      const result = await buildEpub({
        chapters: built.chapters,
        title,
        author: opts.author,
        language: opts.lang,
        coverPath: opts.cover || null,
        outPath,
        cssText,
        frontToc: !!opts.frontToc,
        spineToc: !!opts.spineToc,
        freeChapterBodies: true,
        onProgress: (cur, total, ph) => progress.tick(ph || 'pack', cur, total)
      })

      if (opts.validate !== false) {
        progress.phase(label + 'validate')
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

      results.push({ ok: true, input: file, outPath: result.outPath, chapters: result.chapterCount })
    } catch (err) {
      failures++
      const msg = err && err.message ? err.message : String(err)
      console.error('[epubbuild] ERROR ' + file + ': ' + msg)
      results.push({ ok: false, input: file, error: msg })
      if (!batch) throw err
    }
  }

  if (batch && !opts.quiet) {
    const ok = results.filter((r) => r.ok).length
    console.error('[epubbuild] batch done: ' + ok + '/' + results.length + ' ok')
  }

  if (failures) process.exitCode = 1
}

program.parse(process.argv)
