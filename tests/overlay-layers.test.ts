import { readFileSync, readdirSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { OVERLAY_LAYERS } from '~/utils/overlay-layers'

const root = resolve(__dirname, '..')

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === '.nuxt' || entry === '.output') continue
    const path = resolve(dir, entry)
    if (statSync(path).isDirectory()) walk(path, out)
    else if (/\.(vue|css)$/.test(entry)) out.push(path)
  }
  return out
}

describe('overlay layers', () => {
  it('keeps the CSS variables equal to the scale', () => {
    const css = readFileSync(resolve(root, 'assets/css/main.css'), 'utf8')
    const names: Record<keyof typeof OVERLAY_LAYERS, string> = {
      dragGhost: '--moh-z-drag-ghost',
      mediaBar: '--moh-z-media-bar',
      chrome: '--moh-z-chrome',
      celebration: '--moh-z-celebration',
      accountBackdrop: '--moh-z-account-backdrop',
      accountMenu: '--moh-z-account-menu',
      bottomSheet: '--moh-z-bottom-sheet',
      gate: '--moh-z-gate',
      modal: '--moh-z-modal',
      pinnedPlayer: '--moh-z-pinned-player',
      menu: '--moh-z-menu',
      nestedMenu: '--moh-z-menu',
      tooltip: '--moh-z-tooltip',
      callChrome: '--moh-z-call-chrome',
      call: '--moh-z-call',
      toast: '--moh-z-toast',
    }
    for (const [key, variable] of Object.entries(names) as Array<[keyof typeof OVERLAY_LAYERS, string]>) {
      expect(css).toContain(`${variable}: ${OVERLAY_LAYERS[key]};`)
    }
  })

  it('stacks menus above dialogs and dialogs above the sheet', () => {
    expect(OVERLAY_LAYERS.bottomSheet).toBeGreaterThan(OVERLAY_LAYERS.accountMenu)
    expect(OVERLAY_LAYERS.modal).toBeGreaterThan(OVERLAY_LAYERS.bottomSheet)
    expect(OVERLAY_LAYERS.menu).toBeGreaterThan(OVERLAY_LAYERS.modal)
    expect(OVERLAY_LAYERS.tooltip).toBeGreaterThan(OVERLAY_LAYERS.menu)
    expect(OVERLAY_LAYERS.call).toBeGreaterThan(OVERLAY_LAYERS.tooltip)
    expect(OVERLAY_LAYERS.toast).toBeGreaterThan(OVERLAY_LAYERS.call)
    expect(OVERLAY_LAYERS.nestedMenu).toBe(OVERLAY_LAYERS.menu)
  })

  it('gives PrimeVue the same bands', () => {
    const config = readFileSync(resolve(root, 'nuxt.config.ts'), 'utf8')
    expect(config).toContain('modal: OVERLAY_LAYERS.modal')
    expect(config).toContain('overlay: OVERLAY_LAYERS.menu')
    expect(config).toContain('menu: OVERLAY_LAYERS.menu')
    expect(config).toContain('tooltip: OVERLAY_LAYERS.tooltip')
  })

  it('rejects a new raw portal z-index', () => {
    const offenders: string[] = []
    for (const path of walk(resolve(root))) {
      const relative = path.slice(root.length + 1)
      if (relative === 'assets/css/main.css') continue
      const text = readFileSync(path, 'utf8')
      if (/z-\[\d{4,}\]/.test(text) || /z-index:\s*\d{4,}/.test(text)) offenders.push(relative)
    }
    expect(offenders).toEqual([])
  })
})
