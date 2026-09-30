/**
 * Surfaces portaled to `document.body`. They do not inherit a parent's z-index.
 * PrimeVue dialogs use the modal band (1100). A menu opened from one of them
 * must use `nestedMenu`, not a guessed number under that band.
 */
export const OVERLAY_LAYERS = {
  accountBackdrop: 9998,
  accountMenu: 9999,
  bottomSheet: 10000,
  nestedMenu: 10001,
} as const
