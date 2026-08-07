import { describe, expect, it } from 'vitest'
import { excludeFollowSuggestions } from '~/composables/useWhoToFollow'

describe('who-to-follow section dedupe', () => {
  it('excludes every arena user from more suggestions while preserving order', () => {
    const suggestions = [
      { id: 'shared', name: 'Shared' },
      { id: 'first-unique', name: 'First unique' },
      { id: 'second-arena', name: 'Second arena' },
      { id: 'second-unique', name: 'Second unique' },
    ]
    const arenaUsers = [{ id: 'shared' }, { id: 'second-arena' }]

    expect(excludeFollowSuggestions(suggestions, arenaUsers)).toEqual([
      { id: 'first-unique', name: 'First unique' },
      { id: 'second-unique', name: 'Second unique' },
    ])
  })
})
