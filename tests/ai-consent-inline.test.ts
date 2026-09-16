import { defineComponent, nextTick } from 'vue'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Notice from '~/components/app/AiConsentNotice.vue'
import { useAiConsent } from '~/composables/useAiConsent'

const { save } = vi.hoisted(() => ({ save: vi.fn() }))
mockNuxtImport('useApiClient', () => () => ({ apiFetchData: save }))

describe('inline Marv permission', () => {
  let consent: ReturnType<typeof useAiConsent>
  let view: Awaited<ReturnType<typeof mountSuspended>>
  let host: HTMLDivElement
  beforeEach(async () => {
    save.mockReset().mockResolvedValue({})
    host = document.createElement('div')
    host.id = 'permission-test-host'
    host.dataset.marvPermissionHost = ''
    host.checkVisibility = () => true
    document.body.append(host)
    view = await mountSuspended(defineComponent({ components: { Notice }, setup() { consent = useAiConsent(); consent.finish(false); return {} }, template: '<Notice />' }), {
      global: { stubs: { AppActionButton: { props: ['label', 'disabled', 'loading'], template: '<button :disabled="disabled || loading">{{ label }}</button>' } } },
    })
  })
  afterEach(() => { consent.finish(false); view.unmount(); host.remove() })
  it('places permission in the existing surface and saves only after enabling', async () => {
    const request = consent.request()
    await nextTick()
    expect(host.querySelector('[aria-label="Enable Marv"]')).not.toBeNull()
    expect(host.querySelector('[role="dialog"]')).toBeNull()
    expect(save).not.toHaveBeenCalled()
    ;(host.querySelector('button') as HTMLButtonElement).click()
    expect(await request).toBe(true)
    expect(save).toHaveBeenCalledWith('/marvin/me/preferences', { method: 'PATCH', body: { aiConsent: true } })
  })
  it('keeps permission off on decline', async () => {
    const request = consent.request()
    await nextTick()
    ;(host.querySelectorAll('button')[1] as HTMLButtonElement).click()
    expect(await request).toBe(false)
    expect(save).not.toHaveBeenCalled()
  })
})
