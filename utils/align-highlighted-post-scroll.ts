/**
 * Helpers for /p/:id "scroll the selected reply just under the sticky title bar".
 *
 * iOS Communication-style issues don't apply here — this is the middle scroller
 * in layouts/app.vue, where the title bar is position:sticky inside the scroller.
 */

/** Prefer the live CSS var; fall back to scrollPaddingTop, then the sticky bar itself. */
export function readTitleBarOffset(scroller: HTMLElement): number {
  const fromVar = Number.parseFloat(
    getComputedStyle(scroller).getPropertyValue('--moh-title-bar-height').trim(),
  )
  if (Number.isFinite(fromVar) && fromVar > 0) return fromVar

  const fromPadding = Number.parseFloat(getComputedStyle(scroller).scrollPaddingTop)
  if (Number.isFinite(fromPadding) && fromPadding > 0) return fromPadding

  const sticky = scroller.querySelector(':scope > .sticky.top-0') as HTMLElement | null
  if (sticky && sticky.offsetHeight > 0) return sticky.offsetHeight

  // Matches layouts/app.vue fallback: var(--moh-title-bar-height, 4rem)
  return 64
}

/** Positive → scroll down; negative → scroll up (corrects overshoot under the title bar). */
export function computeAlignDelta(params: {
  elTop: number
  scrollerTop: number
  titleBarOffset: number
}): number {
  return params.elTop - params.scrollerTop - params.titleBarOffset
}

/**
 * Innermost `[data-post-id]` match — FeedPostRow's outer wrapper also carries the
 * leaf id and would point at the top of the whole ancestor chain if we took the first.
 */
export function findInnermostPostEl(root: ParentNode, postId: string): HTMLElement | null {
  const id = postId.trim()
  if (!id) return null
  const matches = root.querySelectorAll<HTMLElement>(`[data-post-id="${CSS.escape(id)}"]`)
  if (!matches.length) return null
  return matches[matches.length - 1] ?? null
}

/**
 * FeedPostRow's ancestor-chain wrapper also carries the leaf `data-post-id`.
 * On client navigations that wrapper exists before the inner highlighted row
 * is painted. Scrolling to it lands at the top of the thread.
 */
export function isUsableHighlightTarget(el: HTMLElement): boolean {
  return !el.hasAttribute('data-thread-chain')
}
