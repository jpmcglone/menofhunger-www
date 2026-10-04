import { mount } from '@vue/test-utils'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { defineComponent, ref } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useDailyCheckin } from '../composables/useDailyCheckin'

const mocks = vi.hoisted(() => ({ fetch: vi.fn() }))
mockNuxtImport('useApiClient', () => () => ({ apiFetchData: mocks.fetch }))
mockNuxtImport('useAuth', () => () => ({ user: ref({ id: 'checkin-submission-member' }) }))
mockNuxtImport('useEasternMidnightRollover', () => () => ({ dayKey: ref('2026-09-08') }))
afterEach(() => { vi.useRealTimers(); mocks.fetch.mockReset() })

function render() {
  let service!: ReturnType<typeof useDailyCheckin>
  const wrapper = mount(defineComponent({ setup() { service = useDailyCheckin(); return () => null } }))
  return { service, wrapper }
}

describe('check-in submission snapshot', () => {
  it('rejects yesterday’s composer even after state refreshed for the new evening', async () => {
    vi.useFakeTimers().setSystemTime(new Date('2026-09-08T21:00:00Z'))
    const { service, wrapper } = render()
    mocks.fetch.mockResolvedValue({ dayKey: '2026-09-08', prompt: 'New question', crew: null })
    await service.refresh()
    await expect(service.create({ body: 'Answer to the old question', visibility: 'verifiedOnly',
      prompt: 'Old question', dayKey: '2026-09-07' })).rejects.toThrow('prompt has changed')
    expect(mocks.fetch.mock.calls.every(([, init]) => init.method === 'GET')).toBe(true)
    wrapper.unmount()
  })

  it('rejects a submission at midnight without contacting the API', async () => {
    vi.useFakeTimers().setSystemTime(new Date('2026-09-08T04:00:00Z'))
    const { service, wrapper } = render()
    await expect(service.create({ body: 'Answer', visibility: 'verifiedOnly',
      prompt: 'Old question', dayKey: '2026-09-07' })).rejects.toThrow('Check-ins open at 5pm ET')
    expect(mocks.fetch).not.toHaveBeenCalled()
    wrapper.unmount()
  })
})
