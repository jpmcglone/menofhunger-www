import { defineComponent, nextTick } from 'vue'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { beforeEach, describe, expect, it } from 'vitest'
import { firstPostPromptKey, firstPostStarter, useFirstPostPrompt } from '~/composables/useFirstPostPrompt'
import type { AuthUser } from '~/composables/useAuth'

const onboarded = { usernameIsSet: true, birthdate: '1990-01-01', interests: ['faith'], menOnlyConfirmed: true }

async function harness() {
  let prompt!: ReturnType<typeof useFirstPostPrompt>
  const view = await mountSuspended(defineComponent({ setup() { prompt = useFirstPostPrompt(); return () => null } }))
  return { prompt, view }
}

describe('first post prompt', () => {
  beforeEach(() => localStorage.clear())

  it('starts the post with the member’s first name', () => {
    expect(firstPostStarter('John McGlone')).toBe('I’m John, and I’m here because ')
    expect(firstPostStarter('  ')).toBe('I’m here because ')
    expect(firstPostStarter(null)).toBe('I’m here because ')
  })

  it('offers once to a verified member with no posts, and stays dismissed', async () => {
    const user = useState<AuthUser | null>('auth-user')
    user.value = { id: 'u1', name: 'John', verifiedStatus: 'none', postCount: 0, ...onboarded } as AuthUser
    const { prompt, view } = await harness()
    expect(prompt.eligible.value).toBe(false)

    user.value = { ...user.value, verifiedStatus: 'identity' }
    await nextTick()
    expect(prompt.eligible.value).toBe(true)
    expect(prompt.starter.value).toBe('I’m John, and I’m here because ')

    prompt.markSeen()
    expect(prompt.eligible.value).toBe(false)
    expect(localStorage.getItem(firstPostPromptKey('u1'))).toBe('1')
    view.unmount()

    const again = await harness()
    expect(again.prompt.eligible.value).toBe(false)
    again.view.unmount()
  })

  it('stays quiet for members who already posted', async () => {
    const user = useState<AuthUser | null>('auth-user')
    user.value = { id: 'u2', name: 'Sam', verifiedStatus: 'manual', postCount: 3, ...onboarded } as AuthUser
    const { prompt, view } = await harness()
    expect(prompt.eligible.value).toBe(false)
    view.unmount()
  })
})
