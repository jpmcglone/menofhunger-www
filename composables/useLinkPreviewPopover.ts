import type { LinkMetadata } from '~/utils/link-metadata'
import { getLinkMetadata } from '~/utils/link-metadata'

type PopoverState = {
  open: boolean
  url: string | null
  preview: LinkMetadata | null
  x: number
  y: number
  anchorX: number
  anchorY: number
  hoveringTrigger: boolean
  hoveringCard: boolean
}

const SHOW_DELAY_MS = 450
const HIDE_DELAY_MS = 500

let showTimer: ReturnType<typeof setTimeout> | null = null
let hideTimer: ReturnType<typeof setTimeout> | null = null
let token = 0
let inflightAbort: AbortController | null = null
let routerHookInstalled = false

function clearTimer(t: ReturnType<typeof setTimeout> | null) {
  if (t) clearTimeout(t)
}

function isHttpUrl(url: string): boolean {
  try {
    const u = new URL(url)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}

async function closeOtherPreviewPopovers() {
  try {
    const m = await import('./useUserPreviewPopover')
    m.useUserPreviewPopover().close()
  } catch {
    // ignore
  }
  try {
    const m = await import('./useGroupPreviewPopover')
    m.useGroupPreviewPopover().close()
  } catch {
    // ignore
  }
  try {
    const m = await import('./useCrewPreviewPopover')
    m.useCrewPreviewPopover().close()
  } catch {
    // ignore
  }
}

export function useLinkPreviewPopover() {
  const state = useState<PopoverState>('moh.linkPreviewPopover.v1', () => ({
    open: false,
    url: null,
    preview: null,
    x: 0,
    y: 0,
    anchorX: 0,
    anchorY: 0,
    hoveringTrigger: false,
    hoveringCard: false,
  }))

  function abortInflight() {
    if (inflightAbort) inflightAbort.abort()
    inflightAbort = null
  }

  function setMousePos(e: MouseEvent) {
    state.value.x = Math.floor(e.clientX)
    state.value.y = Math.floor(e.clientY)
  }

  function cancelPending() {
    token++
    clearTimer(showTimer)
    showTimer = null
    abortInflight()
    state.value.hoveringTrigger = false
  }

  function close() {
    state.value.open = false
    state.value.url = null
    state.value.preview = null
    state.value.hoveringTrigger = false
    state.value.hoveringCard = false
    token++
    clearTimer(showTimer)
    clearTimer(hideTimer)
    showTimer = null
    hideTimer = null
    abortInflight()
  }

  if (import.meta.client && !routerHookInstalled) {
    routerHookInstalled = true
    const router = useRouter()
    router.beforeEach(() => {
      close()
      return true
    })
  }

  function scheduleHide() {
    if (!import.meta.client) return
    clearTimer(hideTimer)
    hideTimer = setTimeout(() => {
      if (state.value.hoveringTrigger) return
      if (state.value.hoveringCard) return
      state.value.open = false
      state.value.url = null
      state.value.preview = null
    }, HIDE_DELAY_MS)
  }

  function onTriggerEnter(params: { url: string; event: MouseEvent }) {
    if (!import.meta.client) return
    const url = (params.url ?? '').trim()
    if (!url || !isHttpUrl(url)) return

    setMousePos(params.event)

    if (state.value.open && (state.value.hoveringCard)) {
      return
    }

    if (state.value.open && state.value.url === url) {
      state.value.hoveringTrigger = true
      clearTimer(hideTimer)
      hideTimer = null
      state.value.anchorX = state.value.x
      state.value.anchorY = state.value.y
      return
    }

    void closeOtherPreviewPopovers()

    state.value.open = false
    state.value.preview = null
    state.value.url = null

    token++
    const myToken = token

    state.value.hoveringTrigger = true

    clearTimer(showTimer)
    clearTimer(hideTimer)
    showTimer = setTimeout(async () => {
      if (myToken !== token) return
      if (!state.value.hoveringTrigger) return

      try {
        abortInflight()
        const ac = new AbortController()
        inflightAbort = ac
        const preview = await getLinkMetadata(url, { signal: ac.signal })
        if (myToken !== token) return
        if (!state.value.hoveringTrigger) return

        state.value.url = url
        state.value.preview = preview
        state.value.anchorX = state.value.x
        state.value.anchorY = state.value.y
        state.value.open = true
      } catch {
        // No loaders; if fetch fails, still show a hostname-only card.
        if (myToken !== token) return
        if (!state.value.hoveringTrigger) return
        state.value.url = url
        state.value.preview = null
        state.value.anchorX = state.value.x
        state.value.anchorY = state.value.y
        state.value.open = true
      } finally {
        inflightAbort = null
      }
    }, SHOW_DELAY_MS)
  }

  function onTriggerMove(e: MouseEvent) {
    if (!import.meta.client) return
    if (!state.value.hoveringTrigger) return
    if (state.value.open) return
    setMousePos(e)
  }

  function onTriggerLeave() {
    if (!import.meta.client) return
    state.value.hoveringTrigger = false
    scheduleHide()
  }

  function onCardEnter() {
    if (!import.meta.client) return
    state.value.hoveringCard = true
    clearTimer(hideTimer)
    hideTimer = null
  }

  function onCardLeave() {
    if (!import.meta.client) return
    state.value.hoveringCard = false
    scheduleHide()
  }

  return {
    state,
    close,
    cancelPending,
    onTriggerEnter,
    onTriggerMove,
    onTriggerLeave,
    onCardEnter,
    onCardLeave,
  }
}
