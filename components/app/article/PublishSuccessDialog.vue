<template>
  <Dialog :visible="true" modal :closable="true" :style="{ width: '24rem', maxWidth: '95vw' }" :pt="{ root: { class: '!rounded-2xl' } }" @update:visible="emit('close')">
    <template #header>
      <div class="flex items-center gap-3">
        <div class="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/40">
          <Icon name="tabler:check" class="text-lg text-green-600 dark:text-green-400" aria-hidden="true" />
        </div>
        <span class="text-lg font-bold text-[var(--moh-text)]">Article published!</span>
      </div>
    </template>

    <p class="text-sm moh-text-muted">
      "{{ article.title }}" is now live.
    </p>

    <div class="mt-5 space-y-2">
      <NuxtLink
        :to="`/a/${article.id}`"
        class="flex min-h-11 w-full items-center justify-center rounded-full bg-[var(--moh-marv)] text-center text-sm font-semibold text-white hover:opacity-85"
        @click="emit('close')"
      >
        View article
      </NuxtLink>
      <button
        type="button"
        class="flex min-h-11 w-full items-center justify-center rounded-full border moh-border text-sm font-semibold text-[var(--moh-text)] hover:bg-[var(--moh-surface-hover)]"
        @click="shareToFeed"
      >
        Share to feed
      </button>
      <button
        type="button"
        class="flex min-h-11 w-full items-center justify-center text-sm moh-text-muted hover:text-[var(--moh-text)]"
        @click="emit('close')"
      >
        Dismiss
      </button>
    </div>
  </Dialog>
</template>

<script setup lang="ts">
import type { Article } from '~/types/api'
import { MOH_OPEN_COMPOSER_KEY, type ComposerVisibility } from '~/utils/injection-keys'

const props = defineProps<{
  article: Article
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const openComposer = inject(MOH_OPEN_COMPOSER_KEY, null)

// Mounted only while it should be shown, so it is open for its whole lifetime.
useOverlayDismiss(() => true, () => emit('close'))

function shareToFeed() {
  const articleUrl = `${window.location.origin}/a/${props.article.id}`
  // Articles support public / verifiedOnly / premiumOnly (never onlyMe).
  const visibility = (props.article.visibility ?? 'public') as ComposerVisibility
  openComposer?.({ visibility, initialText: articleUrl })
  emit('close')
}
</script>
