/**
 * Regression guard for the VisibilityPicker Teleport + outside-click bug.
 *
 * Bug: When the dropdown panel was moved to <Teleport to="body">, the
 * `onDocPointerDown` outside-click handler only checked `wrapEl.contains(t)`.
 * The panel lives outside `wrapEl` in the DOM, so every click on a menu option
 * first closed the panel (before @click fired) and the selected value never
 * changed — the picker appeared permanently stuck on "public".
 *
 * Fix: also check `panelEl.contains(t)` so teleported-panel clicks are treated
 * as "inside" and the close logic is skipped.
 */

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

function src(): string {
  return readFileSync(
    resolve(process.cwd(), 'components/app/composer/VisibilityPicker.vue'),
    'utf8',
  )
}

describe('VisibilityPicker – Teleport outside-click safety', () => {
  it('gives the teleported panel a ref so it can be identified', () => {
    // The panel must carry ref="panelEl" so the close guard can check it.
    expect(src()).toMatch(/ref="panelEl"/)
  })

  it('declares a panelEl ref in <script>', () => {
    expect(src()).toMatch(/panelEl\s*=\s*ref<HTMLElement/)
  })

  it('guards onDocPointerDown with both wrapEl and panelEl', () => {
    const source = src()
    // The handler must check panelEl.contains so option clicks are not eaten.
    expect(source).toMatch(/panel.*contains\(t\)/)
    // The guard must appear before the line that closes the panel.
    const guardIdx = source.indexOf('panel?.contains(t)')
    const closeIdx = source.indexOf('open.value = false', source.indexOf('onDocPointerDown'))
    expect(guardIdx).toBeGreaterThan(-1)
    expect(closeIdx).toBeGreaterThan(-1)
    expect(guardIdx).toBeLessThan(closeIdx)
  })

  it('set() emits update:modelValue before closing', () => {
    const source = src()
    const setFn = source.slice(
      source.indexOf('function set('),
      source.indexOf('\n}', source.indexOf('function set(')) + 2,
    )
    // emit must come before open.value = false inside set()
    const emitIdx = setFn.indexOf("emit('update:modelValue'")
    const closeIdx = setFn.indexOf('open.value = false')
    expect(emitIdx).toBeGreaterThan(-1)
    expect(closeIdx).toBeGreaterThan(-1)
    expect(emitIdx).toBeLessThan(closeIdx)
  })
})
