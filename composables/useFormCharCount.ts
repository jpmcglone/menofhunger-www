/**
 * Simple composable for form fields with max length / char count.
 * Use with AppFormField's #helper slot.
 */
export function useFormCharCount(value: Ref<string>, max: number) {
  const current = computed(() => (value.value ?? '').trim().length)
  const display = computed(() => `${current.value}/${max}`)
  const isOver = computed(() => current.value > max)
  return { current, max, display, isOver }
}
