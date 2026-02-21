<template>
  <div class="space-y-4">
    <p class="text-sm text-gray-600 dark:text-gray-400">
      Blocked users can view your posts but cannot engage with them. You can view their posts but cannot engage with theirs either.
    </p>

    <div v-if="error" class="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
      {{ error }}
    </div>

    <div v-if="loading && !blocks.length" class="flex justify-center py-8">
      <AppLogoLoader compact />
    </div>

    <div v-else-if="!blocks.length" class="text-sm text-gray-500 dark:text-gray-400">
      You haven't blocked anyone.
    </div>

    <div v-else class="divide-y divide-gray-100 dark:divide-zinc-800 rounded-xl border border-gray-200 dark:border-zinc-800 overflow-hidden">
      <div
        v-for="item in blocks"
        :key="item.blocked.id"
        class="flex items-center gap-3 px-4 py-3 moh-surface"
      >
        <NuxtLink :to="`/u/${item.blocked.username}`" class="shrink-0">
          <AppUserAvatar :user="item.blocked" size-class="h-9 w-9" />
        </NuxtLink>
        <div class="min-w-0 flex-1">
          <NuxtLink :to="`/u/${item.blocked.username}`" class="block font-semibold text-sm truncate hover:underline">
            {{ item.blocked.name || item.blocked.username || 'User' }}
          </NuxtLink>
          <div class="text-xs text-gray-500 dark:text-gray-400 truncate">
            @{{ item.blocked.username }}
          </div>
        </div>
        <Button
          label="Unblock"
          size="small"
          severity="secondary"
          :loading="unblockingId === item.blocked.id"
          @click="handleUnblock(item.blocked.id)"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { MessageBlockListItem } from '~/types/api'
import { getApiErrorMessage } from '~/utils/api-error'

const { apiFetch } = useApiClient()
const blockState = useBlockState()

const blocks = ref<MessageBlockListItem[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const unblockingId = ref<string | null>(null)

async function load() {
  loading.value = true
  error.value = null
  try {
    const res = await apiFetch<MessageBlockListItem[]>('/messages/blocks')
    blocks.value = res.data ?? []
  } catch (e: unknown) {
    error.value = getApiErrorMessage(e) || 'Failed to load blocked users.'
  } finally {
    loading.value = false
  }
}

async function handleUnblock(userId: string) {
  unblockingId.value = userId
  error.value = null
  try {
    await blockState.unblockUser(userId)
    blocks.value = blocks.value.filter((b) => b.blocked.id !== userId)
  } catch (e: unknown) {
    error.value = getApiErrorMessage(e) || 'Failed to unblock user.'
  } finally {
    unblockingId.value = null
  }
}

onMounted(() => void load())
</script>
