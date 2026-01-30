import { MOH_MIDDLE_SCROLLER_KEY } from '~/utils/injection-keys'

export function useMiddleScroller() {
  const injected = inject(MOH_MIDDLE_SCROLLER_KEY, null)
  const fallback = ref<HTMLElement | null>(null)
  return injected ?? fallback
}

