import { useDebounceFn, useWindowSize } from '@vueuse/core'

export function useTwoPaneLayout<T>(
  selected: Ref<T | null>,
  options: { minWidth?: number; minHeight?: number; leftCols?: string; rightCols?: string } = {}
) {
  const { width, height } = useWindowSize({ includeScrollbar: false })
  const minWidth = options.minWidth ?? 768
  const minHeight = options.minHeight ?? 680
  const leftCols = options.leftCols ?? '22rem'
  const rightCols = options.rightCols ?? '1fr'

  // Debounce viewport check to avoid layout thrashing when Windows Chrome fires
  // dimension changes (e.g. scrollbar appearance, taskbar auto-hide).
  const debouncedWidth = ref(width.value)
  const debouncedHeight = ref(height.value)
  const updateDebounced = useDebounceFn(() => {
    debouncedWidth.value = width.value
    debouncedHeight.value = height.value
  }, 100)
  watch([width, height], updateDebounced, { immediate: true })

  const isTinyViewport = computed(() => {
    if (!import.meta.client) return false
    // Tiny = narrow OR short. In this mode, never stack list+detail; show only one pane.
    return debouncedWidth.value < minWidth || debouncedHeight.value < minHeight
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

