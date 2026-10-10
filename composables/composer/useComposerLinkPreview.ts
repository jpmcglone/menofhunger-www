import { usePostLinkTargets } from '~/composables/post-row/usePostLinkTargets'

/** Debounce changed preview targets while keeping the current card alive during prose edits. */
export function useComposerLinkPreview(props: { text: string; hasMedia?: boolean }) {
  const targets = usePostLinkTargets({
    get body() { return props.text },
    get hasMedia() { return Boolean(props.hasMedia) },
    rowInView: true,
  })
  const targetKey = computed(() => JSON.stringify([
    targets.previewLink.value,
    targets.embeddedPostId.value,
    targets.embeddedArticleId.value,
    targets.embeddedSpaceId.value,
    targets.embeddedSpaceUsername.value,
    targets.embeddedUsername.value,
  ]))
  const settledTargetKey = ref<string | null>(null)
  watch(targetKey, (key, _old, onCleanup) => {
    settledTargetKey.value = null
    const timer = setTimeout(() => { settledTargetKey.value = key }, 350)
    onCleanup(() => clearTimeout(timer))
  }, { immediate: true })

  return computed(() => settledTargetKey.value === targetKey.value ? props.text.trim() : '')
}
