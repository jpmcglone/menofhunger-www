import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

function readFromRepo(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), 'utf8')
}

describe('SearchTypeahead focus / dropdown sync', () => {
  const source = readFromRepo('components/app/SearchTypeahead.vue')

  it('blurs the input when closing the panel after a selection', () => {
    // Selecting a row uses @mousedown.prevent; without an explicit blur the
    // input stays focused while `focused` is false — back-nav then shows a
    // caret with no dropdown until the user tab-cycles focus.
    expect(source).toContain('function closePanel()')
    expect(source).toMatch(/getInputEl\(\)\?\.blur\(\)/)
    expect(source).toContain('closePanel()')
    expect(source).not.toMatch(/focused\.value\s*=\s*false\s*\n\s*void recordUser/)
  })

  it('reconciles Vue focus state after history / route restoration', () => {
    expect(source).toContain('function syncFocusedFromDom()')
    expect(source).toContain("window.addEventListener('popstate', syncFocusedFromDom)")
    expect(source).toContain("window.addEventListener('pageshow', syncFocusedFromDom)")
    expect(source).toContain('router.afterEach')
  })
})
