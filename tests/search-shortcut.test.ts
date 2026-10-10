import { afterEach, describe, expect, it, vi } from 'vitest'
import { createSearchShortcut, focusVisibleSearchInput } from '~/utils/search-shortcut'

const elements: HTMLElement[] = []
afterEach(() => {
  for (const element of elements.splice(0)) element.remove()
  vi.restoreAllMocks()
})

function searchInput(style = '') {
  const parent = document.createElement('div')
  parent.style.cssText = style
  const input = document.createElement('input')
  input.setAttribute('data-moh-search-input', '')
  parent.append(input)
  document.body.append(parent)
  elements.push(parent)
  vi.spyOn(input, 'getClientRects').mockReturnValue([{ width: 100, height: 40 }] as unknown as DOMRectList)
  return input
}

describe('search shortcut', () => {
  it('skips hidden rail search and focuses the visible Explore input', () => {
    const hidden = searchInput('opacity: 0')
    const visible = searchInput()
    expect(focusVisibleSearchInput()).toBe(true)
    expect(document.activeElement).toBe(visible)
    expect(document.activeElement).not.toBe(hidden)
  })

  it('skips inputs hidden by desktop breakpoints, disabled inputs, and inert overlays', () => {
    const breakpointHidden = searchInput()
    vi.mocked(breakpointHidden.getClientRects).mockReturnValue([] as unknown as DOMRectList)
    const disabled = searchInput()
    disabled.disabled = true
    const inert = searchInput()
    inert.parentElement!.setAttribute('inert', '')
    expect(focusVisibleSearchInput()).toBe(false)
  })

  it('opens Explore when no visible search exists, then focuses after rendering', async () => {
    const navigate = vi.fn().mockResolvedValue(undefined)
    const removeHook = vi.fn()
    let input: HTMLInputElement
    const shortcut = createSearchShortcut({ navigate,
      nextRender: async () => { input = searchInput() },
      onPageFinished: () => removeHook,
    })
    await shortcut.focus()
    expect(navigate).toHaveBeenCalledTimes(1)
    expect(document.activeElement).toBe(input!)
    expect(removeHook).toHaveBeenCalledTimes(1)
  })

  it('waits for the page-finish hook when a lazy page is not rendered after navigation', async () => {
    let finished!: () => void
    const removeHook = vi.fn()
    const shortcut = createSearchShortcut({
      navigate: async () => undefined, nextRender: async () => {},
      onPageFinished: (callback) => { finished = callback; return removeHook },
    })
    await shortcut.focus()
    expect(removeHook).not.toHaveBeenCalled()
    const input = searchInput()
    finished()
    expect(document.activeElement).toBe(input)
    expect(removeHook).toHaveBeenCalledTimes(1)
  })

  it('cleans up the pending page hook when navigation is rejected or the layout unmounts', async () => {
    const removeHook = vi.fn()
    const rejected = createSearchShortcut({ navigate: async () => { throw new Error('cancelled') },
      nextRender: async () => {}, onPageFinished: () => removeHook,
    })
    await rejected.focus()
    expect(removeHook).toHaveBeenCalledTimes(1)
    const pending = createSearchShortcut({ navigate: async () => undefined,
      nextRender: async () => {}, onPageFinished: () => removeHook,
    })
    await pending.focus()
    pending.dispose()
    expect(removeHook).toHaveBeenCalledTimes(2)
  })
})
