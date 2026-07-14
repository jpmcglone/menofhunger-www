import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const source = readFileSync(resolve(process.cwd(), 'pages/notifications.vue'), 'utf8')

describe('notification entry highlights', () => {
  it('pins the badge-count rows before clearing the delivery badge', () => {
    const syncStart = source.indexOf('function syncNotificationsOnEntry()')
    const syncEnd = source.indexOf('onMounted(() =>', syncStart)
    const sync = source.slice(syncStart, syncEnd)

    expect(sync).toContain('const badgeCountAtEntry = notifBadge.count.value')
    expect(sync).toContain('pinEntryHighlights(badgeCountAtEntry)')
    expect(sync).toContain('markDeliveredInBackground(true)')
    expect(sync.indexOf('await setKind(kind)')).toBeLessThan(
      sync.indexOf('pinEntryHighlights(badgeCountAtEntry)'),
    )
    expect(sync.indexOf('pinEntryHighlights(badgeCountAtEntry)')).toBeLessThan(
      sync.indexOf('markDeliveredInBackground(true)'),
    )
  })

  it('keeps pinned highlights until interaction or mark-all-read', () => {
    expect(source).toContain(':highlight="stickyHighlightedItemKeys.has(itemKey(item))"')
    expect(source).toContain('nextHighlights.delete(itemKey(item))')
    expect(source).toContain('stickyHighlightedItemKeys.value = new Set()')
  })
})
