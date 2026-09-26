import { describe, expect, it } from 'vitest'
import { pollIsIncomplete } from '~/utils/composer-poll'

describe('pollIsIncomplete', () => {
  it('blocks a poll with fewer than two filled options', () => {
    expect(pollIsIncomplete({ options: [{ text: '' }, { text: '  ' }] })).toBe(true)
    expect(pollIsIncomplete({ options: [{ text: 'Yes' }, { text: '' }] })).toBe(true)
  })

  it('allows complete polls, image options, and no poll', () => {
    expect(pollIsIncomplete({ options: [{ text: 'Yes' }, { text: 'No' }] })).toBe(false)
    expect(pollIsIncomplete({ options: [{ text: '' , image: { key: 'a' } }, { text: 'No' }] })).toBe(false)
    expect(pollIsIncomplete(null)).toBe(false)
  })
})
