#!/usr/bin/env node
'use strict'

const OpenCC = require('opencc-js')
const fs = require('fs')
const chardet = require('chardet')
const iconv = require('iconv-lite')
const {
  parseFileProgram,
  outputBeside,
  exitIfMissing
} = require('./lib/cli-utils')

const { inputFile: file } = parseFileProgram('convFile')
exitIfMissing(file)

function resolveGbEncoding (buf) {
  const analysed = typeof chardet.analyse === 'function' ? chardet.analyse(buf) : []
  const hit = (analysed || []).find((m) => {
    const name = String((m && (m.name || m.encoding)) || '').toUpperCase()
    return name === 'GB18030' || name === 'GBK' || name === 'GB2312'
  })
  if (hit) return String(hit.name || hit.encoding).toUpperCase()

  const detected = chardet.detect(buf)
  const enc = typeof detected === 'string' ? detected : (detected && detected.encoding)
  if (enc) {
    const u = String(enc).toUpperCase()
    if (u === 'GB18030' || u === 'GBK' || u === 'GB2312') return u
  }
  return null
}

const raw = fs.readFileSync(file)
const encoding = resolveGbEncoding(raw)
const ouputFileName = outputBeside(file, '_CHT.txt')

if (!encoding) {
  // Short files often mis-detect; allow explicit override later. For now try GBK if high byte density.
  const high = raw.filter((b) => b >= 0x80).length
  const ratio = raw.length ? high / raw.length : 0
  if (ratio < 0.1) {
    console.error(file + ' is not a GBK/GB18030 encoded file (chardet found no GB* match)')
    process.exit(1)
  }
  console.warn('chardet did not report GB*; falling back to GBK decode (high-byte ratio ' + ratio.toFixed(2) + ')')
}

const decoded = iconv.decode(raw, 'gbk')
console.log('decode gbk (detected: ' + (encoding || 'fallback-GBK') + ')')

const converter = OpenCC.Converter({ from: 'cn', to: 'tw' })
const text = converter(decoded)

fs.writeFileSync(ouputFileName, text)
console.log('wrote', ouputFileName)
