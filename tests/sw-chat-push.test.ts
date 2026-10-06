// @vitest-environment node
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { describe, expect, it, vi } from 'vitest'

async function receivePush(path: string | null, options: { focused?: boolean; visibility?: string; kind?: string; test?: boolean } = {}) {
  const listeners = new Map<string, (event: unknown) => void>()
  const showNotification = vi.fn().mockResolvedValue(undefined)
  runInNewContext(readFileSync('public/sw-push.js', 'utf8'), {
    URL, console,
    self: {
      location: new URL('https://menofhunger.com/sw-push.js'),
      addEventListener: (name: string, handler: (event: unknown) => void) => listeners.set(name, handler),
      registration: { showNotification },
      clients: { matchAll: async () => path === null ? [] : [{
        url: `https://menofhunger.com${path}`,
        visibilityState: options.visibility ?? 'visible', focused: options.focused ?? true,
      }] },
    },
  })
  let finished: Promise<unknown> | undefined
  listeners.get('push')!({
    data: { json: () => ({ title: 'New message', kind: options.kind ?? 'message', url: '/chat?c=c1', notificationId: 'n1', test: options.test }) },
    waitUntil: (promise: Promise<unknown>) => { finished = promise },
  })
  await finished
  return showNotification
}

describe('chat push delivery', () => {
  it.each(['/home', '/chat?c=c2', '/chat', null])('shows a message when the focused page is %s', async path => {
    expect(await receivePush(path)).toHaveBeenCalledOnce()
  })
  it('suppresses a message only in its focused conversation', async () => {
    expect(await receivePush('/chat?c=c1&from=push')).not.toHaveBeenCalled()
  })
  it('shows a message when its chat is backgrounded or unfocused', async () => {
    expect(await receivePush('/chat?c=c1', { focused: false })).toHaveBeenCalledOnce()
    expect(await receivePush('/chat?c=c1', { visibility: 'hidden' })).toHaveBeenCalledOnce()
  })
  it('preserves suppression for other kinds and always displays test pushes', async () => {
    expect(await receivePush('/home', { kind: 'comment' })).not.toHaveBeenCalled()
    expect(await receivePush('/chat?c=c1', { test: true })).toHaveBeenCalledOnce()
  })
})

describe('notification dismissal', () => {
  it('retains the notification id so marking it read can close the OS banner', async () => {
    const show = await receivePush(null)
    expect(show.mock.calls[0]?.[1].data).toHaveProperty('notificationId', 'n1')
  })
  it('clicking one chat leaves other conversation notifications intact', async () => {
    const listeners = new Map<string, (event: unknown) => void>()
    const closeSelected = vi.fn()
    const closeOther = vi.fn()
    const selected = { tag: 'message-conversation-c1', data: { kind: 'message', url: '/chat?c=c1' }, close: closeSelected }
    const other = { tag: 'message-conversation-c2', data: { kind: 'message', url: '/chat?c=c2' }, close: closeOther }
    runInNewContext(readFileSync('public/sw-push.js', 'utf8'), {
      URL, console,
      self: {
        location: new URL('https://menofhunger.com/sw-push.js'),
        addEventListener: (name: string, handler: (event: unknown) => void) => listeners.set(name, handler),
        registration: { getNotifications: async () => [selected, other] },
        clients: { matchAll: async () => [], openWindow: vi.fn().mockResolvedValue(null) },
      },
    })
    let finished: Promise<unknown> | undefined
    listeners.get('notificationclick')!({
      notification: { ...selected, data: { ...selected.data, tag: selected.tag } },
      waitUntil: (promise: Promise<unknown>) => { finished = promise },
    })
    await finished
    expect(closeSelected).toHaveBeenCalled()
    expect(closeOther).not.toHaveBeenCalled()
  })
})
