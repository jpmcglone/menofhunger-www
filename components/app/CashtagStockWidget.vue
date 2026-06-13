<template>
  <div class="w-full overflow-hidden" :class="isDark ? 'bg-zinc-900' : 'bg-gray-50'">
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
const props = defineProps<{
  symbol: string
  /** Height in px (default 220) */
  height?: number
}>()

const containerEl = ref<HTMLElement | null>(null)
const colorMode = useColorMode()

/**
 * colorMode.value is reactive — it's the resolved effective mode ('dark'/'light').
 * We rely on it as the primary signal so watch(isDark) fires on theme switches.
 * DOM class and matchMedia are fallbacks for the 'system' case only.
 */
const isDark = computed<boolean>(() => {
  const val = colorMode.value  // reactive; updates when user switches theme
  if (val === 'dark') return true
  if (val === 'light') return false
  // 'system' — resolve via OS preference
  if (!import.meta.client) return true
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? true
})

function mountWidget() {
  const el = containerEl.value
  if (!el) return

  // Remove any previously injected script so hot-reload / symbol change works
  const prev = el.querySelector('script[data-tv-widget]')
  if (prev) prev.remove()
  const widgetEl = el.querySelector('.tradingview-widget-container__widget')
  if (widgetEl) widgetEl.innerHTML = ''

  const script = document.createElement('script')
  script.setAttribute('data-tv-widget', '1')
  script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-mini-symbol-overview.js'
  script.async = true
  script.type = 'text/javascript'
  script.textContent = JSON.stringify({
    symbol: props.symbol,
    width: '100%',
    height: props.height ?? 220,
    locale: 'en',
    dateRange: '1M',
    colorTheme: isDark.value ? 'dark' : 'light',
    trendLineColor: 'rgba(41, 98, 255, 1)',
    underLineColor: 'rgba(41, 98, 255, 0.16)',
    underLineBottomColor: 'rgba(41, 98, 255, 0)',
    isTransparent: false,
    autosize: true,
    largeChartUrl: '',
  })
  el.appendChild(script)
}

onMounted(() => nextTick(() => mountWidget()))

// Re-mount if symbol changes without a full key change
watch(() => props.symbol, () => nextTick(() => mountWidget()))
</script>

<style scoped>
/* Strip TradingView iframe default border */
.tradingview-widget-container :deep(iframe) {
  display: block;
  border: none !important;
}
</style>
