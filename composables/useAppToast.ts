import { pickTextColorForBg } from '~/utils/color-contrast'
import { PRIMARY_ONLYME_PURPLE, PRIMARY_PREMIUM_ORANGE, PRIMARY_VERIFIED_BLUE } from '~/utils/theme-tint'
import { getSafeUserErrorMessage } from '~/utils/api-error'

export type AppToastTone = 'public' | 'verifiedOnly' | 'premiumOnly' | 'onlyMe' | 'group' | 'success' | 'error'

export type AppToastAction = {
  /** Stable id for keying. Optional. */
  id?: string
  label: string
  /** When true, button uses solid/primary styling. */
  primary?: boolean
  /**
   * Called when the user taps the action. Receives the toast id so the
   * handler can decide whether to keep the toast open. The toast is dismissed
   * automatically unless `keepOpen` is returned `true`.
   */
  onClick?: (toastId: string) => void | boolean | Promise<void | boolean>
  /** When true, do NOT dismiss the toast after click (handler can dismiss explicitly). */
  keepOpen?: boolean
}

export type AppToast = {
  id: string
  title: string
  message?: string | null
  tone?: AppToastTone | null
  color?: string | null // hex like "#RRGGBB"
  /**
   * Auto-dismiss duration in ms. Ignored when `persistent` is true OR when
   * `actions` is non-empty (interactive toasts wait for the user).
   */
  durationMs?: number | null
  /**
   * Optional in-app navigation target. Only used when there are no `actions`.
   * When set without actions, the entire toast row is the action.
   */
  to?: string | null
  /**
   * When set, renders action buttons. The toast row itself is NOT clickable
   * (no `to` navigation), so each touch zone is unambiguous: the buttons.
   */
  actions?: AppToastAction[] | null
  /** When true, the toast does not auto-dismiss; user must close or act on it. */
  persistent?: boolean
  /** When true, title and message stack vertically (title 1 line, message up to 2 lines). */
  stacked?: boolean
}

function randomId() {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}


function toneToBg(tone: AppToastTone): string {
  if (tone === 'verifiedOnly') return PRIMARY_VERIFIED_BLUE[500]
  if (tone === 'premiumOnly') return PRIMARY_PREMIUM_ORANGE[500]
  if (tone === 'onlyMe') return PRIMARY_ONLYME_PURPLE[500]
  if (tone === 'group') return '#0ea5e9'
  if (tone === 'success') return '#16A34A'
  if (tone === 'error') return '#DC2626'
  // public / default: deep neutral
  return '#111827'
}

export function useAppToast() {
  const toasts = useState<AppToast[]>('app-toasts', () => [])

  function push(input: Omit<AppToast, 'id'>): string {
    const id = randomId()
    const actions = Array.isArray(input.actions) && input.actions.length > 0 ? input.actions : null
    // Interactive toasts (with buttons) wait for the user — never auto-dismiss
    // and ignore the row as a navigation target.
    const persistent = Boolean(input.persistent) || Boolean(actions)
    const durationMs = persistent
      ? null
      : (typeof input.durationMs === 'number' && Number.isFinite(input.durationMs)
          ? clamp(Math.floor(input.durationMs), 800, 15000)
          : 3600)

    const toast: AppToast = {
      id,
      title: String(input.title || ''),
      message: input.message ?? null,
      tone: input.tone ?? null,
      color: input.color ?? null,
      durationMs,
      // Mutually exclusive with actions: only one touch zone.
      to: actions ? null : (input.to ?? null),
      actions,
      persistent,
      stacked: input.stacked ?? false,
    }

    // Keep the stack small.
    toasts.value = [...toasts.value.slice(-2), toast]
    return id
  }

  function pushError(e: unknown, fallback = 'Something went wrong.'): string {
    // Uses the hardened path; technical strings are never used as toast titles.
    return push({ title: getSafeUserErrorMessage(e, fallback), tone: 'error' })
  }

  function dismiss(id: string) {
    toasts.value = toasts.value.filter((t) => t.id !== id)
  }

  function clear() {
    toasts.value = []
  }

  function bgFor(toast: AppToast): string {
    const bg = toast.color ?? (toast.tone ? toneToBg(toast.tone) : toneToBg('public'))
    return bg
  }

  function fgFor(toast: AppToast): string {
    // Brand preference: premium orange should always be white text.
    if (toast.tone === 'premiumOnly') return '#ffffff'
    // Verified blue reads best with white text.
    if (toast.tone === 'verifiedOnly') return '#ffffff'
    // Group sky blue reads best with white text.
    if (toast.tone === 'group') return '#ffffff'
    const bg = bgFor(toast)
    return pickTextColorForBg(bg)
  }

  return { toasts, push, pushError, dismiss, clear, bgFor, fgFor }
}

