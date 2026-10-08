import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { useAsyncAction } from '../composables/useAsyncAction'

const pushed: Array<Record<string, unknown>> = []
mockNuxtImport('useAppToast', () => () => ({ push: (t: Record<string, unknown>) => { pushed.push(t) } }))

beforeEach(() => { pushed.length = 0 })

describe('useAsyncAction', () => {
  it('returns the result and tracks pending', async () => {
    const { run, pending } = useAsyncAction()
    const p = run(async () => 7)
    expect(pending.value).toBe(true)
    expect(await p).toBe(7)
    expect(pending.value).toBe(false)
    expect(pushed).toEqual([])
  })

  it('pushes an error toast with the fallback, tone, and duration', async () => {
    const { run, error } = useAsyncAction()
    const result = await run(async () => { throw new Error('https://api.example.com/v1/x failed') }, { error: 'Nope.', durationMs: 1800 })
    expect(result).toBeUndefined()
    expect(error.value).toBeInstanceOf(Error)
    expect(pushed).toEqual([{ title: 'Nope.', tone: 'error', durationMs: 1800 }])
  })

  it('prefers the friendly API message and lets a function pick the exact title', async () => {
    const { run } = useAsyncAction()
    const apiError = { data: { meta: { errors: [{ message: 'Already voted' }] } } }
    await run(async () => { throw apiError }, { error: 'fallback' })
    await run(async () => { throw apiError }, { error: () => 'Fixed title' })
    expect(pushed.map((t) => t.title)).toEqual(['Already voted', 'Fixed title'])
  })

  it('rolls back before the toast and supports silent mode', async () => {
    const order: string[] = []
    const { run } = useAsyncAction()
    await run(async () => { throw new Error('x') }, { rollback: () => order.push('rollback'), onError: () => order.push('onError') })
    expect(order).toEqual(['rollback', 'onError'])
    expect(pushed).toHaveLength(1)
    await run(async () => { throw new Error('x') }, { silent: true })
    expect(pushed).toHaveLength(1)
    expect(vi.isMockFunction(run)).toBe(false)
  })
})
