export type ConfirmOptions = {
  header: string
  message?: string
  cancelLabel?: string
  showCancel?: boolean
  confirmLabel?: string
  confirmSeverity?: 'danger' | 'primary' | 'secondary' | 'warning' | 'info' | 'success'
  confirmIcon?: string
}

// Module-level singleton — one dialog at a time, globally.
const _visible = ref(false)
const _options = ref<ConfirmOptions | null>(null)
let _resolveFn: ((v: boolean) => void) | null = null

function _settle(value: boolean) {
  _visible.value = false
  _resolveFn?.(value)
  _resolveFn = null
}

export function useAppConfirm() {
  function confirm(options: ConfirmOptions): Promise<boolean> {
    _options.value = options
    _visible.value = true
    return new Promise<boolean>((resolve) => {
      _resolveFn = resolve
    })
  }

  return { confirm, _visible, _options, _settle }
}
