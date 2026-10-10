<template>
  <AppPostRowLinkPreview
    v-if="settledText" :post-id="previewId" :body="settledText"
    :has-media="Boolean(hasMedia)" :row-in-view="true" preview-only dismissible
    class="text-left" aria-label="Post link preview" data-testid="composer-link-preview"
  />
</template>

<script setup lang="ts">
import { useComposerLinkPreview } from '~/composables/composer/useComposerLinkPreview'

const props = defineProps<{ text: string; hasMedia?: boolean }>()
const previewId = `composer-preview-${useId()}`
const settledText = useComposerLinkPreview(props)
</script>
