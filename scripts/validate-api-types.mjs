#!/usr/bin/env node
/**
 * Validates that key types in types/api.ts have expected properties.
 * Run from menofhunger-www root: node scripts/validate-api-types.mjs
 * Exits 1 if a required property is missing from a type block.
 */

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const typesPath = join(__dirname, '..', 'types', 'api.ts')
const content = readFileSync(typesPath, 'utf8')

/** For each type name, list required property names that must appear in its type block. */
const REQUIRED = {
  FeedPost: ['id', 'author', 'media', 'visibility', 'createdAt', 'body', 'boostCount', 'bookmarkCount'],
  PostAuthor: ['id', 'username', 'name', 'premium', 'verifiedStatus', 'avatarUrl'],
  PostMedia: ['id', 'kind', 'source', 'url'],
  ApiEnvelope: ['data'],
  ApiPagination: ['nextCursor'],
  SearchBookmarkItem: ['bookmarkId', 'post', 'collectionIds'],
}

function extractTypeBlock(name) {
  const re = new RegExp(`(export\\s+)?type\\s+${name}\\s*(<[^>]*>)?\\s*=\\s*\\{`)
  const match = content.match(re)
  if (!match) return null
  const start = match.index + match[0].length
  let depth = 1
  let i = start
  while (i < content.length && depth > 0) {
    const c = content[i]
    if (c === '{') depth++
    else if (c === '}') depth--
    i++
  }
  return content.slice(start, i - 1)
}

let failed = false
for (const [typeName, props] of Object.entries(REQUIRED)) {
  const block = extractTypeBlock(typeName)
  if (!block) {
    console.error(`validate-api-types: type "${typeName}" not found in types/api.ts`)
    failed = true
    continue
  }
  for (const prop of props) {
    const hasProp =
      block.includes(prop + ':') ||
      block.includes(prop + '?') ||
      block.includes(prop + ' :') ||
      new RegExp(`\\b${prop}\\s*[?:]`).test(block)
    if (!hasProp) {
      console.error(`validate-api-types: type "${typeName}" is missing expected property "${prop}"`)
      failed = true
    }
  }
}

if (failed) process.exit(1)
console.log('API types validation OK')
