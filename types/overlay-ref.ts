/** Imperative surface of a PrimeVue Popover/Menu template ref. */
export type OverlayPanelHandle = {
  toggle: (event: Event, target?: HTMLElement | null) => void
  show: (event: Event, target?: HTMLElement | null) => void
  hide: () => void
}
