<template>
  <!-- Mobile only (tab-bar layout, i.e. below the `md` breakpoint that switches us
       from the bottom tab bar to the left rail). At `md` and above the left rail
       is visible and the right rail (which renders its own copy of the quote)
       appears at 962px; if we used `lg:hidden` here the center and right-rail
       quotes would both render in the 962px–1023px window. Hiding at `md` keeps
       the quote out of the center column whenever the tab bar is NOT showing. -->
  <div v-if="quote" class="md:hidden px-3 py-3 text-center text-sm leading-relaxed text-gray-700 dark:text-gray-200 sm:px-4">
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
