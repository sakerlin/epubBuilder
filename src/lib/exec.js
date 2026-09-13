'use strict'

const { exec: execCb } = require('child_process')
const { promisify } = require('util')

/** Promisified `child_process.exec` (stdout/stderr shape matches child-process-promise). */
const exec = promisify(execCb)

module.exports = { exec }
