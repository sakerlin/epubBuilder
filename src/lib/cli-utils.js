'use strict'

const fs = require('fs')
const path = require('path')
const { Command } = require('commander')

/**
 * Parse a single required file argument (Commander v12+).
 * @param {string} name CLI name
 * @param {string} [version]
 * @returns {{ program: import('commander').Command, inputFile: string }}
 */
function parseFileProgram (name, version = '0.0.1') {
  const program = new Command()
  program
    .name(name)
    .version(version)
    .argument('<fileName>', 'input text file path')
    .showHelpAfterError()
    .parse(process.argv)

  const raw = program.args[0]
  const inputFile = path.resolve(process.cwd(), String(raw))
  return { program, inputFile }
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
  exitIfMissing
}
