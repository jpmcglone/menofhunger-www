/**
 * Status tooltip shape adapter.
 *
 * PrimeVue renders `v-tooltip` content inside a freshly-created element that
 * lives outside of any component tree, so we can't bind a Vue ref to it. To
 * keep the status tooltip (`moh-tooltip-status`) consistent with the visible
 * status pills on profiles and mini-profiles — a true pill on a single line,
 * a rounded rectangle when it wraps to two lines — we watch `document.body`
 * for added tooltip nodes and tag them with a `--multi` modifier class
 * whenever the rendered text actually wraps. The CSS reads that modifier to
 * switch `border-radius` accordingly.
 */
export default defineNuxtPlugin(() => {
  if (!import.meta.client) return
  if (typeof MutationObserver === 'undefined') return

  function getLineHeightPx(el: HTMLElement): number {
    const cs = getComputedStyle(el)
    const lh = cs.lineHeight
    if (lh === 'normal') {
      const fs = parseFloat(cs.fontSize) || 12
      return fs * 1.2
    }
    return parseFloat(lh) || 16
  }

  function tag(tip: HTMLElement) {
    const text = tip.querySelector<HTMLElement>('.p-tooltip-text')
    if (!text) return
    // Wait one frame so the tooltip has been positioned and the text has
    // its final wrapped layout before we measure.
    requestAnimationFrame(() => {
      const h = text.getBoundingClientRect().height
      if (h <= 0) return
      const lh = getLineHeightPx(text)
      tip.classList.toggle('moh-tooltip-status--multi', h > lh + 1)
    })
  }

  function scanNode(node: Node) {
    if (!(node instanceof HTMLElement)) return
    if (node.classList.contains('p-tooltip') && node.classList.contains('moh-tooltip-status')) {
      tag(node)
      return
    }
    const nested = node.querySelectorAll?.('.p-tooltip.moh-tooltip-status')
    if (nested && nested.length > 0) {
      nested.forEach((n) => tag(n as HTMLElement))
    }
  }

  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      m.addedNodes.forEach(scanNode)
    }
  })

  observer.observe(document.body, { childList: true, subtree: true })
})
