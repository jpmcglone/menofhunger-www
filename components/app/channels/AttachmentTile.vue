<!-- Figma: https://www.figma.com/design/YnuRSJB7p90n9jEY4mb4RN?node-id=1206-2635 -->
<template>
  <div class="relative size-[72px] shrink-0 overflow-hidden rounded-xl bg-[var(--moh-surface-2)]" :class="state === 'failed' ? 'ring-2 ring-red-600' : ''" :aria-busy="state === 'uploading'">
    <img v-if="previewUrl && kind === 'image'" :src="previewUrl" alt="" class="size-full object-cover" :class="state === 'uploading' ? 'opacity-60' : ''">
    <video v-else-if="previewUrl && kind === 'video'" :src="previewUrl" class="size-full object-cover" :class="state === 'uploading' ? 'opacity-60' : ''" muted playsinline preload="metadata" />
    <span v-else class="flex size-full items-center justify-center moh-text-muted"><Icon :name="kind === 'audio' ? 'tabler:microphone' : 'tabler:photo'" size="24" aria-hidden="true" /></span>
    <span v-if="state === 'uploading'" class="absolute inset-0 flex items-center justify-center" role="status" aria-label="Uploading"><span class="size-6 animate-spin rounded-full border-2 border-current border-t-transparent" /></span>
    <span v-else-if="state === 'failed'" class="absolute inset-0 flex items-center justify-center text-red-600"><Icon name="tabler:alert-circle" size="24" aria-hidden="true" /></span>
  </div>
</template>
<script setup lang="ts">
const props = defineProps<{ file?: File; imageUrl?: string; state: 'ready' | 'uploading' | 'failed' }>()
const objectUrl = ref<string>()
const kind = computed(() => {
  const type = props.file?.type ?? ''
  return type.startsWith('video/') ? 'video' : type.startsWith('audio/') ? 'audio' : 'image'
})
// Object URLs exist only in the browser, so server markup and first client render both show the icon.
watch(() => props.file, (file) => {
  if (objectUrl.value) URL.revokeObjectURL(objectUrl.value)
  objectUrl.value = file && !file.type.startsWith('audio/') ? URL.createObjectURL(file) : undefined
}, { immediate: false })
onMounted(() => { if (props.file && !props.file.type.startsWith('audio/')) objectUrl.value = URL.createObjectURL(props.file) })
onBeforeUnmount(() => { if (objectUrl.value) URL.revokeObjectURL(objectUrl.value) })
const previewUrl = computed(() => objectUrl.value ?? props.imageUrl)
</script>
