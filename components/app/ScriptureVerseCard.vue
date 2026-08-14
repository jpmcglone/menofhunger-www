<template>
  <div>
    <button
      ref="cardEl"
      type="button"
      class="w-full cursor-pointer p-0 overflow-hidden rounded-xl border moh-border moh-surface text-left transition-colors hover:bg-gray-50 dark:hover:bg-zinc-900"
      data-post-row-interactive
      :aria-label="cardAriaLabel"
      @click.stop="openReader"
    >
      <div class="px-4 py-3">
        <div class="flex items-baseline justify-between gap-3">
          <span class="text-[15px] font-semibold leading-5 text-balance moh-text">{{ displayedReference }}</span>
          <span class="shrink-0 text-xs moh-text-muted">{{ verseData?.translationName ?? '' }}</span>
        </div>
        <div class="my-2.5 border-t border-gray-200/80 dark:border-zinc-700/80" />

        <div v-if="loading" class="space-y-1.5 animate-pulse" aria-hidden="true">
          <div class="h-3 w-full rounded bg-gray-200 dark:bg-zinc-700" />
          <div class="h-3 w-4/5 rounded bg-gray-200 dark:bg-zinc-700" />
          <div class="h-3 w-3/5 rounded bg-gray-200 dark:bg-zinc-700" />
        </div>

        <AppScriptureVerseList
          v-else-if="verseData?.verses.length"
          :verses="verseData.verses"
          peek
          compact
        />

        <p v-else class="text-sm italic moh-text-muted">
          Verse not found.
        </p>
      </div>
    </button>

    <AppScriptureVersePopover
      v-if="readerOpen"
      :reference="reference"
      :target="cardEl"
      @close="readerOpen = false"
    />
  </div>
</template>

<script setup lang="ts">
import { useScripture } from '~/composables/useScripture'
import type { ScriptureRef } from '~/composables/useScripture'
import { formatScriptureVerseCount } from '~/utils/scripture-preview'

const props = defineProps<{
  reference: string
}>()

const cardEl = ref<HTMLElement | null>(null)
const readerOpen = ref(false)
const loading = ref(false)
const verseData = ref<ScriptureRef | null>(null)

const { fetchRef } = useScripture()

const displayedReference = computed(() => verseData.value?.reference ?? props.reference)

const cardAriaLabel = computed(() => {
  const count = verseData.value?.verses.length
  if (!count) return `Scripture: ${displayedReference.value}`
  return `Scripture: ${displayedReference.value}, ${formatScriptureVerseCount(count)}`
})

function openReader() {
  readerOpen.value = true
}

async function load() {
  if (!props.reference) return
  loading.value = true
  verseData.value = null
  verseData.value = await fetchRef(props.reference)
  loading.value = false
}

watch(() => props.reference, load, { immediate: true })
</script>
