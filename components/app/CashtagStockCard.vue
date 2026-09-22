<template>
  <section class="border-b moh-border" aria-label="Stock overview">
    <div class="moh-gutter-x pt-4 pb-3 space-y-3">
      <!-- Identity: SEC ticker name · no trade CTA -->
      <div class="flex items-center gap-3 min-w-0">
        <div
          class="shrink-0 size-11 rounded-full flex items-center justify-center bg-zinc-100 dark:bg-zinc-100 text-zinc-900"
          aria-hidden="true"
        >
          <span class="text-[10px] font-bold tracking-tight leading-none">
            {{ monogram }}
          </span>
        </div>
        <div class="min-w-0 flex-1">
          <p class="text-[16px] leading-6 font-semibold moh-text truncate">
            {{ displayName }}
          </p>
          <p class="text-[13px] leading-[18px] moh-text-muted truncate">
            {{ symbol }} · SEC ticker
          </p>
        </div>
      </div>

      <ClientOnly>
        <AppCashtagStockWidget
          :key="`${symbol}-${range}-${colorMode.value}`"
          :symbol="symbol"
          :date-range="range"
          :height="200"
        />
      </ClientOnly>

      <!-- Timeframes remount the TradingView embed (TV supports 1D / 1M / 3M / 12M / ALL). -->
      <div class="flex flex-wrap gap-2" role="tablist" aria-label="Chart range">
        <button
          v-for="opt in rangeOptions"
          :key="opt.value"
          type="button"
          role="tab"
          :aria-selected="range === opt.value"
          class="min-h-9 px-3 rounded-full text-[13px] font-semibold transition-colors moh-focus"
          :class="range === opt.value
            ? 'bg-zinc-200 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50'
            : 'moh-text-muted hover:moh-text'"
          @click="range = opt.value"
        >
          {{ opt.label }}
        </button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { CashtagChartRange } from '~/components/app/CashtagStockWidget.vue'

const props = defineProps<{
  symbol: string
  name?: string | null
}>()

const colorMode = useColorMode()
const range = ref<CashtagChartRange>('1D')

const rangeOptions: { label: string; value: CashtagChartRange }[] = [
  { label: '1D', value: '1D' },
  { label: '1M', value: '1M' },
  { label: '3M', value: '3M' },
  { label: '1Y', value: '12M' },
  { label: 'ALL', value: 'ALL' },
]

const monogram = computed(() => props.symbol.slice(0, 4).toUpperCase())
const displayName = computed(() => {
  const n = props.name?.trim()
  return n && n.length > 0 ? n : `$${props.symbol}`
})

watch(() => props.symbol, () => { range.value = '1D' })
</script>
