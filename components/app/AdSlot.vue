<template>
  <div
    v-if="shouldRender"
    :class="[
      'relative w-full rounded-xl border border-dotted moh-border bg-transparent overflow-hidden',
      placement === 'rail' ? 'h-[250px]' : 'h-[120px] sm:h-[250px]'
    ]"
  >
    <!-- Placeholder label (shown until we detect an actual ad render) -->
    <div
      v-if="showPlaceholder"
      class="pointer-events-none absolute inset-0 flex items-center justify-center text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500"
      aria-hidden="true"
    >
      AD
    </div>

    <!-- AdSense unit (client-only; never SSR-rendered). -->
    <ins
      v-if="mounted && shouldShowAd && adsenseEnabled"
      ref="insEl"
      class="adsbygoogle block w-full h-full"
      style="display: block"
      :data-ad-client="adsenseClient"
      :data-ad-slot="slot"
      data-ad-format="auto"
      data-full-width-responsive="true"
      :data-adtest="adsenseAdtest ? 'on' : undefined"
    />
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  placement: 'rail' | 'feed'
}>()

const { user } = useAuth()
const isPremiumViewer = computed(() => Boolean(user.value?.premium || user.value?.premiumPlus))

const config = useRuntimeConfig()
const adsenseEnabled = computed(() => Boolean(config.public.adsense?.enabled))
const adsenseClient = computed(() => String(config.public.adsense?.client ?? '').trim())
const adsenseRailSlot = computed(() => String(config.public.adsense?.railSlot ?? '').trim())
const adsenseFeedSlot = computed(() => String(config.public.adsense?.feedSlot ?? '').trim())
const adsenseAdtest = computed(() => Boolean(config.public.adsense?.adtest))

const slot = computed(() => (props.placement === 'rail' ? adsenseRailSlot.value : adsenseFeedSlot.value))

const shouldShowAd = computed(() => !isPremiumViewer.value)
const mounted = ref(false)
// SSR/hydration-safe: always reserve the slot space until mounted, then respect viewer tier.
const shouldRender = computed(() => (!mounted.value ? true : shouldShowAd.value))
function isValidAdsenseClient(v: string): boolean {
  // AdSense client format: ca-pub-1234567890123456
  return /^ca-pub-\d+$/.test((v ?? '').trim())
}
function isValidAdsenseSlot(v: string): boolean {
  // Slot format: numeric string
  return /^\d+$/.test((v ?? '').trim())
}
const isConfigured = computed(() =>
  Boolean(adsenseEnabled.value && isValidAdsenseClient(adsenseClient.value) && isValidAdsenseSlot(slot.value)),
)

const insEl = ref<HTMLElement | null>(null)
const showPlaceholder = ref(true)

let pollTimeoutId: ReturnType<typeof setTimeout> | null = null
let pollDisposed = false
function clearPollTimeout() {
  if (pollTimeoutId != null) {
    clearTimeout(pollTimeoutId)
    pollTimeoutId = null
  }
}

function ensureAdsenseScriptLoaded(client: string): Promise<void> {
  if (!import.meta.client) return Promise.resolve()
  const w = window as unknown as { adsbygoogle?: unknown[] }
  w.adsbygoogle = w.adsbygoogle || []

  const src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(client)}`
  const existing = document.querySelector<HTMLScriptElement>(`script[src="${CSS.escape(src)}"]`)
  if (existing) return Promise.resolve()

  return new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.async = true
    s.src = src
    s.crossOrigin = 'anonymous'
    s.onload = () => resolve()
    s.onerror = () => reject(new Error('Failed to load AdSense script'))
    document.head.appendChild(s)
  })
}

function looksFilled(el: HTMLElement | null): boolean {
  if (!el) return false
  const status = (el.getAttribute('data-ad-status') ?? '').trim()
  if (status === 'filled') return true
  if (el.querySelector('iframe')) return true
  return false
}

async function requestAd() {
  if (!import.meta.client) return
  // Never load ads/scripts until after mount; prevents pre-hydration DOM mutation.
  if (!mounted.value) return
  if (!shouldShowAd.value) return
  if (!isConfigured.value) return

  // Ensure no prior poll chain continues after re-render / prop changes.
  clearPollTimeout()

  try {
    await ensureAdsenseScriptLoaded(adsenseClient.value)
  } catch {
    // Keep placeholder; don't throw.
    return
  }

  await nextTick()
  try {
    const w = window as unknown as { adsbygoogle?: unknown[] }
    w.adsbygoogle = w.adsbygoogle || []
    w.adsbygoogle.push({})
  } catch {
    // Keep placeholder; don't throw.
    return
  }

  // Poll briefly for fill; hide placeholder once real ad appears.
  const start = Date.now()
  const poll = () => {
    if (!import.meta.client) return
    if (pollDisposed) return
    if (looksFilled(insEl.value)) {
      showPlaceholder.value = false
      return
    }
    if (Date.now() - start > 10_000) return
    clearPollTimeout()
    pollTimeoutId = setTimeout(poll, 250)
  }
  poll()
}

onMounted(() => {
  mounted.value = true
  // If not configured, we still show the dotted placeholder.
  showPlaceholder.value = true
  void requestAd()
})

watch([shouldShowAd, slot, adsenseClient, adsenseEnabled], () => {
  showPlaceholder.value = true
  if (!import.meta.client) return
  void requestAd()
})

onBeforeUnmount(() => {
  pollDisposed = true
  clearPollTimeout()
})
</script>

