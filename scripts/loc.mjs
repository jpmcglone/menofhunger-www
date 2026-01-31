import { readdir, readFile, stat } from 'node:fs/promises'
import path from 'node:path'

const ROOT = process.cwd()

const DEFAULT_EXTS = new Set([
  '.vue',
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.css',
  '.scss',
])

const DEFAULT_IGNORE_DIRS = new Set([
  '.git',
  '.nuxt',
  '.output',
  '.vercel',
  'dist',
  'build',
  'coverage',
  'node_modules',
])

function parseArgs(argv) {
  const out = { top: 100, exts: DEFAULT_EXTS, json: false }
  for (const a of argv) {
    if (a === '--json') out.json = true
    else if (a.startsWith('--top=')) out.top = Math.max(1, Number.parseInt(a.slice(6), 10) || 100)
    else if (a.startsWith('--ext=')) {
      const xs = a
        .slice(6)
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .map((s) => (s.startsWith('.') ? s : `.${s}`))
      out.exts = new Set(xs)
    }
  }
  return out
}

function stripHtmlComments(input) {
  // Simple and safe enough for our Vue templates.
  return input.replace(/<!--[\s\S]*?-->/g, '')
}

function stripBlockCommentsCssLike(input) {
  // CSS-style block comments: /* ... */
  let out = ''
  let i = 0
  let inStr = null // "'" | '"'
  while (i < input.length) {
    const c = input[i]
    const n = input[i + 1]

    if (inStr) {
      out += c
      if (c === '\\' && i + 1 < input.length) {
        out += input[i + 1]
        i += 2
        continue
      }
      if (c === inStr) inStr = null
      i += 1
      continue
    }

    if (c === '"' || c === "'") {
      inStr = c
      out += c
      i += 1
      continue
    }

    if (c === '/' && n === '*') {
      // consume until */
      i += 2
      while (i < input.length && !(input[i] === '*' && input[i + 1] === '/')) i += 1
      i += 2
      continue
    }

    out += c
    i += 1
  }
  return out
}

function stripJsTsComments(input) {
  // Removes // and /* */ while preserving strings/template literals.
  // Not a full parser, but good enough for LOC reporting.
  let out = ''
  let i = 0
  let inStr = null // "'" | '"' | '`'
  while (i < input.length) {
    const c = input[i]
    const n = input[i + 1]

    if (inStr) {
      out += c
      if (c === '\\' && i + 1 < input.length) {
        out += input[i + 1]
        i += 2
        continue
      }
      if (inStr === '`' && c === '$' && n === '{') {
        // keep template interpolation opener; we won't parse inside, but it avoids deleting braces.
        out += n
        i += 2
        continue
      }
      if (c === inStr) inStr = null
      i += 1
      continue
    }

    if (c === '"' || c === "'" || c === '`') {
      inStr = c
      out += c
      i += 1
      continue
    }

    // line comment
    if (c === '/' && n === '/') {
      // consume until newline, keep newline
      i += 2
      while (i < input.length && input[i] !== '\n') i += 1
      continue
    }

    // block comment
    if (c === '/' && n === '*') {
      i += 2
      while (i < input.length && !(input[i] === '*' && input[i + 1] === '/')) i += 1
      i += 2
      continue
    }

    out += c
    i += 1
  }

  return out
}

function countNonEmptyLines(input) {
  return input
    .split(/\r?\n/g)
    .map((l) => l.trim())
    .filter((l) => l.length > 0).length
}

function extractSfcBlocks(text, tag) {
  const re = new RegExp(`<${tag}(\\s[^>]*)?>[\\s\\S]*?<\\/${tag}>`, 'gi')
  const blocks = []
  for (const m of text.matchAll(re)) {
    const raw = m[0] ?? ''
    const inner = raw.replace(new RegExp(`^<${tag}(\\s[^>]*)?>`, 'i'), '').replace(new RegExp(`<\\/${tag}>$`, 'i'), '')
    blocks.push(inner)
  }
  return blocks
}

function locForFile(ext, text) {
  if (ext === '.vue') {
    const templates = extractSfcBlocks(text, 'template').map(stripHtmlComments)
    const scripts = extractSfcBlocks(text, 'script').map(stripJsTsComments)
    const styles = extractSfcBlocks(text, 'style').map(stripBlockCommentsCssLike)
    const combined = [...templates, ...scripts, ...styles].join('\n')
    return countNonEmptyLines(combined)
  }
  if (ext === '.css' || ext === '.scss') return countNonEmptyLines(stripBlockCommentsCssLike(text))
  // default to JS/TS-like
  return countNonEmptyLines(stripJsTsComments(text))
}

async function walk(dir, exts, ignoreDirs) {
  const out = []
  const entries = await readdir(dir, { withFileTypes: true })
  for (const ent of entries) {
    const abs = path.join(dir, ent.name)
    if (ent.isDirectory()) {
      if (ignoreDirs.has(ent.name)) continue
      out.push(...(await walk(abs, exts, ignoreDirs)))
      continue
    }
    if (!ent.isFile()) continue
    const ext = path.extname(ent.name).toLowerCase()
    if (!exts.has(ext)) continue
    out.push(abs)
  }
  return out
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const files = await walk(ROOT, args.exts, DEFAULT_IGNORE_DIRS)

  const results = []
  let total = 0

  for (const f of files) {
    let txt = ''
    try {
      // Skip huge files (generated) defensively.
      const s = await stat(f)
      if (s.size > 2_000_000) continue
      txt = await readFile(f, 'utf8')
    } catch {
      continue
    }
    const ext = path.extname(f).toLowerCase()
    const loc = locForFile(ext, txt)
    if (!loc) continue
    total += loc
    results.push({ file: path.relative(ROOT, f), loc })
  }

  results.sort((a, b) => b.loc - a.loc || a.file.localeCompare(b.file))

  const top = results.slice(0, args.top)

  if (args.json) {
    process.stdout.write(JSON.stringify({ totalLoc: total, files: results }, null, 2) + '\n')
    return
  }

  const pad = (n, w) => String(n).padStart(w, ' ')
  const maxLocDigits = Math.max(3, ...top.map((r) => String(r.loc).length))
  console.log(`\nLOC (non-empty, comments removed) — ${results.length} files, total ${total}\n`)
  for (const r of top) {
    console.log(`${pad(r.loc, maxLocDigits)}  ${r.file}`)
  }
  if (results.length > top.length) console.log(`\n… ${results.length - top.length} more\n`)
}

await main()

