import { contractFixtures } from './fixtures/api-contracts.gen'
import { defineComponent } from 'vue'
import { mount } from '@vue/test-utils'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useDeleteAccount } from '~/composables/settings/useDeleteAccount'

const deletionSpies = vi.hoisted(() => ({ fetch: vi.fn(), logout: vi.fn(), navigate: vi.fn(), clear: vi.fn(), presence: vi.fn() }))
vi.mock('~/composables/useApiClient', () => ({ useApiClient: () => ({ apiFetchData: deletionSpies.fetch }), clearMohCacheAll: vi.fn() }))
vi.mock('~/composables/usePresence', () => ({ usePresence: () => ({ emitLogout: deletionSpies.presence }) }))
vi.mock('~/composables/usePushNotifications', () => ({ usePushNotifications: () => ({ onLogout: deletionSpies.logout }) }))
mockNuxtImport('navigateTo', () => deletionSpies.navigate)
vi.mock('~/composables/auth/authState', () => ({ clearAuthClientState: deletionSpies.clear }))
function render() {
  let service!: ReturnType<typeof useDeleteAccount>
  const view = mount(defineComponent({ setup() { service = useDeleteAccount(); return () => null } }))
  return { service, view }
}
beforeEach(() => { vi.clearAllMocks(); deletionSpies.logout.mockResolvedValue(undefined) })
describe('account deletion confirmation', () => {
  it.each(['offline', 'negative', 'missing receipt'])('keeps local account state when the response is %s', async (kind) => {
    if (kind === 'offline') deletionSpies.fetch.mockRejectedValue(new Error('Failed to fetch'))
    else deletionSpies.fetch.mockResolvedValue(kind === 'negative' ? { success: false } : { success: true, deletionScheduledAt: '2026-10-16T00:00:00Z' })
    const { service, view } = render()
    await service.deleteAccount({})
    expect(service.error.value).toBeTruthy()
    expect(deletionSpies.logout).not.toHaveBeenCalled()
    expect(deletionSpies.clear).not.toHaveBeenCalled()
    expect(deletionSpies.navigate).not.toHaveBeenCalled()
    view.unmount()
  })
  it('shows the private receipt only after confirmed scheduling', async () => {
    deletionSpies.fetch.mockResolvedValue(contractFixtures.deletion)
    const { service, view } = render()
    await service.deleteAccount({})
    expect(service.error.value).toBeNull()
    expect(deletionSpies.logout).toHaveBeenCalledTimes(1)
    expect(deletionSpies.clear).toHaveBeenCalledTimes(1)
    expect(deletionSpies.navigate).toHaveBeenCalledWith('/deletion-status#11111111-1111-4111-8111-111111111111', { replace: true })
    view.unmount()
  })
})
