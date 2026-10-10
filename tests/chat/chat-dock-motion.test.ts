import { afterEach, describe, expect, it, vi } from 'vitest'
import { animateChatDock } from '~/utils/chat-dock-motion'

const from = new DOMRect(200, 100, 380, 620)
const originalAnimate = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'animate')
function fixture() {
  vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: false } as MediaQueryList)
  let resolve!: () => void
  let reject!: (reason?: unknown) => void
  const finished = new Promise<void>((res, rej) => { resolve = res; reject = rej })
  const cancel = vi.fn(() => reject(new Error('cancelled')))
  const animate = vi.fn().mockReturnValue({ finished, cancel } as unknown as Animation)
  Object.defineProperty(HTMLElement.prototype, 'animate', { configurable: true, value: animate })
  const target = document.createElement('div')
  target.style.transformOrigin = 'bottom right'
  vi.spyOn(target, 'getBoundingClientRect').mockReturnValue(new DOMRect(900, 700, 56, 56))
  document.body.append(target)
  return { target, animate, cancel, resolve, reject }
}
afterEach(() => {
  document.body.innerHTML = ''
  vi.restoreAllMocks()
  if (originalAnimate) Object.defineProperty(HTMLElement.prototype, 'animate', originalAnimate)
  else Reflect.deleteProperty(HTMLElement.prototype, 'animate')
})

describe('chat window avatar handoff', () => {
  it('minimizes over 420ms with gradual acceleration and cleans the shell exactly once', async () => {
    const { target, animate, cancel, resolve } = fixture()
    const finished = vi.fn()
    animateChatDock(from, target, false, finished)
    expect(animate.mock.calls[0]?.[1]).toEqual({ duration: 420, easing: 'cubic-bezier(.4,0,.2,1)' })
    expect(document.querySelector('[aria-hidden="true"]')).not.toBeNull()
    resolve(); await Promise.resolve()
    expect(document.querySelector('[aria-hidden="true"]')).toBeNull()
    expect(cancel).toHaveBeenCalledOnce()
    expect(finished).toHaveBeenCalledOnce()
  })

  it('handles interrupted minimization without duplicate completion or leftover shells', async () => {
    const { target, cancel } = fixture()
    const finished = vi.fn()
    const cleanup = animateChatDock(from, target, false, finished)!
    cleanup(); cleanup(); await Promise.resolve()
    expect(document.querySelector('[aria-hidden="true"]')).toBeNull()
    expect(cancel).toHaveBeenCalledOnce()
    expect(finished).toHaveBeenCalledOnce()
  })

  it('restores the original transform origin after a restore is cancelled externally', async () => {
    const { target, animate, reject } = fixture()
    const finished = vi.fn()
    animateChatDock(from, target, true, finished)
    expect(animate.mock.calls[0]?.[1]).toEqual({ duration: 320, easing: 'cubic-bezier(.2,.8,.2,1)' })
    expect(target.style.transformOrigin).toBe('top left')
    reject(new Error('interrupted')); await Promise.resolve()
    expect(target.style.transformOrigin).toBe('bottom right')
    expect(finished).toHaveBeenCalledOnce()
  })

  it('skips handoffs for reduced motion and hidden geometry', () => {
    const { target, animate } = fixture()
    vi.mocked(window.matchMedia).mockReturnValue({ matches: true } as MediaQueryList)
    expect(animateChatDock(from, target, false, vi.fn())).toBeNull()
    vi.mocked(window.matchMedia).mockReturnValue({ matches: false } as MediaQueryList)
    expect(animateChatDock(new DOMRect(), target, false, vi.fn())).toBeNull()
    vi.mocked(target.getBoundingClientRect).mockReturnValue(new DOMRect())
    expect(animateChatDock(from, target, false, vi.fn())).toBeNull()
    expect(animate).not.toHaveBeenCalled()
  })
})
