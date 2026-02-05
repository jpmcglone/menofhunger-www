import type { InjectionKey, Ref } from 'vue'

export const MOH_MIDDLE_SCROLLER_KEY: InjectionKey<Ref<HTMLElement | null>> = Symbol('moh-middle-scroller')

export type ComposerVisibility = 'public' | 'verifiedOnly' | 'premiumOnly' | 'onlyMe'
export const MOH_OPEN_COMPOSER_KEY: InjectionKey<(visibility?: ComposerVisibility, initialText?: string | null) => void> = Symbol('moh-open-composer')

/** Ref provided by layout, updated by home page when its composer is in the middle column viewport (hides mobile FAB). */
export const MOH_HOME_COMPOSER_IN_VIEW_KEY: InjectionKey<Ref<boolean>> = Symbol('moh-home-composer-in-view')

