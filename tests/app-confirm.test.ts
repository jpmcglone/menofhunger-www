import { describe, expect, it, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { useAppConfirm } from '~/composables/useAppConfirm'

const context = vi.hoisted(() => ({ app: {} }))
mockNuxtImport('useNuxtApp', () => () => context.app)

describe('app confirmation ownership', () => {
  it('shares a dialog within an app and isolates other app requests', async () => {
    context.app = {}
    const first = useAppConfirm()
    expect(useAppConfirm()).toBe(first)
    const pending = first.confirm({ header: 'Private action' })
    context.app = {}
    const second = useAppConfirm()
    expect(second._visible.value).toBe(false)
    expect(second._options.value).toBeNull()
    first._settle(true)
    await expect(pending).resolves.toBe(true)
  })

  it('settles a superseded dialog rather than leaving its caller waiting', async () => {
    context.app = {}
    const dialog = useAppConfirm()
    const first = dialog.confirm({ header: 'First' })
    const second = dialog.confirm({ header: 'Second' })
    await expect(first).resolves.toBe(false)
    expect(dialog._options.value?.header).toBe('Second')
    dialog._settle('discard')
    await expect(second).resolves.toBe('discard')
  })
})
