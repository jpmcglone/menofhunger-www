<template>
  <Dialog
    v-model:visible="shareCommentModalOpen"
    modal
    header="Share with note"
    :style="{ width: '32rem', maxWidth: '95vw' }"
  >
    <div class="space-y-3">
      <AppArticleShareCard v-if="articleSharePreview" :article="articleSharePreview" />
      <textarea
        v-model="shareCommentText"
        class="w-full rounded-xl border moh-border bg-transparent px-3 py-2 text-sm text-[var(--moh-text)] placeholder:text-[var(--moh-text-soft)] focus:outline-none focus:ring-2 focus:ring-[var(--moh-brass)]/30 resize-none min-h-[80px]"
        placeholder="Add a note (optional)…"
        rows="3"
      />
      <div class="flex justify-end gap-2">
        <Button label="Cancel" severity="secondary" @click="shareCommentModalOpen = false" />
        <Button label="Share" :loading="sharing" @click="onSubmitShareWithComment" />
      </div>
    </div>
  </Dialog>
</template>

<script setup lang="ts">
import { useArticlePageContext } from '~/composables/pages/article/useArticlePage'

const {
  shareCommentModalOpen,
  articleSharePreview,
  shareCommentText,
  sharing,
  onSubmitShareWithComment,
} = useArticlePageContext()
</script>

