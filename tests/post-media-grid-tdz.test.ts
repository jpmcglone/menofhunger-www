import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('PostMediaGrid setup order', () => {
  it('declares items before the watchEffect that reads it', () => {
    const src = readFileSync(
      resolve(process.cwd(), 'components/app/PostMediaGrid.vue'),
      'utf8',
    )
    const itemsDecl = src.indexOf('const items = computed(')
    const watchEffectDecl = src.indexOf('watchEffect((onCleanup) => {')
    expect(itemsDecl).toBeGreaterThan(-1)
    expect(watchEffectDecl).toBeGreaterThan(-1)
    expect(itemsDecl).toBeLessThan(watchEffectDecl)
    expect(src.indexOf('const items = computed(', itemsDecl + 1)).toBe(-1)
  })
})
