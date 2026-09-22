import { beforeEach, describe, expect, it } from 'vitest'
import {
  forgetSessionIdentity,
  loadSessionIdentity,
  rememberSessionIdentity,
  sessionIdentityLabel,
} from '~/utils/session-identity-preview'

describe('session identity preview', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('prefers a name, then a username, then a generic label', () => {
    expect(sessionIdentityLabel('  Jack McGlone  ', 'jack')).toBe('Jack McGlone')
    expect(sessionIdentityLabel('   ', 'jack')).toBe('jack')
    expect(sessionIdentityLabel(null, '  ')).toBe('your account')
  })

  it('round-trips the last signed-in avatar and clears it on logout', () => {
    rememberSessionIdentity({
      name: 'Jack McGlone',
      username: 'jack',
      avatarUrl: ' https://cdn.example.com/jack.jpg ',
      isOrganization: false,
    })
    expect(loadSessionIdentity()).toEqual({
      label: 'Jack McGlone',
      name: 'Jack McGlone',
      avatarUrl: 'https://cdn.example.com/jack.jpg',
      isOrganization: false,
    })
    forgetSessionIdentity()
    expect(loadSessionIdentity()).toBeNull()
  })

  it('ignores a corrupt stored preview', () => {
    localStorage.setItem('moh.sessionIdentityPreview', '{')
    expect(loadSessionIdentity()).toBeNull()
  })
})
