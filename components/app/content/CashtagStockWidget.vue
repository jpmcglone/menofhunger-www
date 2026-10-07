<template>
  <div class="w-full overflow-hidden rounded-xl" :class="chromeClass">
    <div
      ref="containerEl"
      class="tradingview-widget-container"
      style="width: calc(100% + 2px); margin: -1px;"
    >
      <div class="tradingview-widget-container__widget" />
    </div>
  </div>
</template>

<script setup lang="ts">
/** TradingView mini-symbol-overview dateRange values. */
export type CashtagChartRange = '1D' | '1M' | '3M' | '12M' | 'ALL'

const props = withDefaults(defineProps<{
  symbol: string
  /** Height in px (default 220) */
  height?: number
  /** Chart window — remounts the embed when changed. */
  dateRange?: CashtagChartRange
}>(), {
  height: 220,
  dateRange: '1D',
})

const containerEl = ref<HTMLElement | null>(null)
const colorMode = useColorMode()

const isDark = computed<boolean>(() => {
  const val = colorMode.value
  if (val === 'dark') return true
  if (val === 'light') return false
  if (!import.meta.client) return true
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? true
})

const chromeClass = computed(() => (isDark.value ? 'bg-zinc-900' : 'bg-gray-50'))

function mountWidget() {
  const el = containerEl.value
  if (!el) return

  const prev = el.querySelector('script[data-tv-widget]')
  if (prev) prev.remove()
  const widgetEl = el.querySelector('.tradingview-widget-container__widget')
  if (widgetEl) widgetEl.innerHTML = ''

  const script = document.createElement('script')
  script.setAttribute('data-tv-widget', '1')
  script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-mini-symbol-overview.js'
  script.async = true
  script.type = 'text/javascript'
  // Green trend line matches X-style up charts; TV still draws the live quote.
  script.textContent = JSON.stringify({
    symbol: props.symbol,
    width: '100%',
    height: props.height ?? 220,
    locale: 'en',
    dateRange: props.dateRange ?? '1D',
    colorTheme: isDark.value ? 'dark' : 'light',
    trendLineColor: 'rgba(0, 186, 124, 1)',
    underLineColor: 'rgba(0, 186, 124, 0.18)',
    underLineBottomColor: 'rgba(0, 186, 124, 0)',
    isTransparent: false,
    autosize: true,
    largeChartUrl: '',
  })
  el.appendChild(script)
}

onMounted(() => nextTick(() => mountWidget()))

watch(
  () => [props.symbol, props.dateRange, isDark.value] as const,
  () => nextTick(() => mountWidget()),
)
</script>

<style scoped>
.tradingview-widget-container :deep(iframe) {
  display: block;
  border: none !important;
}
</style>
