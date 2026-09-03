/**
 * Regression guard for the composer group picker going off-screen.
 *
 * Bug: the menu used `absolute bottom-full`, so it always opened upward and
 * clipped at the viewport top when the home composer sat near the top.
 *
 * Fix: teleport to body, measure the trigger, flip up/down, and clamp
 * max-height to the remaining viewport space.
 */

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

function src(): string {
  return readFileSync(
    resolve(process.cwd(), 'components/app/composer/GroupAudiencePicker.vue'),
    'utf8',
  )
}

describe('GroupAudiencePicker – viewport positioning', () => {
  it('teleports the panel to body so overflow parents cannot clip it', () => {
    expect(src()).toContain('<Teleport to="body">')
  })

  it('positions with fixed coordinates, not absolute bottom-full', () => {
    const source = src()
    expect(source).toContain('class="fixed z-[2000]')
    expect(source).not.toContain('bottom-full')
    expect(source).toContain('positionPanel')
    expect(source).toMatch(/spaceAbove|spaceBelow/)
  })

  it('clamps the panel inside the viewport and caps its height', () => {
    const source = src()
    expect(source).toContain('maxHeight')
    expect(source).toContain('VIEWPORT_PAD')
    expect(source).toContain('window.innerWidth')
    expect(source).toContain('window.innerHeight')
  })

  it('repositions after paint and on resize/scroll', () => {
    const source = src()
    expect(source).toContain('positionPanelAfterPaint')
    expect(source).toContain("addEventListener('resize'")
    expect(source).toContain("addEventListener('scroll'")
  })

  it('guards outside-clicks on both wrap and teleported panel', () => {
    const source = src()
    expect(source).toMatch(/panel.*contains\(t\)/)
    const guardIdx = source.indexOf('panel?.contains(t)')
    const closeIdx = source.indexOf('open.value = false', source.indexOf('onDocPointerDown'))
    expect(guardIdx).toBeGreaterThan(-1)
    expect(closeIdx).toBeGreaterThan(-1)
    expect(guardIdx).toBeLessThan(closeIdx)
  })
})
