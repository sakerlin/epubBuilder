'use strict'

const CN_NUM = '[零一二兩三四五六七八九十百千两兩\\d]+'

/**
 * @param {string} raw
 * @param {1|2} level
 * @param {'short'|'full'|'arc'} [style]
 */
function displayTitle (raw, level, style = 'short') {
  const s = String(raw || '').replace(/\s+/g, ' ').trim()
  if (!s) return s
  if (style === 'full') return s

  if (/簡介|简介/.test(s)) {
    const book = s.match(/《([^》]+)》/)
    if (book) return book[1] + '·簡介'
    const parts = s.split(' ').filter(Boolean)
    const name = parts.find((p) => /篇$/.test(p) && !/^第/.test(p))
    if (name) return name + '·簡介'
  }

  const chapMatches = [...s.matchAll(new RegExp('第' + CN_NUM + '[章節]', 'g'))]
  if (chapMatches.length) {
    let startIdx = chapMatches[chapMatches.length - 1].index
    if (chapMatches.length >= 2) {
      const a = chapMatches[chapMatches.length - 2]
      const b = chapMatches[chapMatches.length - 1]
      const between = s.slice(a.index + a[0].length, b.index)
      if (/^\s*[-—–~～至到]+\s*$/.test(between)) {
        startIdx = a.index
      }
    }
    const core = s.slice(startIdx).trim()
    if (style === 'arc') {
      const before = s.slice(0, startIdx)
      const arc = before.match(/([\u4e00-\u9fffA-Za-z0-9]{1,12}篇)\s*$/)
      if (arc) {
        const arcName = arc[1].replace(/篇$/, '')
        return arcName + '·' + core
      }
    }
    return core
  }

  const pianMatches = [...s.matchAll(new RegExp('第' + CN_NUM + '篇', 'g'))]
  if (pianMatches.length >= 2) {
    const last = pianMatches[pianMatches.length - 1]
    return s.slice(last.index).trim()
  }

  if (level === 1) {
    const book = s.match(/《([^》]+)》/)
    if (book) return book[1]
    const parts = s.split(' ').filter(Boolean)
    if (parts.length >= 2 && new RegExp('^第' + CN_NUM + '[篇章卷集冊]$').test(parts[0])) {
      return parts.slice(1).join(' ')
    }
  }

  return s
}

function isChapterLikeHeading (val) {
  const s = String(val || '').trim()
  if (new RegExp('第' + CN_NUM + '[章節]').test(s)) return true
  const pians = s.match(new RegExp('第' + CN_NUM + '篇', 'g')) || []
  return pians.length >= 2
}

module.exports = {
  displayTitle,
  isChapterLikeHeading,
  CN_NUM
}
