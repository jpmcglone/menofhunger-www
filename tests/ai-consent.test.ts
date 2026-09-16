import { defineComponent } from 'vue'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import { useAiConsent } from '~/composables/useAiConsent'

describe('shared AI permission request', () => {
  it('starts off, coalesces requests, and resolves every waiter on decline', async () => {
    let consent!: ReturnType<typeof useAiConsent>
    const view = await mountSuspended(defineComponent({ setup() { consent = useAiConsent(); return () => null } }))
    consent.finish(false)
    expect(consent.visible.value).toBe(false)
    const first = consent.request()
    const second = consent.request()
    expect(first).toBe(second)
    expect(consent.visible.value).toBe(true)
    consent.finish(false)
    expect(await first).toBe(false)
    expect(await second).toBe(false)
    expect(consent.visible.value).toBe(false)
    view.unmount()
  })
})
