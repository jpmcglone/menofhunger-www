import type { CommunityGroupShell } from '~/types/api'

type GroupPopoverState = {
  open: boolean
  shell: CommunityGroupShell | null
  x: number
  y: number
  anchorX: number
  anchorY: number
  hoveringTrigger: boolean
  hoveringCard: boolean
  locked: boolean
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
    const m = await import('./useUserPreviewPopover')
    m.useUserPreviewPopover().close()
  } catch {
    // ignore
  }
}

export function useGroupPreviewPopover() {
  const state = useState<GroupPopoverState>('moh.groupPreviewPopover.v1', () => ({
    open: false,
    shell: null,
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
    state.value.shell = null
    state.value.hoveringTrigger = false
    state.value.hoveringCard = false
    state.value.locked = false
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
      state.value.shell = null
    }, HIDE_DELAY_MS)
  }

  function onTriggerEnter(params: { shell: CommunityGroupShell; event: MouseEvent }) {
    if (!import.meta.client) return
    const shell = params.shell
    if (!shell?.id || !shell.slug) return

    setMousePos(params.event)

    if (state.value.open && (state.value.hoveringCard || state.value.locked)) {
      return
    }

    if (state.value.open && state.value.shell?.id === shell.id) {
      state.value.hoveringTrigger = true
      clearTimer(hideTimer)
      hideTimer = null
      state.value.anchorX = state.value.x
      state.value.anchorY = state.value.y
      return
    }

    void closeOtherPreviewPopovers()

    state.value.open = false
    state.value.shell = null

    token++
    const myToken = token

    state.value.hoveringTrigger = true

    clearTimer(showTimer)
    clearTimer(hideTimer)
    showTimer = setTimeout(() => {
      if (myToken !== token) return
      if (!state.value.hoveringTrigger) return

      state.value.shell = shell
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
