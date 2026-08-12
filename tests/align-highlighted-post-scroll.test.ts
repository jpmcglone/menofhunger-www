import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
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

describe('permalink highlight align triggers (structural)', () => {
  function readFromRepo(relativePath: string): string {
    return readFileSync(resolve(process.cwd(), relativePath), 'utf8')
  }

  it('watches primitive postId/parentId sources so boost patches do not re-snap scroll', () => {
    // Regression: `watch(() => [postId, parentId], …)` returns a new array every time
    // `post` is replaced (boost/liveUpdated), so Object.is always fails and the initial
    // under-title-bar align re-ran after the page had settled.
    const page = readFromRepo('pages/p/[id].vue')
    expect(page).toMatch(/watch\(\s*\[postId,\s*\(\)\s*=>\s*post\.value\?\.parent\?\.id\s*\?\?\s*null\]/)
    expect(page).not.toMatch(/watch\(\s*\(\)\s*=>\s*\[\s*postId\.value/)
    expect(page).toMatch(/highlightAlignFinishedForId/)
  })
})
