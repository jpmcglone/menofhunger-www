/**
 * Every surface portaled to `document.body` uses one of these values.
 * CSS mirrors them as `--moh-z-*` in `assets/css/main.css`. PrimeVue dialogs,
 * selects, menus, and tooltips use the same numbers via `nuxt.config`.
 *
 * A menu or select is `menu`, above `modal`, so a dropdown opened inside a
 * dialog paints on top. Do not invent another z-index.
 */
export const OVERLAY_LAYERS = {
  dragGhost: 2000,
  mediaBar: 2100,
  chrome: 3000,
  celebration: 8000,
  accountBackdrop: 9900,
  accountMenu: 9950,
  bottomSheet: 10000,
  gate: 10400,
  modal: 11000,
  pinnedPlayer: 11100,
  /** Menus, selects, popovers, and preview cards. PrimeVue adds this to the dialog already open. */
  menu: 12000,
  nestedMenu: 12000,
  tooltip: 13000,
  callChrome: 14000,
  call: 14100,
  toast: 14200,
} as const

export type OverlayLayer = keyof typeof OVERLAY_LAYERS
