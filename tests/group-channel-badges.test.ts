import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const read = (rel: string) => readFileSync(resolve(__dirname, '..', rel), 'utf8')

describe('channels-first group navigation with badges', () => {
  it('lists Channels before Posts and badges both', () => {
    const nav = read('components/app/channels/GroupNavigation.vue')
    expect(nav.indexOf("key: 'channels'")).toBeLessThan(nav.indexOf("key: 'posts'"))
    expect(nav).toContain("tab.key === 'channels'")
    expect(nav).toContain('byGroupId[props.group.id]')
  })

  it('lands on Channels by default for channel-enabled groups only', () => {
    const destinations = read('composables/useGroupDestinations.ts')
    expect(destinations).toContain('if (!group.channelsAvailable) return posts')
    expect(destinations).toContain('/channels`')
  })

  it('keeps channel badges out of the notification bell', () => {
    expect(read('composables/useGroupChannelBadges.ts')).not.toContain('notification')
  })
})
