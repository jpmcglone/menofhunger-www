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
        Reply mode is controlled in your Marv chat.
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
          <p class="font-semibold moh-text">M.A.R.V is a premium benefit.</p>
          <p class="mt-1 text-gray-700 dark:text-gray-300">
            Upgrade to Premium to chat with M.A.R.V and have him reply when you mention him in threads.
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
      M.A.R.V is currently unavailable. Please check back later.
    </div>

    <template v-else-if="hasFetched">
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

      <!-- What Marv knows -->
      <section class="space-y-2">
        <div>
          <div class="text-sm font-semibold moh-text">What Marv knows about you</div>
          <p class="text-xs text-gray-500 dark:text-gray-400">
            Built from your public profile, posts, and media. Private or gated content is never included.
          </p>
        </div>
        <div
          v-if="cardLoading"
          class="rounded-xl border moh-border px-4 py-3 text-sm text-gray-500 dark:text-gray-400"
        >
          Loading…
        </div>
        <div
          v-else-if="cardError"
          class="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-500/10 dark:text-red-300"
        >
          {{ cardError }}
        </div>
        <div
          v-else-if="contextCard"
          class="rounded-xl border moh-border px-4 py-3 text-sm moh-text whitespace-pre-wrap"
        >
          {{ contextCard.cardText }}
          <div class="mt-2 text-xs text-gray-500 dark:text-gray-400">
            Updated {{ formatRelative(contextCard.updatedAt) }}
          </div>
        </div>
        <div
          v-else
          class="rounded-xl border moh-border px-4 py-3 text-sm text-gray-500 dark:text-gray-400"
        >
          Not generated yet. Marv builds this from your public activity over time.
        </div>
      </section>

      <!-- Recent activity -->
      <section class="space-y-2">
        <div class="flex items-center justify-between">
          <div>
            <div class="text-sm font-semibold moh-text">Recent activity</div>
            <p class="text-xs text-gray-500 dark:text-gray-400">Your last 10 M.A.R.V interactions.</p>
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
        <ul v-if="usage.length" class="moh-divide rounded-xl border moh-border overflow-hidden">
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
import type { MarvinContextCardDto, MarvinSourceDto, MarvinUsageEventDto } from '~/types/api'
import { onActivated, onMounted } from 'vue'

const {
  enabled,
  isPremium,
  credits,
  marvUsername,
  marvDisplayName,
  hasFetched,
  ensureLoaded,
  startRealtime,
  stopRealtime,
} = useMarv()

const { apiFetch } = useApiClient()

const displayName = computed(() => marvDisplayName.value || 'M.A.R.V')
const usage = ref<MarvinUsageEventDto[]>([])
const usageLoading = ref(false)
const usageError = ref<string | null>(null)
const contextCard = ref<MarvinContextCardDto | null>(null)
const cardLoading = ref(false)
const cardError = ref<string | null>(null)
const cardFetched = ref(false)

function sourceLabel(s: MarvinSourceDto): string {
  if (s === 'private_session') return 'Direct chat'
  if (s === 'catch_up') return 'Catch me up'
  return 'Public thread'
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

async function loadContextCard() {
  if (cardLoading.value) return
  cardLoading.value = true
  cardError.value = null
  try {
    const res = await apiFetch<MarvinContextCardDto | null>('/marvin/me/context-card', {
      method: 'GET',
    })
    contextCard.value = res?.data ?? null
    cardFetched.value = true
  } catch (err) {
    cardError.value = err instanceof Error ? err.message : 'Failed to load context card'
  } finally {
    cardLoading.value = false
  }
}

onMounted(async () => {
  startRealtime()
  await ensureLoaded()
  if (isPremium.value) {
    await Promise.all([loadUsage(), loadContextCard()])
  }
})

onActivated(async () => {
  await ensureLoaded()
  if (isPremium.value) {
    if (!cardFetched.value) await loadContextCard()
    if (!usage.value.length) await loadUsage()
  }
})

onBeforeUnmount(() => {
  stopRealtime()
})
</script>
