<template>
  <!-- Mobile-only: right rail shows this on desktop already -->
  <div v-if="quote" class="lg:hidden px-3 py-3 text-center text-sm leading-relaxed text-gray-700 dark:text-gray-200 sm:px-4">
    <figure>
      <blockquote class="italic moh-serif">
        “{{ quote.text }}”
      </blockquote>
      <figcaption class="mt-2 text-xs text-gray-500 dark:text-gray-400">
        <span class="font-semibold">{{ attribution }}</span>
        <span v-if="quote.isParaphrase" class="ml-1">(paraphrase)</span>
      </figcaption>
    </figure>
    <div class="mt-8 h-[1px] w-32 mx-auto bg-gradient-to-r from-transparent via-gray-400 dark:via-gray-600 to-transparent" />
  </div>
</template>

<script setup lang="ts">
import type { DailyContentToday } from '~/types/api'
import { formatDailyQuoteAttribution } from '~/utils/daily-quote'

const { data: dailyContent } = useNuxtData<DailyContentToday>('daily-content:today')

const quote = computed(() => dailyContent.value?.quote ?? null)
const attribution = computed(() => (quote.value ? formatDailyQuoteAttribution(quote.value as any) : ''))
</script>
