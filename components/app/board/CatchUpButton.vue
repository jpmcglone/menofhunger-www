<template>
  <button
    v-if="isAuthed"
    v-tooltip.bottom="tinyTooltip(ready ? 'Catch me up — summary ready' : 'Catch me up — M.A.R.V summarizes this discussion')"
    type="button"
    class="moh-tap moh-pressable inline-flex size-9 items-center justify-center rounded-full transition-opacity hover:opacity-70 disabled:opacity-50"
    aria-label="Catch me up with M.A.R.V"
    :disabled="opening"
    @click.stop.prevent="open"
  >
    <AppIconGlyph name="catchup" :size="22" :selected="ready" />
  </button>
</template>

<script setup lang="ts">
import type { GetPostData } from '~/types/api'
import { isPostCaughtUp } from '~/composables/useMarvCatchUp'
import { getApiErrorMessage } from '~/utils/api-error'
import { tinyTooltip } from '~/utils/tiny-tooltip'

/** Board posts and comments are posts, so they share the post catch-up flow and cache. */
const props = defineProps<{ postId: string }>()

const { isAuthed } = useAuth()
const { apiFetchData } = useApiClient()
const toast = useAppToast()
const { show, post: catchUpPost, result } = useMarvCatchUp()

// localStorage is client-only; read after mount so SSR and hydration render the same icon.
const persistedReady = ref(false)
onMounted(() => { persistedReady.value = isPostCaughtUp(props.postId) })
watch(() => props.postId, (id) => { persistedReady.value = isPostCaughtUp(id) })
const sessionReady = computed(() => catchUpPost.value?.id === props.postId && Boolean(result.value))
watch(sessionReady, (v) => { if (v) persistedReady.value = true })
const ready = computed(() => sessionReady.value || persistedReady.value)

const opening = ref(false)
async function open() {
  if (opening.value) return
  opening.value = true
  try {
    const post = await apiFetchData<GetPostData>(`/posts/${encodeURIComponent(props.postId)}`, { method: 'GET' })
    show(post)
  } catch (e) {
    toast.push({ title: getApiErrorMessage(e) || 'Couldn’t open catch me up.', tone: 'error', durationMs: 2000 })
  } finally {
    opening.value = false
  }
}
</script>
