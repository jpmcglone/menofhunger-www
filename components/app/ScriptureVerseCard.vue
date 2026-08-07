<template>
  <div
    class="overflow-hidden rounded-xl border moh-border moh-surface transition-colors"
    role="article"
    :aria-label="`Scripture: ${reference}`"
  >
    <div class="px-4 py-3">
      <div class="flex items-baseline justify-between gap-3">
        <span class="text-[15px] font-semibold leading-5 moh-text">{{ verseData?.reference ?? reference }}</span>
        <span class="shrink-0 text-xs moh-text-muted">{{ verseData?.translationName ?? '' }}</span>
      </div>
      <div class="my-2.5 border-t border-gray-200/80 dark:border-zinc-700/80" />

      <!-- Loading skeleton -->
      <div v-if="loading" class="space-y-1.5 animate-pulse" aria-hidden="true">
        <div class="h-3 w-full rounded bg-gray-200 dark:bg-zinc-700" />
        <div class="h-3 w-4/5 rounded bg-gray-200 dark:bg-zinc-700" />
        <div class="h-3 w-3/5 rounded bg-gray-200 dark:bg-zinc-700" />
      </div>

      <!-- Verse text -->
      <div v-else-if="verseData?.verses.length" class="space-y-1.5">
        <p
          v-for="verse in verseData.verses"
          :key="verse.number"
          class="grid grid-cols-[auto_1fr] items-start gap-1 text-[15px] leading-6 moh-text"
        >
          <span class="pt-0.5 text-[10px] font-medium leading-5 moh-text-muted select-none">
            {{ verse.number }}
          </span>
          <span>{{ verse.text }}</span>
        </p>
      </div>

      <!-- Error state -->
      <p v-else class="text-sm moh-text-muted italic">
        Verse not found.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useScripture } from '~/composables/useScripture'
import type { ScriptureRef } from '~/composables/useScripture'

const props = defineProps<{
  reference: string
}>()

const loading = ref(false)
const verseData = ref<ScriptureRef | null>(null)

const { fetchRef } = useScripture()

async function load() {
  if (!props.reference) return
  loading.value = true
  verseData.value = null
  verseData.value = await fetchRef(props.reference)
  loading.value = false
}

watch(() => props.reference, load, { immediate: true })
</script>
