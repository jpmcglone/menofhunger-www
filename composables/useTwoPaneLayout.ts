import { useWindowSize } from '@vueuse/core'

export function useTwoPaneLayout<T>(
  selected: Ref<T | null>,
  options: { minWidth?: number; minHeight?: number; leftCols?: string; rightCols?: string } = {}
) {
  const { width, height } = useWindowSize()
  const minWidth = options.minWidth ?? 768
  const minHeight = options.minHeight ?? 680
  const leftCols = options.leftCols ?? '22rem'
  const rightCols = options.rightCols ?? '1fr'

  const isTinyViewport = computed(() => {
    if (!import.meta.client) return false
    // Tiny = narrow OR short. In this mode, never stack list+detail; show only one pane.
    return width.value < minWidth || height.value < minHeight
  })

  const showListPane = computed(() => (isTinyViewport.value ? !selected.value : true))
  const showDetailPane = computed(() => (isTinyViewport.value ? Boolean(selected.value) : true))

  // IMPORTANT: avoid dynamic Tailwind grid class strings (they won't be generated),
  // use inline gridTemplateColumns instead.
  const gridStyle = computed(() => {
    if (isTinyViewport.value) return {}
    return { gridTemplateColumns: `${leftCols} ${rightCols}` }
  })

  return { isTinyViewport, showListPane, showDetailPane, gridStyle }
}

