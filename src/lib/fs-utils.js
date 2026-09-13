'use strict'

const fs = require('fs')
const path = require('path')

/** Remove a single file if it exists (like `rm -f`). */
function rmFile (filePath) {
  fs.rmSync(filePath, { force: true })
}

/**
 * Remove matching files under a directory (non-recursive).
 * @param {string} dir
 * @param {(name: string) => boolean} match
 */
function rmFiles (dir, match) {
  if (!fs.existsSync(dir)) return
  for (const name of fs.readdirSync(dir)) {
    if (!match(name)) continue
    const full = path.join(dir, name)
    try {
      if (fs.statSync(full).isFile()) fs.unlinkSync(full)
    } catch (err) {
      // ignore race / permission on individual files
      if (err && err.code !== 'ENOENT') throw err
    }
  }
}

/** Count immediate children (files + dirs), like non-empty check for `ls -A | wc -l`. */
function countChildren (dir) {
  if (!fs.existsSync(dir)) return 0
  return fs.readdirSync(dir).length
}

module.exports = {
  rmFile,
  rmFiles,
  countChildren
}
