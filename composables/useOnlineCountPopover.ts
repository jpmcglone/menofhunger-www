type OnlineCountRowTone = 'premium' | 'verified' | 'unverified'

export type OnlineCountRow = {
  key: 'premiumPlus' | 'premium' | 'verified' | 'unverified'
  label: string
  count: number
  tone: OnlineCountRowTone
}

type PopoverState = {
  open: boolean
  x: number
  y: number
  anchorX: number
  anchorY: number
  hoveringTrigger: boolean
  hoveringCard: boolean
  rows: OnlineCountRow[]
}

const SHOW_DELAY_MS = 200
const HIDE_DELAY_MS = 400

let showTimer: ReturnType<typeof setTimeout> | null = null
let hideTimer: ReturnType<typeof setTimeout> | null = null
let routerHookInstalled = false

function clearTimer(t: ReturnType<typeof setTimeout> | null) {
  if (t) clearTimeout(t)
}

export function useOnlineCountPopover() {
  const state = useState<PopoverState>('moh.onlineCountPopover.v1', () => ({
    open: false,
    x: 0,
    y: 0,
    anchorX: 0,
    anchorY: 0,
    hoveringTrigger: false,
    hoveringCard: false,
    rows: [],
  }))

  function setMousePos(e: MouseEvent) {
    state.value.x = Math.floor(e.clientX)
    state.value.y = Math.floor(e.clientY)
  }

  function close() {
    state.value.open = false
    state.value.hoveringTrigger = false
    state.value.hoveringCard = false
    clearTimer(showTimer)
    clearTimer(hideTimer)
    showTimer = null
    hideTimer = null
  }

  function cancelPending() {
    clearTimer(showTimer)
    showTimer = null
  }

  function scheduleHide() {
    if (!import.meta.client) return
    clearTimer(hideTimer)
    hideTimer = setTimeout(() => {
      if (state.value.hoveringTrigger) return
      if (state.value.hoveringCard) return
      state.value.open = false
    }, HIDE_DELAY_MS)
  }

  function onTriggerEnter(e: MouseEvent) {
    if (!import.meta.client) return
    if (!state.value.rows || state.value.rows.length === 0) return

    setMousePos(e)
    state.value.hoveringTrigger = true
    clearTimer(hideTimer)
    hideTimer = null

    if (state.value.open) {
      state.value.anchorX = state.value.x
      state.value.anchorY = state.value.y
      return
    }

    clearTimer(showTimer)
    showTimer = setTimeout(() => {
      if (!state.value.hoveringTrigger) return
      if (!state.value.rows || state.value.rows.length === 0) return
      state.value.anchorX = state.value.x
      state.value.anchorY = state.value.y
      state.value.open = true
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

  function setRows(rows: OnlineCountRow[]) {
    state.value.rows = Array.isArray(rows) ? rows : []
    // If rows go empty, don't leave an empty popover hanging around.
    if (state.value.rows.length === 0) close()
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

  return {
    state,
    setRows,
    close,
    cancelPending,
    onTriggerEnter,
    onTriggerMove,
    onTriggerLeave,
    onCardEnter,
    onCardLeave,
  }
}

