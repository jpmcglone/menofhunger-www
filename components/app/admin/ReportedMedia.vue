<template>
  <div>
    <img v-if="image" :src="image" alt="Reported attachment" class="max-h-80 max-w-full object-contain" >
    <video v-else-if="media.kind === 'video'" :src="url" controls crossorigin="use-credentials" preload="metadata" class="max-h-80 max-w-full" />
    <audio v-else-if="media.kind === 'audio'" :src="url" controls crossorigin="use-credentials" preload="metadata" />
    <p v-else-if="error" class="text-sm moh-text-muted">Reported attachment unavailable.</p>
  </div>
</template>
<script setup lang="ts">
const props = defineProps<{ reportId: string; media: { id: string; kind: string } }>()
const { apiUrl, apiFetchBlob } = useApiClient()
const path = computed(() => `/admin/reports/${props.reportId}/media/${props.media.id}`)
const url = computed(() => apiUrl(path.value))
const image = ref<string | null>(null), error = ref(false)
let closed = false
onMounted(async () => { if (['video', 'audio'].includes(props.media.kind)) return; try { const blob = await apiFetchBlob(path.value); if (!closed) image.value = URL.createObjectURL(blob) } catch { error.value = true } })
onBeforeUnmount(() => { closed = true; if (image.value) URL.revokeObjectURL(image.value) })
</script>
