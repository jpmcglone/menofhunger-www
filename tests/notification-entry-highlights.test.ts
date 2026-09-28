import { effectScope, ref } from 'vue'
import { describe, expect, it } from 'vitest'
import { useNotificationVisitHighlights } from '~/composables/useNotificationVisitHighlights'
import type { Notification, NotificationFeedItem } from '~/types/api'

function row(id: string, readAt: string | null = null, deliveredAt: string | null = null): NotificationFeedItem {
  return { type: 'single', notification: { id, kind: 'followed_post', readAt, deliveredAt } as Notification }
}
function setup() {
  const scope = effectScope()
  const items = ref<NotificationFeedItem[]>([])
  const visit = scope.run(() => useNotificationVisitHighlights(items))!
  return { scope, items, visit }
}

describe('notification visit highlights', () => {
  it('keeps the original unread cue while read and delivered state update immediately', () => {
    const { scope, items, visit } = setup()
    try {
      items.value = [row('post')]
      visit.begin()
      items.value = [row('post', 'read-now', 'seen-now')]
      expect(visit.keys.value.has('single:post')).toBe(true)
      expect((items.value[0] as { notification: Notification }).notification.readAt).toBe('read-now')
      visit.end()
      visit.begin()
      expect(visit.keys.value.size).toBe(0)
    } finally { scope.stop() }
  })

  it('uses unread rows, never unseen counts or list position', () => {
    const { scope, items, visit } = setup()
    try {
      items.value = [row('already-read', 'read', null), row('unread-but-seen', null, 'seen')]
      visit.begin()
      expect([...visit.keys.value]).toEqual(['single:unread-but-seen'])
    } finally { scope.stop() }
  })

  it('captures async rows synchronously before their view acknowledgement', () => {
    const { scope, items, visit } = setup()
    try {
      visit.begin()
      items.value = [row('arrival')]
      items.value = [row('arrival', 'read')]
      expect(visit.keys.value.has('single:arrival')).toBe(true)
      // Filter changes and refreshes are still the same visit.
      items.value = []
      items.value = [row('arrival', 'read'), row('next-page')]
      visit.begin()
      expect([...visit.keys.value]).toEqual(['single:arrival', 'single:next-page'])
    } finally { scope.stop() }
  })

  it('does not pin background arrivals or carry a visit across accounts', () => {
    const { scope, items, visit } = setup()
    try {
      visit.begin()
      items.value = [row('old-account')]
      visit.end()
      items.value = [row('background')]
      items.value = [row('background', 'read-elsewhere')]
      expect(visit.keys.value.size).toBe(0)
      visit.begin()
      expect(visit.keys.value.size).toBe(0)
    } finally { scope.stop() }
  })

  it('explicit mark-all-read clears highlights while future arrivals still highlight', () => {
    const { scope, items, visit } = setup()
    try {
      visit.begin()
      items.value = [row('old')]
      items.value = [row('old', 'read')]
      visit.clear()
      expect(visit.keys.value.size).toBe(0)
      items.value = [row('new'), row('old', 'read')]
      expect([...visit.keys.value]).toEqual(['single:new'])
    } finally { scope.stop() }
  })
})
