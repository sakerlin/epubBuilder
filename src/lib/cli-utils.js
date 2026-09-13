'use strict'

const fs = require('fs')
const path = require('path')

/**
 * Resolve the first CLI file argument to an absolute path.
 * Commander v2 puts positionals in program.args (array).
 * @param {import('commander').Command | { args: string[] }} program
 * @returns {string} absolute path
 */
function requireInputFile (program) {
  const raw = program.args && program.args[0]
  if (!raw || String(raw).trim() === '') {
    if (typeof program.help === 'function') program.help()
    console.error('Missing input file path.')
    process.exit(1)
  }
  return path.resolve(process.cwd(), String(raw))
}

/**
 * Output path beside the input file: `<dir>/<stem><suffix>`
 * e.g. input /books/a.txt + '_formated.txt' → /books/a_formated.txt
 */
function outputBeside (inputFile, suffix) {
  const dir = path.dirname(inputFile)
  const stem = path.parse(inputFile).name
  return path.join(dir, stem + suffix)
}

/** Basename stem only (no directories) — safe for spliteFile output names. */
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

module.exports = {
  requireInputFile,
  outputBeside,
  inputStem,
  ensureDir,
  exitIfMissing
}
