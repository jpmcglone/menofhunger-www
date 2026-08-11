import { describe, expect, it } from 'vitest'
import {
  computeAlignDelta,
  findInnermostPostEl,
} from '../utils/align-highlighted-post-scroll'

describe('computeAlignDelta', () => {
  it('scrolls down when the target sits below the title bar', () => {
    expect(
      computeAlignDelta({ elTop: 400, scrollerTop: 0, titleBarOffset: 53 }),
    ).toBe(347)
  })

  it('scrolls up when the target is tucked under the title bar', () => {
    expect(
      computeAlignDelta({ elTop: 40, scrollerTop: 0, titleBarOffset: 53 }),
    ).toBe(-13)
  })

  it('is ~0 when already aligned', () => {
    expect(
      computeAlignDelta({ elTop: 53, scrollerTop: 0, titleBarOffset: 53 }),
    ).toBe(0)
  })
})

describe('findInnermostPostEl', () => {
  it('prefers the nested row over the outer chain wrapper sharing the same id', () => {
    const root = document.createElement('div')
    root.innerHTML = `
      <div data-post-id="leaf">
        <div data-post-id="parent">parent</div>
        <div data-post-id="leaf">leaf row</div>
      </div>
    `
    const el = findInnermostPostEl(root, 'leaf')
    expect(el?.textContent?.trim()).toBe('leaf row')
  })
})
