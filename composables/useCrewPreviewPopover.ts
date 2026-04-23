import type { CrewPublic } from '~/types/api'

type CrewPopoverState = {
  open: boolean
  crew: CrewPublic | null
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
let routerHookInstalled = false

function clearTimer(t: ReturnType<typeof setTimeout> | null) {
  if (t) clearTimeout(t)
}

async function closeOtherPreviewPopovers() {
  try {
    const m = await import('./useGroupPreviewPopover')
    m.useGroupPreviewPopover().close()
  } catch {
    // ignore
  }
  try {
    const m = await import('./useUserPreviewPopover')
    m.useUserPreviewPopover().close()
  } catch {
    // ignore
  }
}

export function useCrewPreviewPopover() {
  const state = useState<CrewPopoverState>('moh.crewPreviewPopover.v1', () => ({
    open: false,
    crew: null,
    anchorX: 0,
    anchorY: 0,
    hoveringTrigger: false,
    hoveringCard: false,
  }))

  function cancelPending() {
    token++
    clearTimer(showTimer)
    showTimer = null
    state.value.hoveringTrigger = false
  }

  function close() {
    state.value.open = false
    state.value.crew = null
    state.value.hoveringTrigger = false
    state.value.hoveringCard = false
    token++
    clearTimer(showTimer)
    clearTimer(hideTimer)
    showTimer = null
    hideTimer = null
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
      state.value.crew = null
    }, HIDE_DELAY_MS)
  }

  function onTriggerEnter(params: { crew: CrewPublic; anchorEl: HTMLElement }) {
    if (!import.meta.client) return
    const crew = params.crew
    if (!crew?.id) return

    const rect = params.anchorEl.getBoundingClientRect()
    const anchorX = Math.floor(rect.left + rect.width / 2)
    const anchorY = Math.floor(rect.bottom)

    if (state.value.open && state.value.crew?.id === crew.id) {
      state.value.hoveringTrigger = true
      clearTimer(hideTimer)
      hideTimer = null
      return
    }

    void closeOtherPreviewPopovers()

    state.value.open = false
    state.value.crew = null

    token++
    const myToken = token
    state.value.hoveringTrigger = true

    clearTimer(showTimer)
    clearTimer(hideTimer)
    showTimer = setTimeout(() => {
      if (myToken !== token) return
      if (!state.value.hoveringTrigger) return
      state.value.crew = crew
      state.value.anchorX = anchorX
      state.value.anchorY = anchorY
      state.value.open = true
    }, SHOW_DELAY_MS)
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
    onTriggerLeave,
    onCardEnter,
    onCardLeave,
  }
}
