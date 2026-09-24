#!/usr/bin/env node
/**
 * Fails when app or config code reads `process.env.NAME` that env.example does not document.
 * Commented-out entries (`# NAME=`) count as documented. Nuxt also maps NUXT_* variables onto
 * runtimeConfig implicitly, so documented-but-unread entries are not reported.
 *
 * Usage: node scripts/check-env-docs.mjs
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const SKIP_DIRS = new Set(['node_modules', '.nuxt', '.output', '.data', 'dist', 'coverage', 'scripts', 'tests', 'test', 'public'])
const SOURCE = /\.(?:[cm]?[jt]s|vue)$/
const TEST = /\.(?:test|spec)\.[cm]?[jt]s$/
const READ = /\bprocess\.env\.([A-Z][A-Z0-9_]+)|\bprocess\.env\[\s*'([A-Z][A-Z0-9_]+)'\s*\]/g
const RUNTIME = new Set(['NODE_ENV'])

function* sourceFiles(dir) {
  for (const entry of readdirSync(dir)) {
    if (entry.startsWith('.') && entry !== '.') continue
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) {
      if (!SKIP_DIRS.has(entry)) yield* sourceFiles(path)
    } else if (SOURCE.test(entry) && !TEST.test(entry)) yield path
  }
}

const read = new Map()
for (const file of sourceFiles(ROOT)) {
  for (const match of readFileSync(file, 'utf8').matchAll(READ)) {
    const name = match[1] ?? match[2]
    if (!RUNTIME.has(name) && !read.has(name)) read.set(name, relative(ROOT, file))
  }
}

const documented = new Set(
  [...readFileSync(join(ROOT, 'env.example'), 'utf8').matchAll(/^#?\s*([A-Z][A-Z0-9_]+)=/gm)].map((m) => m[1]),
)
const missing = [...read].filter(([name]) => !documented.has(name)).sort(([a], [b]) => a.localeCompare(b))

for (const [name, file] of missing) console.error(`env.example is missing ${name} (read in ${file})`)
if (missing.length) {
  console.error('Document each variable in env.example (commented out when optional).')
  process.exit(1)
}
console.log(`env.example documents all ${read.size} variables read through process.env.`)
