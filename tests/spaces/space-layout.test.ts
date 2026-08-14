import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { navCompactModePath } from '../../config/routes'

function readFromRepo(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), 'utf8')
}

describe('space layout', () => {
  it('auto-collapses the left nav on space permalinks, not the lobby', () => {
    expect(navCompactModePath('/s/alice')).toBe(true)
    expect(navCompactModePath('/spaces')).toBe(false)
    expect(navCompactModePath('/spaces/')).toBe(false)
  })

  it('widens the right rail only while live chat is showing', () => {
    const css = readFromRepo('assets/css/main.css')
    const rail = readFromRepo('components/app/layout/RightRail.vue')
    const layout = readFromRepo('layouts/app.vue')

    expect(css).toMatch(/--moh-right-rail-w:\s*20rem/)
    expect(css).toMatch(/--moh-right-rail-chat-w:\s*24rem/)
    expect(rail).toMatch(/showRadioChat \? 'w-\[var\(--moh-right-rail-chat-w\)\]' : 'w-\[var\(--moh-right-rail-w\)\]'/)
    expect(layout).toMatch(/showRadioChat \? 'w-\[var\(--moh-right-rail-chat-w\)\]' : 'w-\[var\(--moh-right-rail-w\)\]'/)
    expect(layout).toMatch(/_navCompactModeBase\.value \|\| Boolean\(selectedSpaceId\.value\)/)
  })
})
