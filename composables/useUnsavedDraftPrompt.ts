import type { UnsavedDraftSnapshot } from '~/composables/useUnsavedDraftGuard'

export type UnsavedDraftPromptChoice = 'save' | 'discard' | 'cancel'

type PromptState = {
  open: boolean
  snapshot: UnsavedDraftSnapshot | null
}

let pendingResolve: ((choice: UnsavedDraftPromptChoice) => void) | null = null

export function useUnsavedDraftPrompt() {
  const state = useState<PromptState>('unsaved-draft-prompt', () => ({ open: false, snapshot: null }))

  function show(snapshot: UnsavedDraftSnapshot) {
    state.value = { open: true, snapshot }
  }

  function hide() {
    state.value = { open: false, snapshot: null }
  }

  function choose(choice: UnsavedDraftPromptChoice) {
    const resolve = pendingResolve
    pendingResolve = null
    hide()
    resolve?.(choice)
  }

  return {
    open: computed(() => state.value.open),
    snapshot: computed(() => state.value.snapshot),
    show,
    choose,
  }
}

export function promptUnsavedDraft(snapshot: UnsavedDraftSnapshot): Promise<UnsavedDraftPromptChoice> {
  const { show } = useUnsavedDraftPrompt()
  return new Promise<UnsavedDraftPromptChoice>((resolve) => {
    pendingResolve = resolve
    show(snapshot)
  })
}

