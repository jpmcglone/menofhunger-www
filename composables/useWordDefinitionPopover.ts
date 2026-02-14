export type WordDefinitionPopoverPayload = {
  word: string
  definition: string | null
  definitionHtml: string | null
  sourceUrl: string
}

type PopoverState = {
  open: boolean
  payload: WordDefinitionPopoverPayload | null
  x: number
  y: number
  anchorX: number
  anchorY: number
  hoveringTrigger: boolean
  hoveringCard: boolean
  locked: boolean
}

// Show immediately on hover (no delay).
const SHOW_DELAY_MS = 0
// Grace period so you can move from trigger → card without it vanishing.
const HIDE_DELAY_MS = 500

let showTimer: ReturnType<typeof setTimeout> | null = null
let hideTimer: ReturnType<typeof setTimeout> | null = null
let token = 0
let routerHookInstalled = false

function clearTimer(t: ReturnType<typeof setTimeout> | null) {
  if (t) clearTimeout(t)
}

export function useWordDefinitionPopover() {
  const state = useState<PopoverState>('moh.wordDefinitionPopover.v1', () => ({
    open: false,
    payload: null,
    x: 0,
    y: 0,
    anchorX: 0,
    anchorY: 0,
    hoveringTrigger: false,
    hoveringCard: false,
    locked: false,
  }))

  function setMousePos(e: MouseEvent) {
    state.value.x = Math.floor(e.clientX)
    state.value.y = Math.floor(e.clientY)
  }

  function cancelPending() {
    token++
    clearTimer(showTimer)
    showTimer = null
    state.value.hoveringTrigger = false
  }

  function close() {
    state.value.open = false
    state.value.payload = null
    state.value.hoveringTrigger = false
    state.value.hoveringCard = false
    state.value.locked = false
    token++
    clearTimer(showTimer)
    clearTimer(hideTimer)
    showTimer = null
    hideTimer = null
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
      state.value.payload = null
    }, HIDE_DELAY_MS)
  }

  function onTriggerEnter(params: { payload: WordDefinitionPopoverPayload; event: MouseEvent }) {
    if (!import.meta.client) return
    const word = (params.payload?.word ?? '').trim()
    const sourceUrl = (params.payload?.sourceUrl ?? '').trim()
    if (!word || !sourceUrl) return

    setMousePos(params.event)

    // If the user is interacting with the open card (or it's locked for a modal),
    // do not switch targets or reset state.
    if (state.value.open && (state.value.hoveringCard || state.value.locked)) {
      return
    }

    // If we're already showing this word, treat as a no-op hover refresh.
    if (state.value.open && state.value.payload?.word.toLowerCase() === word.toLowerCase()) {
      state.value.hoveringTrigger = true
      clearTimer(hideTimer)
      hideTimer = null
      state.value.anchorX = state.value.x
      state.value.anchorY = state.value.y
      return
    }

    // Only one popover at a time.
    state.value.open = false
    state.value.payload = null

    token++
    const myToken = token

    state.value.hoveringTrigger = true

    clearTimer(showTimer)
    clearTimer(hideTimer)
    const doShow = () => {
      if (myToken !== token) return
      if (!state.value.hoveringTrigger) return

      state.value.payload = {
        word,
        definition: params.payload.definition ?? null,
        definitionHtml: params.payload.definitionHtml ?? null,
        sourceUrl,
      }
      // Freeze position once open so it doesn't “chase” the cursor.
      state.value.anchorX = state.value.x
      state.value.anchorY = state.value.y
      state.value.open = true
    }

    if (SHOW_DELAY_MS <= 0) {
      doShow()
    } else {
      showTimer = setTimeout(doShow, SHOW_DELAY_MS)
    }
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

