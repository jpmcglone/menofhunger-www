import { describe, expect, it, vi } from 'vitest'
import { externalLinkHost, useExternalLinkConfirm } from '../composables/useExternalLinkConfirm'

describe('external link confirmation', () => {
  it('shows the destination host', () => {
    expect(externalLinkHost('https://www.example.com/path?q=1')).toBe('example.com')
    expect(externalLinkHost('not a url')).toBe('not a url')
  })

  it('holds a plain click until the reader confirms, then opens outside the app', () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null)
    const link = useExternalLinkConfirm()
    const event = new MouseEvent('click', { cancelable: true, button: 0 })
    link.onClick(event, 'https://example.com/a')
    expect(event.defaultPrevented).toBe(true)
    expect(link.pendingUrl.value).toBe('https://example.com/a')
    expect(open).not.toHaveBeenCalled()
    link.confirm()
    expect(open).toHaveBeenCalledWith('https://example.com/a', '_blank', 'noopener,noreferrer')
    expect(link.pendingUrl.value).toBeNull()
    open.mockRestore()
  })

  it('cancel opens nothing, and modified clicks pass through to the browser', () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null)
    const link = useExternalLinkConfirm()
    link.onClick(new MouseEvent('click', { cancelable: true, button: 0 }), 'https://example.com/b')
    link.cancel()
    link.confirm()
    expect(open).not.toHaveBeenCalled()
    const modified = new MouseEvent('click', { cancelable: true, button: 0, metaKey: true })
    link.onClick(modified, 'https://example.com/c')
    expect(modified.defaultPrevented).toBe(false)
    expect(link.pendingUrl.value).toBeNull()
    open.mockRestore()
  })
})
