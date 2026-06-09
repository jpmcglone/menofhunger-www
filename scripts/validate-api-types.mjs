#!/usr/bin/env node
/**
 * API contract drift gate (www side).
 *
 * The contract pipeline:
 *   1. The API repo generates `types/api-contracts.gen.ts` from its DTO
 *      sources (`npm run emit:contracts` in menofhunger-api). API CI fails if
 *      the committed file differs from a fresh emit.
 *   2. `types/api-contract-check.ts` statically asserts (via `Satisfies<>`)
 *      that every generated DTO is assignable to its hand-maintained mirror in
 *      `types/api.ts`. That check runs as part of `npx nuxi typecheck`.
 *
 * This script validates the pipeline's wiring (cheap, no TS compile):
 *   - the generated contracts file exists and contains the core DTOs
 *   - the contract-check file exists and still asserts the core types
 *     (so the gate can't be silently deleted)
 *
 * Run from menofhunger-www root: node scripts/validate-api-types.mjs
 */

import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const genPath = join(__dirname, '..', 'types', 'api-contracts.gen.ts')
const checkPath = join(__dirname, '..', 'types', 'api-contract-check.ts')

let failed = false

function fail(msg) {
  console.error(`validate-api-types: ${msg}`)
  failed = true
}

// ── 1. Generated contracts file ─────────────────────────────────────────────
if (!existsSync(genPath)) {
  fail('types/api-contracts.gen.ts is missing — run `npm run emit:contracts` in menofhunger-api')
} else {
  const gen = readFileSync(genPath, 'utf8')
  const requiredGenTypes = [
    'PostDto',
    'PostAuthorDto',
    'PostMediaDto',
    'PublicProfileDto',
    'NotificationDto',
    'MessageDto',
    'MessageConversationDto',
    'BillingMeDto',
    'UserDto',
    'NotificationKind',
    'PostVisibility',
  ]
  for (const name of requiredGenTypes) {
    if (!new RegExp(`export type ${name}\\b`).test(gen)) {
      fail(`generated contracts file is missing "export type ${name}" — re-run \`npm run emit:contracts\` in menofhunger-api`)
    }
  }
}

// ── 2. Contract-check file (the actual structural gate) ─────────────────────
if (!existsSync(checkPath)) {
  fail('types/api-contract-check.ts is missing — the structural drift gate has been deleted')
} else {
  const check = readFileSync(checkPath, 'utf8')
  if (!check.includes('Satisfies<')) {
    fail('types/api-contract-check.ts no longer contains Satisfies<> assertions')
  }
  const requiredAssertions = [
    'Api.PostDto',
    'Api.PublicProfileDto',
    'Api.NotificationDto',
    'Api.MessageDto',
    'Api.BillingMeDto',
  ]
  for (const ref of requiredAssertions) {
    if (!check.includes(ref)) {
      fail(`types/api-contract-check.ts no longer asserts against ${ref}`)
    }
  }
}

if (failed) process.exit(1)
console.log('API contract gate wiring OK (structural check runs in `nuxi typecheck`)')
