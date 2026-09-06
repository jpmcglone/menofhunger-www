<template>
  <Dialog :visible="open" modal :style="{ width: '32.5rem', maxWidth: 'calc(100vw - 1.5rem)' }" @update:visible="(v) => emit('update:open', Boolean(v))">
    <template #header><div class="flex items-center gap-3"><AppIconGlyph name="gif" :size="24" /><span class="font-semibold text-xl">Add a GIF</span></div></template>
    <div class="flex h-[min(31rem,70dvh)] flex-col gap-4">
      <form class="flex items-center gap-2 rounded-xl border moh-border px-3" @submit.prevent="emit('search')">
        <AppIconGlyph name="search" :size="20" class="moh-text-muted shrink-0" />
        <input ref="inputRefProxy" :value="query" class="min-w-0 flex-1 bg-transparent py-3 outline-none" placeholder="Search GIPHY" aria-label="Search GIPHY" @input="emit('update:query', ($event.target as HTMLInputElement).value)" />
        <button v-if="query" type="button" class="flex size-11 items-center justify-center" aria-label="Clear GIF search" @click="emit('update:query', ''); emit('search')"><AppIconGlyph name="close" :size="18" /></button>
        <button type="submit" class="text-sm font-semibold" :disabled="loading">Search</button>
      </form>
      <div class="flex justify-between gap-2 text-sm"><h3 class="font-semibold">{{ query.trim() ? 'Search results' : 'Trending GIFs' }}</h3><span class="moh-text-muted">Pick one to add</span></div>
      <div class="min-h-0 flex-1 overflow-y-auto" :aria-busy="loading">
        <div v-if="loading" class="grid grid-cols-3 gap-2" role="status" aria-label="Loading GIFs"><div v-for="n in 9" :key="n" class="aspect-square rounded-xl bg-black/5 dark:bg-white/5 motion-safe:animate-pulse" /></div>
        <div v-else-if="error" class="flex h-full flex-col items-center justify-center gap-3 text-center" role="alert"><p>{{ error }}</p><button type="button" class="min-h-11 font-semibold" @click="emit('search')">Try again</button></div>
        <div v-else-if="!items.length" class="flex h-full flex-col items-center justify-center gap-2 text-center"><p class="font-semibold">No GIFs found</p><p class="text-sm moh-text-muted">Try a different word or clear your search.</p></div>
        <div v-else class="grid grid-cols-3 gap-2">
          <button v-for="gif in items" :key="gif.id" type="button" class="aspect-square overflow-hidden rounded-xl bg-black/5 dark:bg-white/5 transition-opacity hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2" :disabled="!canAddMore" :aria-label="`Add GIF ${gif.title || ''}`" @click="emit('select', gif)"><img :src="gif.url" class="h-full w-full object-cover" alt="" loading="lazy" /></button>
        </div>
      </div>
      <p class="text-xs moh-text-muted">Powered by GIPHY</p>
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

useOverlayDismiss(open, () => emit('update:open', false))
const query = computed(() => props.query ?? '')
const loading = computed(() => Boolean(props.loading))
const error = computed(() => props.error ?? null)
const items = computed(() => props.items ?? [])
const canAddMore = computed(() => Boolean(props.canAddMore))

// Expose a ref-like handle that still lets the parent pass in its own ref via template `ref`.
// (Nuxt/Vue will set `giphyInputRef.value` to this component instance; the composable already knows how to find the input.)
const inputRefProxy = ref<HTMLInputElement | null>(null)
watch(open, async (visible) => { if (visible) { await nextTick(); inputRefProxy.value?.focus() } })
</script>

