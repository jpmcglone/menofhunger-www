<template>
  <Dialog :visible="open" modal header="Add a GIF" :style="{ width: '32rem' }" @update:visible="(v) => emit('update:open', Boolean(v))">
    <div class="flex items-center gap-2">
      <InputText
        ref="inputRefProxy"
        :model-value="query"
        class="w-full"
        placeholder="Search Giphy…"
        aria-label="Search Giphy"
        @update:model-value="(v) => emit('update:query', String(v ?? ''))"
        @keyup.enter.prevent="emit('search')"
      />
      <Button label="Search" severity="secondary" :loading="loading" :disabled="loading" @click="emit('search')" />
    </div>

    <div v-if="error" class="mt-3 text-sm text-red-600 dark:text-red-400">
      {{ error }}
    </div>

    <div class="mt-4 grid grid-cols-3 sm:grid-cols-4 gap-2">
      <button
        v-for="gif in items"
        :key="gif.id"
        type="button"
        class="overflow-hidden rounded-lg border moh-border bg-black/5 dark:bg-white/5 hover:opacity-90 transition-opacity"
        :disabled="!canAddMore"
        :aria-label="`Add GIF ${gif.title || ''}`"
        @click="emit('select', gif)"
      >
        <img :src="gif.url" class="h-24 w-full object-cover" alt="" loading="lazy" />
      </button>
    </div>
  </Dialog>
</template>

<script setup lang="ts">
import type { GiphyItem, GiphySearchResponse } from '~/types/api'

const props = defineProps<{
  open: boolean
  query: string
  loading: boolean
  error: string | null
  items: GiphySearchResponse
  canAddMore: boolean
}>()

const emit = defineEmits<{
  (e: 'update:open', v: boolean): void
  (e: 'update:query', v: string): void
  (e: 'search'): void
  (e: 'select', gif: GiphyItem): void
}>()

const open = computed(() => Boolean(props.open))
const query = computed(() => props.query ?? '')
const loading = computed(() => Boolean(props.loading))
const error = computed(() => props.error ?? null)
const items = computed(() => props.items ?? [])
const canAddMore = computed(() => Boolean(props.canAddMore))

// Expose a ref-like handle that still lets the parent pass in its own ref via template `ref`.
// (Nuxt/Vue will set `giphyInputRef.value` to this component instance; the composable already knows how to find the input.)
const inputRefProxy = ref<any>(null)
</script>

