<template>
  <div class="space-y-6">
    <div>
      <div class="flex items-center gap-2">
        <span
          class="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-800 dark:bg-amber-500/15 dark:text-amber-300"
        >
          <Icon name="tabler:robot" class="text-[10px]" aria-hidden="true" />
          Bot
        </span>
        <h2 class="text-base font-semibold moh-text">{{ displayName }}</h2>
      </div>
      <p class="mt-1 text-sm text-gray-600 dark:text-gray-300">
        Your premium AI helper. Mention <span class="font-semibold">@{{ marvUsername || 'marv' }}</span>
        in a thread or chat with him directly to get a brief, kind, practical reply.
      </p>
    </div>

    <!-- Non-premium CTA -->
    <div
      v-if="hasFetched && !isPremium"
      class="rounded-xl border border-amber-200/80 bg-amber-50/60 p-4 text-sm dark:border-amber-500/30 dark:bg-amber-500/10"
    >
      <div class="flex items-start gap-3">
        <Icon name="tabler:sparkles" class="text-amber-600 dark:text-amber-300 text-base mt-0.5" aria-hidden="true" />
        <div class="flex-1">
          <p class="font-semibold moh-text">Marv is a premium benefit.</p>
          <p class="mt-1 text-gray-700 dark:text-gray-300">
            Upgrade to Premium to chat with Marv and have him reply when you mention him in threads.
          </p>
          <NuxtLink
            to="/tiers"
            class="mt-3 inline-flex items-center gap-1 rounded-lg bg-amber-600 px-3 py-1.5 text-sm font-semibold text-white hover:opacity-90"
          >
            <span>See plans</span>
            <Icon name="tabler:arrow-right" class="text-sm" aria-hidden="true" />
          </NuxtLink>
        </div>
      </div>
    </div>

    <!-- Disabled by admin -->
    <div
      v-else-if="hasFetched && !enabled"
      class="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-gray-300"
    >
      Marv is currently unavailable. Please check back later.
    </div>

    <template v-else-if="hasFetched">
      <!-- Preferred mode -->
      <section class="space-y-3">
        <div>
          <div class="text-sm font-semibold moh-text">Preferred reply mode</div>
          <p class="text-xs text-gray-500 dark:text-gray-400">
            Faster replies cost less. Smart replies are best for tricky questions; Marv may auto-upgrade
            for sensitive topics.
          </p>
        </div>
        <div
          class="inline-flex items-center rounded-full bg-gray-100 p-0.5 text-sm dark:bg-zinc-900"
          role="tablist"
          aria-label="Preferred Marv reply mode"
        >
          <button
            v-for="mode in (['fast', 'regular', 'smart'] as const)"
            :key="mode"
            type="button"
            :disabled="modeBusy"
            :class="[
              'rounded-full px-3 py-1 font-semibold transition-colors',
              preferredMode === mode
                ? 'bg-white text-gray-900 shadow-sm dark:bg-zinc-700 dark:text-white'
                : 'text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white',
              modeBusy ? 'opacity-60' : '',
            ]"
            :aria-selected="preferredMode === mode"
            role="tab"
            @click="onPickMode(mode)"
          >
            {{ modeLabel(mode) }}
          </button>
        </div>
        <p class="text-xs text-gray-500 dark:text-gray-400">{{ modeDescription(preferredMode) }}</p>
      </section>

      <!-- Credits -->
      <section v-if="credits" class="space-y-2">
        <div class="text-sm font-semibold moh-text">Credits</div>
        <div class="flex items-center justify-between rounded-xl border moh-border px-4 py-3">
          <div>
            <div class="text-2xl font-bold tabular-nums">{{ creditsLabel }}</div>
            <div class="text-xs text-gray-500 dark:text-gray-400">
              of {{ credits.maxCredits.toLocaleString() }} credits · +{{ credits.creditsPerDay.toLocaleString() }} per day
            </div>
          </div>
          <div class="text-right text-xs text-gray-500 dark:text-gray-400">
            <div v-if="refillEtaLabel">Refills to full in {{ refillEtaLabel }}</div>
            <div v-else>Bucket is full</div>
          </div>
        </div>
      </section>

      <!-- Recent activity -->
      <section class="space-y-2">
        <div class="flex items-center justify-between">
          <div>
            <div class="text-sm font-semibold moh-text">Recent activity</div>
            <p class="text-xs text-gray-500 dark:text-gray-400">Your last 10 Marv interactions.</p>
          </div>
          <button
            type="button"
            class="text-xs font-semibold text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
            :disabled="usageLoading"
            @click="loadUsage()"
          >
            {{ usageLoading ? 'Loading…' : 'Refresh' }}
          </button>
        </div>
        <div
          v-if="usageError"
          class="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-500/10 dark:text-red-300"
        >
          {{ usageError }}
        </div>
        <ul v-if="usage.length" class="divide-y moh-border rounded-xl border moh-border overflow-hidden">
          <li
            v-for="event in usage"
            :key="event.id"
            class="flex items-center justify-between gap-3 px-3 py-2 text-sm"
          >
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2">
                <span class="font-medium moh-text">{{ sourceLabel(event.source) }}</span>
                <span
                  v-if="event.errorCode"
                  class="rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-600 dark:bg-zinc-800 dark:text-gray-300"
                >
                  {{ event.errorCode.replace(/_/g, ' ') }}
                </span>
                <span
                  v-else
                  class="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
                >
                  Reply
                </span>
              </div>
              <div class="text-xs text-gray-500 dark:text-gray-400">
                Mode {{ event.effectiveMode }} · {{ event.creditsSpent }} credits · {{ formatRelative(event.createdAt) }}
              </div>
            </div>
          </li>
        </ul>
        <div v-else-if="!usageLoading" class="text-sm text-gray-500 dark:text-gray-400">
          No activity yet.
        </div>
      </section>
    </template>

    <div v-else class="text-sm text-gray-500 dark:text-gray-400">
      Loading…
    </div>
  </div>
</template>

<script setup lang="ts">
import type { MarvinModeDto, MarvinSourceDto, MarvinUsageEventDto } from '~/types/api'
import { onActivated, onMounted } from 'vue'

const {
  enabled,
  isPremium,
  preferredMode,
  credits,
  marvUsername,
  marvDisplayName,
  hasFetched,
  ensureLoaded,
  fetchMe,
  setPreferredMode,
  startRealtime,
  stopRealtime,
} = useMarv()

const { apiFetch } = useApiClient()

const displayName = computed(() => marvDisplayName.value || 'Marv')
const modeBusy = ref(false)
const usage = ref<MarvinUsageEventDto[]>([])
const usageLoading = ref(false)
const usageError = ref<string | null>(null)

function modeLabel(m: MarvinModeDto): string {
  if (m === 'fast') return 'Fast'
  if (m === 'smart') return 'Smart'
  return 'Regular'
}

function modeDescription(m: MarvinModeDto): string {
  if (m === 'fast') return 'Quickest replies. Light on credits.'
  if (m === 'smart') return 'Slower, more thoughtful replies. Higher credit cost.'
  return 'Balanced replies for everyday questions.'
}

function sourceLabel(s: MarvinSourceDto): string {
  return s === 'private_session' ? 'Direct chat' : 'Public thread'
}

function formatRelative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  if (Number.isNaN(ms)) return ''
  const sec = Math.max(0, Math.round(ms / 1000))
  if (sec < 60) return 'just now'
  const min = Math.round(sec / 60)
  if (min < 60) return `${min}m ago`
  const hr = Math.round(min / 60)
  if (hr < 24) return `${hr}h ago`
  const d = Math.round(hr / 24)
  return `${d}d ago`
}

const creditsLabel = computed(() => {
  const c = credits.value
  if (!c) return '—'
  return Math.floor(c.credits).toLocaleString()
})

const refillEtaLabel = computed(() => {
  const c = credits.value
  if (!c) return null
  const remaining = Math.max(0, c.maxCredits - c.credits)
  if (remaining <= 0.5) return null
  if (!c.creditsPerDay || c.creditsPerDay <= 0) return null
  const hoursToFull = (remaining / c.creditsPerDay) * 24
  if (hoursToFull < 1) {
    const mins = Math.max(1, Math.round(hoursToFull * 60))
    return `${mins}m`
  }
  if (hoursToFull < 24) return `${Math.round(hoursToFull)}h`
  const days = Math.round(hoursToFull / 24)
  return `${days}d`
})

async function onPickMode(mode: MarvinModeDto) {
  if (modeBusy.value) return
  if (mode === preferredMode.value) return
  modeBusy.value = true
  try {
    await setPreferredMode(mode)
  } catch {
    // useMarv reverts; nothing further
  } finally {
    modeBusy.value = false
  }
}

async function loadUsage() {
  if (usageLoading.value) return
  usageLoading.value = true
  usageError.value = null
  try {
    const res = await apiFetch<MarvinUsageEventDto[]>('/marvin/me/usage', {
      method: 'GET',
      query: { limit: 10 },
    })
    usage.value = res?.data ?? []
  } catch (err) {
    usageError.value = err instanceof Error ? err.message : 'Failed to load activity'
  } finally {
    usageLoading.value = false
  }
}

onMounted(async () => {
  startRealtime()
  await ensureLoaded()
  if (isPremium.value) await loadUsage()
})

onActivated(async () => {
  startRealtime()
  await fetchMe({ forceRefresh: true })
  if (isPremium.value) await loadUsage()
})

onBeforeUnmount(() => {
  stopRealtime()
})
</script>
