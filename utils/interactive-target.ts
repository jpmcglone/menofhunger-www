/**
 * Whether a click landed on (or inside) a control that must keep its own behavior, so a clickable
 * row should not also navigate. Presets mirror the control sets the row variants have always used.
 */
const BASIC = ['a', 'button', 'iframe', 'input', 'textarea', 'select', '[role="menu"]', '[role="menuitem"]', '[data-pc-section]']
const MEDIA = ['video', 'audio', '[role="button"]']

const PRESETS = {
  /** Cards and list rows. */
  basic: BASIC,
  /** Board feed rows: media controls and nested interactive regions. */
  media: [...BASIC, ...MEDIA, '[data-post-row-interactive]'],
  /** Notification rows: media controls and editable regions. */
  notification: [...BASIC, ...MEDIA, '[contenteditable="true"]'],
  /** Post rows: media controls, editable regions, and nested interactive regions. */
  postRow: [...BASIC, ...MEDIA, '[contenteditable="true"]', '[data-post-row-interactive]'],
  /** Space rows: the whole card is the link, so anchors inside do not opt out. */
  space: BASIC.filter((selector) => selector !== 'a'),
  /** Scheduled-post rows. */
  scheduled: ['[data-post-row-interactive]', 'button', 'a', 'input', 'textarea', 'select', '[role="button"]'],
} as const

export type InteractiveTargetPreset = keyof typeof PRESETS

export function isInteractiveTarget(target: EventTarget | null, preset: InteractiveTargetPreset = 'basic'): boolean {
  const el = target instanceof Element ? target : (target as Node | null)?.parentElement ?? null
  if (!el) return false
  return Boolean(el.closest(PRESETS[preset].join(',')))
}
