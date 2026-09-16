'use strict'

const fs = require('fs')
const path = require('path')
const { Command } = require('commander')
const { loadRules } = require('./chapter-rules')

/**
 * Parse a single required file argument (Commander v12+).
 * @param {string} name CLI name
 * @param {string} [version]
 * @param {{ extraOptions?: (p: import('commander').Command) => void }} [opts]
 * @returns {{ program: import('commander').Command, inputFile: string, rules: ReturnType<typeof loadRules>, opts: object }}
 */
function parseFileProgram (name, version = '1.3.1', opts = {}) {
  const program = new Command()
  program
    .name(name)
    .version(version)
    .argument('<fileName>', 'input text file path')
    .option('-r, --rules <file>', 'chapter rules JSON (same as epubbuild)')
    .showHelpAfterError()

  if (typeof opts.extraOptions === 'function') {
    opts.extraOptions(program)
  }

  program.parse(process.argv)

  const raw = program.args[0]
  const inputFile = path.resolve(process.cwd(), String(raw))
  const cliOpts = program.opts()
  const rules = loadRules(cliOpts.rules || null)
  return { program, inputFile, rules, opts: cliOpts }
}

/**
 * Output path beside the input file: `<dir>/<stem><suffix>`
 */
function outputBeside (inputFile, suffix) {
  const dir = path.dirname(inputFile)
  const stem = path.parse(inputFile).name
  return path.join(dir, stem + suffix)
}

/** Basename stem only — safe for spliteFile output names. */
function inputStem (inputFile) {
  return path.parse(inputFile).name
}

function ensureDir (dir) {
  fs.mkdirSync(dir, { recursive: true })
}

function exitIfMissing (file) {
  if (!fs.existsSync(file)) {
    console.error('File not exist: ' + file)
    process.exit(1)
  }
}

/** Read UTF-8 text, strip BOM. */
function readUtf8 (file) {
  let text = fs.readFileSync(file, 'utf8')
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1)
  return text
}

/** @deprecated use parseFileProgram */
function requireInputFile (program) {
  const raw = program.args && program.args[0]
  if (!raw || String(raw).trim() === '') {
    if (typeof program.help === 'function') program.help()
    console.error('Missing input file path.')
    process.exit(1)
  }
  return path.resolve(process.cwd(), String(raw))
}

module.exports = {
  parseFileProgram,
  requireInputFile,
  outputBeside,
  inputStem,
  ensureDir,
  exitIfMissing,
  readUtf8
}
