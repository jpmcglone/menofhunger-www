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

// Module-level singleton — one dialog at a time, globally.
const _visible = ref(false)
const _options = ref<ConfirmOptions | null>(null)
let _resolveFn: ((v: ConfirmResult) => void) | null = null

function _settle(value: ConfirmResult) {
  _visible.value = false
  _resolveFn?.(value)
  _resolveFn = null
}

export function useAppConfirm() {
  function confirm(options: ConfirmOptions): Promise<ConfirmResult> {
    _options.value = options
    _visible.value = true
    return new Promise<ConfirmResult>((resolve) => {
      _resolveFn = resolve
    })
  }

  return { confirm, _visible, _options, _settle }
}
