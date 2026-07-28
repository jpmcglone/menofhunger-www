<template>
  <div
    class="overflow-hidden rounded-xl border moh-border moh-surface transition-colors"
    role="article"
    :aria-label="`Scripture: ${reference}`"
  >
    <div class="p-4 space-y-2">
      <!-- Header row: reference + translation badge -->
      <div class="flex items-baseline justify-between gap-2">
        <span class="text-sm font-semibold moh-text">{{ verseData?.reference ?? reference }}</span>
        <span class="shrink-0 text-xs moh-text-muted">{{ verseData?.translationName ?? '' }}</span>
      </div>

      <!-- Loading skeleton -->
      <div v-if="loading" class="space-y-1.5 animate-pulse" aria-hidden="true">
        <div class="h-3 w-full rounded bg-gray-200 dark:bg-zinc-700" />
        <div class="h-3 w-4/5 rounded bg-gray-200 dark:bg-zinc-700" />
        <div class="h-3 w-3/5 rounded bg-gray-200 dark:bg-zinc-700" />
      </div>

      <!-- Verse text -->
      <div v-else-if="verseData" class="space-y-1">
        <p
          v-for="verse in verseData.verses"
          :key="verse.number"
          class="text-sm leading-relaxed moh-text-muted"
        >
          <sup class="mr-0.5 text-[10px] text-gray-400 dark:text-gray-500 select-none">
            {{ verse.number }}
          </sup>{{ verse.text }}
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
