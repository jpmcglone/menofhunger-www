import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Guardrail: the mention-decoration refresh must not dispatch during an IME composition.
 *
 * Sentry MENOFHUNGER-WWW-1P: on Android (Chrome Mobile / GBoard), the IME edits the
 * editor's DOM text nodes directly and fires `selectionchange` before ProseMirror has
 * synced that mutation into its own state. Forcing a decoration re-render in that window
 * rebuilds the inline DOM under the composing range, and ProseMirror then collapses its
 * stale selection past the end of the shortened text node — `IndexSizeError` from
 * `Selection.collapse`.
 *
 * `refreshMentionDecorations()` is driven by async mention-tier validation, so it can fire
 * at any point while the user is typing. It must bail out while `view.composing` is true
 * and flush afterwards, so mention colors still resolve once the composition ends.
 */

const SOURCE = resolve(process.cwd(), 'components/app/StyledTextarea.vue')

describe('StyledTextarea composition safety', () => {
  const source = readFileSync(SOURCE, 'utf8')

  const refreshFn = source.slice(
    source.indexOf('function refreshMentionDecorations'),
    source.indexOf('watch([validSet, tierMap]'),
  )

  it('has a refreshMentionDecorations function driven by tier resolution', () => {
    expect(refreshFn).not.toHaveLength(0)
    expect(source).toContain('watch([validSet, tierMap]')
  })

  it('bails out of the decoration dispatch while a composition is active', () => {
    expect(refreshFn).toMatch(/if\s*\(\s*ed\.view\.composing\s*\)/)
  })

  it('guards before dispatching, not after', () => {
    const guardIndex = refreshFn.indexOf('composing')
    const dispatchIndex = refreshFn.indexOf('view.dispatch')
    expect(guardIndex).toBeGreaterThanOrEqual(0)
    expect(dispatchIndex).toBeGreaterThanOrEqual(0)
    expect(guardIndex).toBeLessThan(dispatchIndex)
  })

  it('records the skipped refresh so it is not silently dropped', () => {
    expect(refreshFn).toContain('pendingDecorationRefresh = true')
  })

  it('flushes the pending refresh on compositionend', () => {
    expect(source).toMatch(/compositionend:/)
    const handler = source.slice(source.indexOf('compositionend:'))
    expect(handler).toContain('pendingDecorationRefresh = false')
    expect(handler).toContain('refreshMentionDecorations()')
  })
})
