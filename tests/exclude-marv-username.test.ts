import { describe, expect, it } from 'vitest'
import { excludeMarvUsername, excludeMarvUsernameStrings } from '../utils/exclude-marv-username'

describe('excludeMarvUsername', () => {
  it('drops Marv from reply-to participant lists', () => {
    const people = [
      { id: '1', username: 'alice' },
      { id: '2', username: 'marv' },
      { id: '3', username: 'bob' },
    ]
    expect(excludeMarvUsername(people).map((p) => p.username)).toEqual(['alice', 'bob'])
    expect(excludeMarvUsername(people, 'MARV').map((p) => p.username)).toEqual(['alice', 'bob'])
  })
})

describe('excludeMarvUsernameStrings', () => {
  it('drops Marv from inherited mention usernames', () => {
    expect(excludeMarvUsernameStrings(['alice', 'marv', 'bob'])).toEqual(['alice', 'bob'])
  })
})
