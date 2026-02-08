type ExtraInset = number | string

function toCssLength(v: ExtraInset): string {
  if (typeof v === 'number') return `${Math.max(0, Math.floor(v))}px`
  return String(v || '0px')
}

type KeyboardInsetOptions = {
  /** Treat keyboard as open when inset exceeds this amount. */
  openThresholdPx?: number
}

let didInitKeyboard = false

function computeKeyboardInsetPx(): number {
  if (!import.meta.client) return 0
  const vv = window.visualViewport
  if (!vv) return 0

  // In most mobile browsers, the virtual keyboard reduces visualViewport height.
  // offsetTop can be non-zero (zoom / iOS quirks), so include it.
  const raw = window.innerHeight - (vv.height + vv.offsetTop)
  const n = Number.isFinite(raw) ? raw : 0
  return Math.max(0, Math.floor(n))
}

/**
 * Centralized mobile inset helpers (safe-area + keyboard + tabbar).
 *
 * - Safe-area comes from CSS vars in `assets/css/main.css`: `--moh-safe-*`.
 * - Keyboard inset is computed via VisualViewport and written to `--moh-kb`.
 */
export function useMobileInsets(opts: KeyboardInsetOptions = {}) {
  const insetPx = useState<number>('moh.keyboard.insetPx', () => 0)
  const openThreshold = Math.max(0, Math.floor(opts.openThresholdPx ?? 80))

  const keyboardInsetPx = computed(() => Math.max(0, Math.floor(Number(insetPx.value) || 0)))
  const keyboardOpen = computed(() => keyboardInsetPx.value > openThreshold)

  function update() {
    const next = computeKeyboardInsetPx()
    insetPx.value = next
    try {
      document.documentElement.style.setProperty('--moh-kb', `${next}px`)
    } catch {
      // ignore
    }
  }

  onMounted(() => {
    if (!import.meta.client) return
    if (didInitKeyboard) return
    didInitKeyboard = true

    update()

    const vv = window.visualViewport
    const onVvChange = () => update()
    const onWinResize = () => update()
    const onFocusChange = () => update()

    window.addEventListener('resize', onWinResize, { passive: true } as AddEventListenerOptions)
    window.addEventListener('focusin', onFocusChange, { passive: true } as AddEventListenerOptions)
    window.addEventListener('focusout', onFocusChange, { passive: true } as AddEventListenerOptions)

    vv?.addEventListener?.('resize', onVvChange, { passive: true } as AddEventListenerOptions)
    vv?.addEventListener?.('scroll', onVvChange, { passive: true } as AddEventListenerOptions)

    onBeforeUnmount(() => {
      window.removeEventListener('resize', onWinResize as any)
      window.removeEventListener('focusin', onFocusChange as any)
      window.removeEventListener('focusout', onFocusChange as any)
      vv?.removeEventListener?.('resize', onVvChange as any)
      vv?.removeEventListener?.('scroll', onVvChange as any)
    })
  })

  function bottomInsetCss(extra: ExtraInset = 0): string {
    return `calc(var(--moh-kb, 0px) + var(--moh-safe-bottom, 0px) + ${toCssLength(extra)})`
  }

  function tabbarInsetCss(extra: ExtraInset = 0): string {
    return `calc(var(--moh-tabbar-height, 4rem) + var(--moh-safe-bottom, 0px) + ${toCssLength(extra)})`
  }

  return {
    insetPx,
    keyboardInsetPx,
    keyboardOpen,
    bottomInsetCss,
    tabbarInsetCss,
    update,
  }
}

