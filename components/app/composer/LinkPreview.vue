<template>
  <AppPostRowLinkPreview
    v-if="settledText" :key="settledText" :post-id="previewId" :body="settledText"
    :has-media="Boolean(hasMedia)" :row-in-view="true" preview-only dismissible
    class="text-left" aria-label="Post link preview" data-testid="composer-link-preview"
  />
</template>

<script setup lang="ts">
const props = defineProps<{ text: string; hasMedia?: boolean }>()
const previewId = `composer-preview-${useId()}`
const settledText = ref('')
watch(() => props.text, (text, _old, onCleanup) => {
  settledText.value = ''
  const timer = setTimeout(() => { settledText.value = text.trim() }, 350)
  onCleanup(() => clearTimeout(timer))
}, { immediate: true })
</script>
