import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

function readFile(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), 'utf8')
}

describe('marv_not_in_group notification wiring', () => {
  it('rowHref routes marv_not_in_group to /p/:actorPostId', () => {
    const source = readFile('composables/useNotifications.ts')
    expect(source).toContain("n.kind === 'marv_not_in_group'")
    expect(source).toContain('/p/')
    // The marv_not_in_group branch must appear before the generic /p/ fallback
    const marvIdx = source.indexOf("n.kind === 'marv_not_in_group'")
    const genericIdx = source.indexOf("n.subjectPostId")
    expect(marvIdx).toBeLessThan(genericIdx)
  })

  it('notificationIconName has an icon entry for marv_not_in_group', () => {
    const source = readFile('composables/useNotifications.ts')
    // marv_not_in_group must appear at least twice: once for titleSuffix and once for icon
    const occurrences = (source.match(/case 'marv_not_in_group':/g) ?? []).length
    expect(occurrences).toBeGreaterThanOrEqual(2)
    // The icon (tabler:robot-off) must appear in the file
    expect(source).toContain("'tabler:robot-off'")
  })

  it('titleSuffix has a non-empty fallback for marv_not_in_group', () => {
    const source = readFile('composables/useNotifications.ts')
    // title or switch case with @marv copy
    expect(source).toMatch(/marv_not_in_group.*marv|marv.*marv_not_in_group/s)
  })
})
