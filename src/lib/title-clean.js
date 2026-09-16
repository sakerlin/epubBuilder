'use strict'

const CN_NUM = '[零一二兩三四五六七八九十百千两兩\\d]+'
const RE_CHAP_UNIT = new RegExp('第' + CN_NUM + '[章節]', 'g')
const RE_PIAN_UNIT = new RegExp('第' + CN_NUM + '篇', 'g')

/**
 * Short TOC / spine title from a raw heading line.
 * Examples:
 *  - "第一篇 再見篇 再見篇第二十一章 紈褲" → "第二十一章 紈褲"
 *  - "第七篇 大風篇 大風篇 第十二章" → "第十二章"
 *  - "…第三十一章-第三十二章(大結局)" → "第三十一章-第三十二章(大結局)"
 *  - "第一篇 再見篇 《再見篇》簡介" → "再見篇·簡介"
 *  - "第五篇 厚積篇 厚積篇第六篇" → "第六篇"
 *  - "引子 風花雪月之風" → "引子 風花雪月之風"
 */
function displayTitle (raw, level) {
  const s = String(raw || '').replace(/\s+/g, ' ').trim()
  if (!s) return s

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
    return s.slice(startIdx).trim()
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

/**
 * 篇+第N章 / double 第N篇 → chapter (not volume)
 */
function isChapterLikeHeading (val) {
  const s = String(val || '').trim()
  if (new RegExp('第' + CN_NUM + '[章節]').test(s)) return true
  const pians = s.match(new RegExp('第' + CN_NUM + '篇', 'g')) || []
  return pians.length >= 2
}

module.exports = {
  displayTitle,
  isChapterLikeHeading,
  RE_CHAP_UNIT,
  RE_PIAN_UNIT,
  CN_NUM
}
