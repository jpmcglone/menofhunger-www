import type { InjectionKey, Ref } from 'vue'
import type { FeedPost } from '~/types/api'

export const MOH_MIDDLE_SCROLLER_KEY: InjectionKey<Ref<HTMLElement | null>> = Symbol('moh-middle-scroller')

export type ComposerVisibility = 'public' | 'verifiedOnly' | 'premiumOnly' | 'onlyMe'
export type ComposerOpenOptions = {
  visibility?: ComposerVisibility
  initialText?: string | null
  placeholder?: string | null
  allowedVisibilities?: ComposerVisibility[] | null
  disableMedia?: boolean
  createPost?: (
    body: string,
    visibility: ComposerVisibility,
    media?: unknown[] | null,
    poll?: unknown | null,
  ) => Promise<{ id: string } | FeedPost | null>
}
export const MOH_OPEN_COMPOSER_KEY: InjectionKey<
  (visibilityOrOptions?: ComposerVisibility | ComposerOpenOptions, initialText?: string | null) => void
> = Symbol('moh-open-composer')

/** Open the main composer modal to publish an only-me post/draft (copies content; cannot post as onlyMe). */
export const MOH_OPEN_COMPOSER_FROM_ONLYME_KEY: InjectionKey<(post: FeedPost) => void> = Symbol('moh-open-composer-from-onlyme')

/** Ref provided by layout, updated by home page when its composer is in the middle column viewport (hides mobile FAB). */
export const MOH_HOME_COMPOSER_IN_VIEW_KEY: InjectionKey<Ref<boolean>> = Symbol('moh-home-composer-in-view')

/** Provided by the home page: focuses the inline composer textarea when called. */
export const MOH_FOCUS_HOME_COMPOSER_KEY: InjectionKey<() => void> = Symbol('moh-focus-home-composer')

