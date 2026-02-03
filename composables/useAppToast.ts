import { PRIMARY_ONLYME_PURPLE, PRIMARY_PREMIUM_ORANGE, PRIMARY_VERIFIED_BLUE } from '~/utils/theme-tint'

export type AppToastTone = 'public' | 'verifiedOnly' | 'premiumOnly' | 'onlyMe' | 'success' | 'error'

export type AppToast = {
  id: string
  title: string
  message?: string | null
  tone?: AppToastTone | null
  color?: string | null // hex like "#RRGGBB"
  durationMs?: number | null
  to?: string | null
}

function randomId() {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

function parseHexColor(input: string): { r: number; g: number; b: number } | null {
  const s = (input || '').trim()
  if (!s) return null
  const hex = s.startsWith('#') ? s.slice(1) : s
  if (hex.length === 3) {
    const r1 = hex.slice(0, 1)
    const g1 = hex.slice(1, 2)
    const b1 = hex.slice(2, 3)
    const r = parseInt(r1 + r1, 16)
    const g = parseInt(g1 + g1, 16)
    const b = parseInt(b1 + b1, 16)
    if ([r, g, b].some((v) => Number.isNaN(v))) return null
    return { r, g, b }
  }
  if (hex.length === 6) {
    const r = parseInt(hex.slice(0, 2), 16)
    const g = parseInt(hex.slice(2, 4), 16)
    const b = parseInt(hex.slice(4, 6), 16)
    if ([r, g, b].some((v) => Number.isNaN(v))) return null
    return { r, g, b }
  }
  return null
}

function relLuminance(rgb: { r: number; g: number; b: number }): number {
  // WCAG relative luminance for sRGB.
  const toLin = (c255: number) => {
    const c = c255 / 255
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  }
  const r = toLin(rgb.r)
  const g = toLin(rgb.g)
  const b = toLin(rgb.b)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contrastRatio(l1: number, l2: number): number {
  const a = Math.max(l1, l2)
  const b = Math.min(l1, l2)
  return (a + 0.05) / (b + 0.05)
}

export function pickTextColorForBg(bgHex: string): '#ffffff' | '#111827' {
  const rgb = parseHexColor(bgHex)
  if (!rgb) return '#ffffff'
  const lum = relLuminance(rgb)
  const cWhite = contrastRatio(lum, 1)
  const cBlack = contrastRatio(lum, 0)
  return cWhite >= cBlack ? '#ffffff' : '#111827'
}

function toneToBg(tone: AppToastTone): string {
  if (tone === 'verifiedOnly') return PRIMARY_VERIFIED_BLUE[500]
  if (tone === 'premiumOnly') return PRIMARY_PREMIUM_ORANGE[500]
  if (tone === 'onlyMe') return PRIMARY_ONLYME_PURPLE[500]
  if (tone === 'success') return '#16A34A'
  if (tone === 'error') return '#DC2626'
  // public / default: deep neutral
  return '#111827'
}

export function useAppToast() {
  const toasts = useState<AppToast[]>('app-toasts', () => [])

  function push(input: Omit<AppToast, 'id'>): string {
    const id = randomId()
    const durationMs =
      typeof input.durationMs === 'number' && Number.isFinite(input.durationMs)
        ? clamp(Math.floor(input.durationMs), 800, 15000)
        : 2600

    const toast: AppToast = {
      id,
      title: String(input.title || ''),
      message: input.message ?? null,
      tone: input.tone ?? null,
      color: input.color ?? null,
      durationMs,
      to: input.to ?? null,
    }

    console.log('[useAppToast] push - toast:', toast, 'toasts count before:', toasts.value.length)
    // Keep the stack small.
    toasts.value = [...toasts.value.slice(-2), toast]
    console.log('[useAppToast] push - toasts count after:', toasts.value.length)
    return id
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
    const bg = bgFor(toast)
    return pickTextColorForBg(bg)
  }

  return { toasts, push, dismiss, clear, bgFor, fgFor }
}

