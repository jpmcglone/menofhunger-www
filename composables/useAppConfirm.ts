export type ConfirmOptions = {
  header: string
  message?: string
  cancelLabel?: string
  showCancel?: boolean
  confirmLabel?: string
  confirmSeverity?: 'danger' | 'primary' | 'secondary' | 'warning' | 'info' | 'success'
  confirmIcon?: string
  /** Third action (e.g. Discard). Resolves as `'discard'`. */
  discardLabel?: string
}

export type ConfirmResult = boolean | 'discard'

// One dialog per Nuxt app, never shared across server requests. Promise callbacks stay
// outside serialized useState payloads and are released with the app instance.
const confirmations = new WeakMap<ReturnType<typeof useNuxtApp>, ReturnType<typeof createConfirmation>>()

function createConfirmation() {
  const _visible = ref(false)
  const _options = ref<ConfirmOptions | null>(null)
  let resolvePending: ((value: ConfirmResult) => void) | null = null

  function _settle(value: ConfirmResult) {
    _visible.value = false
    const resolve = resolvePending
    resolvePending = null
    _options.value = null
    resolve?.(value)
  }

  function confirm(options: ConfirmOptions): Promise<ConfirmResult> {
    _settle(false)
    _options.value = options
    _visible.value = true
    return new Promise<ConfirmResult>((resolve) => { resolvePending = resolve })
  }

  return { confirm, _visible, _options, _settle }
}

export function useAppConfirm() {
  const app = useNuxtApp()
  let confirmation = confirmations.get(app)
  if (!confirmation) {
    confirmation = createConfirmation()
    confirmations.set(app, confirmation)
  }
  return confirmation
}
