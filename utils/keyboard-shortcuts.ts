import type { InjectionKey } from 'vue'
import type { ShortcutAction } from '~/composables/useKeyboardShortcuts'

export type ShortcutMediaActions = {
  previousMedia?: () => void
  nextMedia?: () => void
}

export type ShortcutActions = {
  routeFor: (action: ShortcutAction) => string | undefined
  execute: (action: ShortcutAction, media?: ShortcutMediaActions) => void
}

export const MOH_SHORTCUT_ACTIONS_KEY: InjectionKey<ShortcutActions> = Symbol('moh-shortcut-actions')
