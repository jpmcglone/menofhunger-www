<template>
  <Dialog
    :visible="modelValue"
    modal
    :header="header"
    :draggable="false"
    :style="{ width: 'min(38rem, 96vw)' }"
    contentClass="p-0"
    @update:visible="(v) => emit('update:modelValue', Boolean(v))"
  >
    <div v-if="error" class="p-4">
      <AppInlineAlert severity="danger">
        {{ error }}
      </AppInlineAlert>
    </div>

    <div v-else-if="loading && users.length === 0" class="p-4 text-sm text-gray-600 dark:text-gray-300">
      Loading…
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
  </Dialog>
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
</script>

