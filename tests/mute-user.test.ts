import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { mount } from '@vue/test-utils'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { defineComponent, nextTick, ref } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useMuteUser } from '../composables/useMuteUser'

const muteSpies = vi.hoisted(() => ({ fetch: vi.fn(), push: vi.fn(), pushError: vi.fn() }))
mockNuxtImport('useApiClient', () => () => ({
  apiFetch: (...args: unknown[]) => muteSpies.fetch(...args),
}))
mockNuxtImport('useAppToast', () => () => ({
  push: (...args: unknown[]) => muteSpies.push(...args),
  pushError: (...args: unknown[]) => muteSpies.pushError(...args),
}))

let wrapper: ReturnType<typeof mount> | null = null

beforeEach(() => {
  muteSpies.fetch.mockReset()
  muteSpies.fetch.mockResolvedValue({ data: {} })
  muteSpies.push.mockReset()
  muteSpies.pushError.mockReset()
})
afterEach(() => {
  wrapper?.unmount()
  wrapper = null
})

function render(initialMuted = false) {
  const initial = ref<boolean | undefined>(initialMuted)
  let service!: ReturnType<typeof useMuteUser>
  wrapper = mount(defineComponent({
    setup() {
      service = useMuteUser({ userId: ref('user-1'), username: ref('sam'), initialMuted: initial })
      return () => null
    },
  }))
  return { service, initial }
}

describe('useMuteUser', () => {
  it('mutes optimistically and toasts the handle', async () => {
    const { service } = render()
    const pending = service.toggle()
    expect(service.muted.value).toBe(true)
    await pending
    expect(muteSpies.fetch).toHaveBeenCalledWith('/mutes', { method: 'POST', body: { user_id: 'user-1' } })
    expect(service.muted.value).toBe(true)
    expect(muteSpies.push).toHaveBeenCalledWith(expect.objectContaining({ title: 'Muted @sam' }))
  })

  it('unmutes with DELETE', async () => {
    const { service } = render(true)
    await service.toggle()
    expect(muteSpies.fetch).toHaveBeenCalledWith('/mutes/user-1', { method: 'DELETE' })
    expect(service.muted.value).toBe(false)
    expect(muteSpies.push).toHaveBeenCalledWith(expect.objectContaining({ title: 'Unmuted @sam' }))
  })

  it('rolls back and reports the error when the request fails', async () => {
    muteSpies.fetch.mockReset()
    muteSpies.fetch.mockRejectedValueOnce(new Error('nope'))
    const { service } = render()
    await service.toggle()
    expect(service.muted.value).toBe(false)
    expect(muteSpies.push).not.toHaveBeenCalled()
    expect(muteSpies.pushError).toHaveBeenCalledTimes(1)
  })

  it('ignores a second toggle while a request is in flight', async () => {
    let resolveFetch!: () => void
    muteSpies.fetch.mockReset()
    muteSpies.fetch.mockImplementationOnce(() => new Promise<void>((r) => { resolveFetch = r }))
    const { service } = render()
    const first = service.toggle()
    await service.toggle()
    expect(muteSpies.fetch).toHaveBeenCalledTimes(1)
    resolveFetch()
    await first
    expect(service.muted.value).toBe(true)
  })

  it('follows fresh profile data', async () => {
    const { service, initial } = render()
    initial.value = true
    await nextTick()
    expect(service.muted.value).toBe(true)
  })

  it('is wired into the profile menu next to Block', () => {
    const header = readFileSync(resolve(process.cwd(), 'components/app/profile/Header.vue'), 'utf8')
    expect(header).toMatch(/useMuteUser\(/)
    expect(header).toMatch(/initialMuted: computed\(\(\) => profile\.value\?\.viewerHasMutedUser\)/)
    const muteItem = header.indexOf('command: () => void toggleMuteProfile()')
    expect(muteItem).toBeGreaterThan(-1)
    expect(muteItem).toBeLessThan(header.indexOf('command: () => openBlockConfirm()'))
  })
})
