<template>
  <AppModal
    :model-value="modelValue"
    :title="header"
    body-class="p-0"
    @update:modelValue="(v) => emit('update:modelValue', Boolean(v))"
  >
    <div v-if="error" class="p-4">
      <AppInlineAlert severity="danger">
        {{ error }}
      </AppInlineAlert>
    </div>

    <div v-else-if="loading && users.length === 0">
      <div class="divide-y divide-gray-200 dark:divide-zinc-800">
        <div v-for="i in skeletonRows" :key="i" class="px-4 py-3">
          <div class="flex items-center gap-3 min-w-0">
            <div class="h-10 w-10 shrink-0 rounded-full bg-gray-200 dark:bg-zinc-800" aria-hidden="true" />
            <div class="min-w-0 flex-1 space-y-2">
              <div class="h-3 w-40 max-w-[70%] rounded bg-gray-200 dark:bg-zinc-800" aria-hidden="true" />
              <div class="h-3 w-28 max-w-[50%] rounded bg-gray-200/80 dark:bg-zinc-800/80" aria-hidden="true" />
            </div>
            <div class="h-8 w-20 shrink-0 rounded-full bg-gray-200 dark:bg-zinc-800" aria-hidden="true" />
          </div>
        </div>
      </div>
      <div class="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
        Loading…
      </div>
    </div>

    <div v-else-if="users.length === 0" class="p-4 text-sm text-gray-600 dark:text-gray-300">
      {{ emptyText }}
    </div>

    <div v-else class="divide-y divide-gray-200 dark:divide-zinc-800">
      <AppUserRow v-for="u in users" :key="u.id" :user="u" />
    </div>

    <div v-if="nextCursor" class="p-4 pt-2 flex justify-center">
      <Button
        label="Load more"
        severity="secondary"
        :loading="loading"
        :disabled="loading"
        @click="emit('loadMore')"
      />
    </div>
  </AppModal>
</template>

<script setup lang="ts">
import type { FollowListUser } from '~/types/api'

const props = defineProps<{
  modelValue: boolean
  header: string
  users: FollowListUser[]
  loading: boolean
  error: string | null
  emptyText: string
  nextCursor: string | null
  /** Optional: expected total count (used to size the modal before first page loads). */
  expectedTotalCount?: number | null
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void
  (e: 'loadMore'): void
}>()

const header = computed(() => props.header)
const users = computed(() => props.users ?? [])
const loading = computed(() => Boolean(props.loading))
const error = computed(() => props.error ?? null)
const emptyText = computed(() => props.emptyText ?? 'Nothing here yet.')
const nextCursor = computed(() => props.nextCursor ?? null)

const expectedTotalCount = computed(() => {
  const n = props.expectedTotalCount
  if (typeof n !== 'number' || !Number.isFinite(n)) return null
  return Math.max(0, Math.floor(n))
})

// Reserve space for the first page (up to 30), so the modal height doesn't jump when data arrives.
const skeletonRows = computed(() => {
  const fallback = 10
  const n = expectedTotalCount.value
  if (n === null) return fallback
  if (n === 0) return 0
  return Math.max(1, Math.min(30, n))
})
</script>

