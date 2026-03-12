<template>
  <Dialog :visible="true" modal :closable="true" :style="{ width: '24rem', maxWidth: '95vw' }" :pt="{ root: { class: '!rounded-2xl' } }" @update:visible="emit('close')">
    <template #header>
      <div class="flex items-center gap-3">
        <div class="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/40">
          <Icon name="tabler:check" class="text-lg text-green-600 dark:text-green-400" aria-hidden="true" />
        </div>
        <span class="text-lg font-bold text-gray-900 dark:text-gray-100">Article published!</span>
      </div>
    </template>

    <p class="text-sm text-gray-500 dark:text-zinc-400">
      "{{ article.title }}" is now live.
    </p>

    <div class="mt-5 space-y-2">
      <NuxtLink
        :to="`/a/${article.id}`"
        class="block w-full rounded-xl bg-orange-500 py-2.5 text-center text-sm font-semibold text-white hover:bg-orange-600"
        @click="emit('close')"
      >
        View article
      </NuxtLink>
      <button
        type="button"
        class="block w-full rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        :disabled="sharing"
        @click="shareToFeed"
      >
        {{ sharing ? 'Sharing…' : 'Share to feed' }}
      </button>
      <button
        type="button"
        class="block w-full py-2 text-sm text-gray-400 hover:text-gray-600 dark:text-zinc-500"
        @click="emit('close')"
      >
        Dismiss
      </button>
    </div>
  </Dialog>
</template>

<script setup lang="ts">
import type { Article } from '~/types/api'

const props = defineProps<{
  article: Article
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const { apiFetchData } = useApiClient()
const toast = useAppToast()
const sharing = ref(false)

async function shareToFeed() {
  sharing.value = true
  try {
    await apiFetchData(`/articles/${props.article.id}/share`, { method: 'POST', body: { body: '' } })
    toast.push({ title: 'Article shared to your feed!', tone: 'success' })
    emit('close')
  } catch (e: any) {
    toast.push({ title: e?.data?.meta?.errors?.[0]?.message ?? 'Could not share article.', tone: 'error' })
  } finally {
    sharing.value = false
  }
}
</script>
