<!-- Figma: https://www.figma.com/design/YnuRSJB7p90n9jEY4mb4RN?node-id=890-4577 -->
<template>
  <Dialog :visible="true" modal :closable="true" :style="{ width: '26rem', maxWidth: '95vw' }" :pt="{ root: { class: '!rounded-2xl' } }" @update:visible="emit('close')">
    <template #header>
      <div class="flex items-center gap-3">
        <AppIconGlyph name="article" :size="22" />
        <span class="text-lg font-bold text-[var(--moh-text)]">Publish article</span>
      </div>
    </template>

    <div class="space-y-1">
      <div class="flex min-h-11 items-center justify-between gap-3 py-2">
        <label for="article-post-to-board" class="flex-1 cursor-pointer">
          <span class="block text-sm font-semibold moh-text">Also post to the Board</span>
          <span class="block text-xs moh-text-muted">Creates a Board post linking here. Comments stay on the article.</span>
        </label>
        <ToggleSwitch v-model="postToBoard" input-id="article-post-to-board" />
      </div>
      <div class="flex min-h-11 items-center justify-between gap-3 py-2" :class="postToBoard ? '' : 'opacity-50'">
        <label for="article-board-to-feed" class="flex-1 cursor-pointer">
          <span class="block text-sm font-semibold moh-text">Also post to feed</span>
          <span class="block text-xs moh-text-muted">The Board post also appears in the feed.</span>
        </label>
        <ToggleSwitch v-model="shareToFeed" input-id="article-board-to-feed" :disabled="!postToBoard" />
      </div>
    </div>

    <div class="mt-5 flex justify-end gap-2">
      <button type="button" class="moh-tap min-h-11 px-4 text-sm moh-text-muted hover:text-[var(--moh-text)]" @click="emit('close')">Cancel</button>
      <AppActionButton label="Publish" kind="brand" :loading="publishing" @click="emit('confirm', { postToBoard, shareToFeed })" />
    </div>
  </Dialog>
</template>

<script setup lang="ts">
defineProps<{ publishing?: boolean }>()
const emit = defineEmits<{
  close: []
  confirm: [options: { postToBoard: boolean; shareToFeed: boolean }]
}>()

const api = useBoardApi()
const postToBoard = ref(true)
const shareToFeed = ref(true)

useOverlayDismiss(() => true, () => emit('close'))

onMounted(async () => {
  try {
    const prefs = await api.getPreferences()
    postToBoard.value = prefs.articlePostToBoardDefault
    shareToFeed.value = prefs.shareToFeedDefault
  } catch {
    // Keep defaults (both on).
  }
})
</script>
