import { afterEach, describe, expect, it, vi } from 'vitest'
import { measureVideo } from '../utils/media/viewport'
afterEach(() => { document.body.replaceChildren(); document.body.style.overflow = ''; document.documentElement.style.overflow = ''; vi.restoreAllMocks() })
function rect(el: HTMLElement, top: number, height: number) {
  el.getBoundingClientRect = () => ({ top, bottom: top + height, height, left: 0, right: 400, width: 400, x: 0, y: top, toJSON: () => ({}) })
}
function surface(top: number, height = 200) {
  const scroll = document.createElement('div'); scroll.style.overflowY = 'auto'; rect(scroll, 100, 600)
  const card = document.createElement('div'); card.style.overflow = 'hidden'; rect(card, top, height)
  const video = document.createElement('div'); rect(video, top, height)
  card.append(video); scroll.append(card); document.body.append(scroll)
  vi.spyOn(document, 'elementFromPoint').mockReturnValue(video)
  return { video, card, scroll }
}
describe('usable media viewport', () => {
  it('uses the scroller center rather than a rounded card clipping boundary', () => {
    const { video } = surface(150)
    expect(measureVideo(video)?.distance).toBe(150)
  })
  it('uses the visual viewport when a fixed app shell leaves the body and html at zero height', () => {
    const { video } = surface(150)
    document.body.style.overflow = 'hidden auto'
    document.documentElement.style.overflow = 'hidden auto'
    vi.spyOn(document.body, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 400, 0))
    vi.spyOn(document.documentElement, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 400, 0))
    expect(measureVideo(video)?.distance).toBe(150)
  })
  it('requires 75% even when a card clips its child', () => {
    const { video, card } = surface(200); rect(card, 200, 100)
    expect(measureVideo(video)).toBeNull()
  })
  it('supports videos taller than the viewport', () => {
    const { video } = surface(20, 1100)
    expect(measureVideo(video)).not.toBeNull()
  })
  it('subtracts fixed chrome and rejects a covering presentation', () => {
    const { video } = surface(120)
    const header = document.createElement('header'); header.dataset.mediaOccluder = ''; rect(header, 100, 110); document.body.append(header)
    expect(measureVideo(video)).toBeNull()
    header.remove(); vi.spyOn(document, 'elementFromPoint').mockReturnValue(document.createElement('dialog'))
    expect(measureVideo(video)).toBeNull()
  })
})
