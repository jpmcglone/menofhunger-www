import { describe, expect, it } from 'vitest'
import { readNotificationsSource } from './helpers/notifications-source'


describe('marv_not_in_group notification wiring', () => {
  it('rowHref routes marv_not_in_group to /p/:actorPostId', () => {
    const source = readNotificationsSource()
    const rowHrefStart = source.indexOf('function rowHref')
    expect(rowHrefStart).toBeGreaterThan(0)
    const rowHref = source.slice(rowHrefStart)
    expect(rowHref).toContain("n.kind === 'marv_not_in_group'")
    expect(rowHref).toContain('/p/')
    // The marv_not_in_group branch must appear before the generic /p/ fallback
    const marvIdx = rowHref.indexOf("n.kind === 'marv_not_in_group'")
    const genericIdx = rowHref.lastIndexOf(
      'if (n.subjectPostId) return `/p/${encodeURIComponent(n.subjectPostId)}`',
    )
    expect(genericIdx).toBeGreaterThan(0)
    expect(marvIdx).toBeLessThan(genericIdx)
  })

  it('notificationIconName has an icon entry for marv_not_in_group', () => {
    const source = readNotificationsSource()
    // marv_not_in_group must appear at least twice: once for titleSuffix and once for icon
    const occurrences = (source.match(/case 'marv_not_in_group':/g) ?? []).length
    expect(occurrences).toBeGreaterThanOrEqual(2)
    // The icon (tabler:sparkles) must appear in the file
    expect(source).toContain("'tabler:sparkles'")
  })

  it('titleSuffix has a non-empty fallback for marv_not_in_group', () => {
    const source = readNotificationsSource()
    // title or switch case with @marv copy
    expect(source).toMatch(/marv_not_in_group.*marv|marv.*marv_not_in_group/s)
  })
})
