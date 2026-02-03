#!/usr/bin/env node
/**
 * Production env check: exits 1 if required vars are missing.
 * Run before deploy or in CI (ensure env is loaded, e.g. from .env or Render env).
 * Example: node scripts/check-env.mjs
 */
const missing = []

if (!process.env.NUXT_PUBLIC_API_BASE_URL?.trim()) {
  missing.push('NUXT_PUBLIC_API_BASE_URL')
}

if (missing.length > 0) {
  console.error('Missing required env:', missing.join('; '))
  process.exit(1)
}
console.log('Required env OK')
