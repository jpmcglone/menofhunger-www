<template>
  <!-- Mobile-only: right rail shows this on desktop already -->
  <div class="lg:hidden px-3 pb-1 sm:px-4">
    <div
      v-if="quote"
      class="rounded-xl border px-4 py-3 text-center"
      style="border-color: color-mix(in srgb, var(--moh-border-color) 60%, transparent); background-color: color-mix(in srgb, var(--moh-surface-2) 60%, transparent)"
    >
      <figure>
        <blockquote class="text-sm italic leading-relaxed moh-text moh-serif">
          "{{ quote.text }}"
        </blockquote>
        <figcaption class="mt-2 text-[11px] text-gray-500 dark:text-gray-400">
          <span class="font-semibold">{{ attribution }}</span>
          <span v-if="quote.isParaphrase" class="ml-1">(paraphrase)</span>
        </figcaption>
      </figure>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { DailyContentToday } from '~/types/api'
import { formatDailyQuoteAttribution } from '~/utils/daily-quote'

const { data: dailyContent } = useNuxtData<DailyContentToday>('daily-content:today')

const quote = computed(() => dailyContent.value?.quote ?? null)
const attribution = computed(() => (quote.value ? formatDailyQuoteAttribution(quote.value as any) : ''))
</script>
