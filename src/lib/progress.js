'use strict'

/**
 * stderr progress helper for long epubbuild runs.
 * @param {{ quiet?: boolean, verbose?: boolean }} opts
 */
function createProgress (opts = {}) {
  const quiet = !!opts.quiet
  const verbose = !!opts.verbose
  const t0 = Date.now()
  let lastWrite = 0

  function elapsed () {
    return ((Date.now() - t0) / 1000).toFixed(1) + 's'
  }

  function phase (name, detail) {
    if (quiet) return
    const extra = detail ? ' ' + detail : ''
    console.error('[epubbuild] ' + name + extra + '  (' + elapsed() + ')')
  }

  /**
   * @param {string} name
   * @param {number} current
   * @param {number} total
   * @param {{ force?: boolean }} [o]
   */
  function tick (name, current, total, o = {}) {
    if (quiet) return
    const now = Date.now()
    const done = total > 0 && current >= total
    const minInterval = verbose ? 50 : 250
    if (!o.force && !done && now - lastWrite < minInterval) return
    lastWrite = now
    const pct = total > 0 ? Math.min(100, Math.floor((100 * current) / total)) : 0
    const line = '[epubbuild] ' + name + ': ' + current + '/' + total + ' (' + pct + '%)  ' + elapsed()
    if (process.stderr.isTTY) {
      process.stderr.write('\r' + line + '   ')
      if (done) process.stderr.write('\n')
    } else if (done || verbose || current === 0) {
      console.error(line)
    }
  }

  function info (msg) {
    if (quiet) return
    if (verbose) console.error('[epubbuild] ' + msg)
  }

  function summary (parts) {
    if (quiet) {
      // still print final path if provided
      if (parts && parts.outPath) console.log(parts.outPath)
      return
    }
    console.error('[epubbuild] done in ' + elapsed() +
      (parts && parts.chapters != null ? ' | chapters=' + parts.chapters : '') +
      (parts && parts.bytes != null ? ' | out=' + formatBytes(parts.bytes) : ''))
  }

  return { phase, tick, info, summary, elapsed, quiet, verbose }
}

function formatBytes (n) {
  if (n < 1024) return n + ' B'
  if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB'
  return (n / (1024 * 1024)).toFixed(2) + ' MB'
}

module.exports = {
  createProgress,
  formatBytes
}
