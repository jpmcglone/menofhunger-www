import type { UserPreview } from '~/types/api'

type PopoverState = {
  open: boolean
  username: string | null
  preview: UserPreview | null
  x: number
  y: number
  anchorX: number
  anchorY: number
  hoveringTrigger: boolean
  hoveringCard: boolean
  locked: boolean
}

const SHOW_DELAY_MS = 450
// Grace period so you can move from trigger → card without it vanishing.
// (Also helps when you briefly slip out of bounds.)
const HIDE_DELAY_MS = 500

let showTimer: ReturnType<typeof setTimeout> | null = null
let hideTimer: ReturnType<typeof setTimeout> | null = null
let token = 0
let inflightAbort: AbortController | null = null
let routerHookInstalled = false

function clearTimer(t: ReturnType<typeof setTimeout> | null) {
  if (t) clearTimeout(t)
}

export function useUserPreviewPopover() {
  const state = useState<PopoverState>('moh.userPreviewPopover.v1', () => ({
    open: false,
    username: null,
    preview: null,
    x: 0,
    y: 0,
    anchorX: 0,
    anchorY: 0,
    hoveringTrigger: false,
    hoveringCard: false,
    locked: false,
  }))

  const { fetchUserPreview } = useUserPreview()

  function abortInflight() {
    if (inflightAbort) inflightAbort.abort()
    inflightAbort = null
  }

  function setMousePos(e: MouseEvent) {
    state.value.x = Math.floor(e.clientX)
    state.value.y = Math.floor(e.clientY)
  }

  function cancelPending() {
    // Cancels any pending “show” work; does not force-close an open card.
    token++
    clearTimer(showTimer)
    showTimer = null
    abortInflight()
    state.value.hoveringTrigger = false
  }

  function close() {
    state.value.open = false
    state.value.username = null
    state.value.preview = null
    state.value.hoveringTrigger = false
    state.value.hoveringCard = false
    state.value.locked = false
    token++
    clearTimer(showTimer)
    clearTimer(hideTimer)
    showTimer = null
    hideTimer = null
    abortInflight()
  }

  // Ensure a click+navigate can never “leak” a delayed popover into the next page.
  if (import.meta.client && !routerHookInstalled) {
    routerHookInstalled = true
    const router = useRouter()
    router.beforeEach(() => {
      close()
      return true
    })
  }

  function lock() {
    state.value.locked = true
    clearTimer(hideTimer)
    hideTimer = null
  }

  function unlock() {
    state.value.locked = false
    scheduleHide()
  }

  function scheduleHide() {
    if (!import.meta.client) return
    clearTimer(hideTimer)
    hideTimer = setTimeout(() => {
      if (state.value.hoveringTrigger) return
      if (state.value.hoveringCard) return
      if (state.value.locked) return
      state.value.open = false
      state.value.username = null
      state.value.preview = null
    }, HIDE_DELAY_MS)
  }

  function onTriggerEnter(params: { username: string; event: MouseEvent }) {
    if (!import.meta.client) return
    const username = (params.username ?? '').trim()
    if (!username) return

    setMousePos(params.event)

    // If the user is interacting with the open card (or it's locked for a modal),
    // do not switch targets or reset state.
    if (state.value.open && (state.value.hoveringCard || state.value.locked)) {
      return
    }

    // If we're already showing this user, treat this as a no-op hover refresh.
    if (state.value.open && state.value.username && state.value.username.toLowerCase() === username.toLowerCase()) {
      state.value.hoveringTrigger = true
      clearTimer(hideTimer)
      hideTimer = null
      // Re-anchor to the newly-hovered trigger location (e.g. avatar -> name),
      // but keep the same preview open (cached data is already present).
      state.value.anchorX = state.value.x
      state.value.anchorY = state.value.y
      return
    }

    // Only one popover at a time: hide any currently-open preview immediately.
    state.value.open = false
    state.value.preview = null
    state.value.username = null

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
        const preview = await fetchUserPreview(username, { signal: ac.signal })
        if (myToken !== token) return
        if (!state.value.hoveringTrigger) return

        state.value.username = username
        state.value.preview = preview
        // Freeze position once open so it doesn't “chase” the cursor.
        state.value.anchorX = state.value.x
        state.value.anchorY = state.value.y
        state.value.open = true
      } catch {
        // No loaders; if fetch fails, just don't show anything.
      } finally {
        // Best-effort: once the attempt finishes, allow future abort controllers.
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
    lock,
    unlock,
    cancelPending,
    onTriggerEnter,
    onTriggerMove,
    onTriggerLeave,
    onCardEnter,
    onCardLeave,
  }
}

