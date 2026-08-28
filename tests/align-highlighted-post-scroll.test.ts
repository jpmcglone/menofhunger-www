import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  computeAlignDelta,
  findInnermostPostEl,
  isUsableHighlightTarget,
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

  it('rejects the chain wrapper that also carries the leaf id', () => {
    const root = document.createElement('div')
    root.innerHTML = `
      <div data-post-id="leaf" data-thread-chain class="flex flex-col">
        <div data-post-id="parent">parent</div>
        <div data-post-id="leaf">leaf row</div>
      </div>
    `
    const wrapper = root.querySelector('[data-post-id="leaf"]') as HTMLElement
    const leaf = findInnermostPostEl(root, 'leaf')
    expect(isUsableHighlightTarget(wrapper)).toBe(false)
    expect(leaf && isUsableHighlightTarget(leaf)).toBe(true)
  })

  it('rejects a chain wrapper that has not painted the inner leaf yet', () => {
    const wrapper = document.createElement('div')
    wrapper.setAttribute('data-post-id', 'leaf')
    wrapper.setAttribute('data-thread-chain', '')
    wrapper.innerHTML = `<div data-post-id="parent">parent</div>`
    expect(isUsableHighlightTarget(wrapper)).toBe(false)
  })

  it('still accepts a real row that embeds another post', () => {
    const row = document.createElement('div')
    row.setAttribute('data-post-id', 'leaf')
    row.innerHTML = `<div data-post-id="quoted">quoted</div>`
    expect(isUsableHighlightTarget(row)).toBe(true)
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
    expect(page).toContain('isUsableHighlightTarget')
    expect(readFromRepo('components/app/FeedPostRow.vue')).toContain('data-thread-chain')
    expect(page).toContain('neededStableFrames')
    expect(page).not.toContain('const maxFrames = 45')
    expect(page).toMatch(/watch\(\s*\[postId,[\s\S]*\{ immediate: true \}/)
  })
})
