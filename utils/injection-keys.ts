import type { InjectionKey, Ref } from 'vue'

export const MOH_MIDDLE_SCROLLER_KEY: InjectionKey<Ref<HTMLElement | null>> = Symbol('moh-middle-scroller')

export type ComposerVisibility = 'public' | 'verifiedOnly' | 'premiumOnly' | 'onlyMe'
export const MOH_OPEN_COMPOSER_KEY: InjectionKey<(visibility?: ComposerVisibility) => void> = Symbol('moh-open-composer')

