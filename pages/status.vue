<template>
  <AppPageContent top="standard" bottom="standard">
    <section class="w-full moh-gutter-x pt-0 pb-8">
      <div class="mx-auto w-full max-w-5xl">
        <div class="flex flex-col gap-4">
          <header class="flex flex-wrap items-center justify-between gap-2">
            <div class="min-w-0">
              <h1 class="moh-h1">System status</h1>
              <p class="mt-1 moh-meta">Stack health and availability.</p>
            </div>
            <div class="flex flex-wrap items-center gap-2">
              <span
                class="inline-flex items-center justify-center rounded-full border px-3 py-1 text-[11px] font-extrabold tracking-[0.18em] uppercase"
                :class="
                  isUp
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                    : 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300'
                "
              >
                {{ isUp ? 'Operational' : 'Degraded' }}
              </span>
              <button
                type="button"
                class="moh-tap moh-focus inline-flex items-center justify-center rounded-full border border-[var(--moh-border-subtle)] bg-[color:var(--moh-surface-2)] px-3 py-1 text-[11px] font-extrabold tracking-[0.18em] uppercase moh-surface-hover transition-colors"
                :disabled="pending"
                @click="refresh()"
              >
                {{ pending ? 'Checking…' : 'Refresh' }}
              </button>
            </div>
          </header>

          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <!-- Left column: Web over WebSocket -->
            <div class="flex flex-col gap-3">
              <div class="moh-card moh-card-matte !rounded-2xl overflow-hidden ring-1 ring-black/5 dark:ring-white/10 dark:backdrop-blur-sm">
                <div class="flex items-center justify-between gap-3 px-4 py-3 border-b moh-border-subtle bg-black/[0.02] dark:bg-white/[0.03]">
                  <div class="text-[11px] font-black tracking-[0.22em] uppercase moh-text-muted">App</div>
                  <div class="text-[11px] font-black tracking-[0.22em] uppercase text-emerald-700 dark:text-emerald-300">Up</div>
                </div>
                <div class="px-4 py-4">
                  <div class="text-base font-extrabold tracking-tight text-emerald-700 dark:text-emerald-300">Live</div>
                  <div class="mt-1 moh-meta">Frontend serving</div>
                </div>
              </div>

              <div class="moh-card moh-card-matte !rounded-2xl overflow-hidden ring-1 ring-black/5 dark:ring-white/10 dark:backdrop-blur-sm">
                <div class="flex items-center justify-between gap-3 px-4 py-3 border-b moh-border-subtle bg-black/[0.02] dark:bg-white/[0.03]">
                  <div class="text-[11px] font-black tracking-[0.22em] uppercase moh-text-muted">Realtime</div>
                  <div
                    class="text-[11px] font-black tracking-[0.22em] uppercase"
                    :class="
                      wsStatus === 'connected'
                        ? 'text-emerald-700 dark:text-emerald-300'
                        : wsStatus === 'connecting'
                          ? 'text-amber-700 dark:text-amber-300'
                          : wsStatus === 'na'
                            ? 'moh-text-muted'
                            : 'text-red-700 dark:text-red-300'
                    "
                  >
                    {{ wsStatus === 'connected' ? 'Up' : wsStatus === 'connecting' ? '…' : wsStatus === 'na' ? 'N/A' : 'Down' }}
                  </div>
                </div>
                <div class="px-4 py-4">
                  <div
                    class="text-base font-extrabold tracking-tight"
                    :class="
                      wsStatus === 'connected'
                        ? 'text-emerald-700 dark:text-emerald-300'
                        : wsStatus === 'connecting'
                          ? 'text-amber-700 dark:text-amber-300'
                          : wsStatus === 'na'
                            ? 'moh-text-muted'
                            : 'text-red-700 dark:text-red-300'
                    "
                  >
                    {{ wsStatusLabel }}
                  </div>
                  <div class="mt-1 moh-meta">Who’s online</div>
                </div>
              </div>
            </div>

            <!-- Right column: API with DB -->
            <div class="moh-card moh-card-matte !rounded-2xl overflow-hidden ring-1 ring-black/5 dark:ring-white/10 dark:backdrop-blur-sm">
              <div class="flex items-center justify-between gap-3 px-4 py-3 border-b moh-border-subtle bg-black/[0.02] dark:bg-white/[0.03]">
                <div class="text-[11px] font-black tracking-[0.22em] uppercase moh-text-muted">API</div>
                <div
                  class="text-[11px] font-black tracking-[0.22em] uppercase"
                  :class="apiOk ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300'"
                >
                  {{ apiOk ? 'Up' : 'Down' }}
                </div>
              </div>
              <div class="px-4 py-4">
                <div class="text-base font-extrabold tracking-tight" :class="apiOk ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300'">
                  {{ apiOk ? 'Operational' : 'Unreachable' }}
                </div>
                <div class="mt-1 moh-meta">Backend</div>

                <div class="mt-4 pt-4 border-t moh-border-subtle space-y-2">
                  <div class="flex items-center justify-between gap-3">
                    <div class="text-sm font-semibold moh-text-muted">Database</div>
                    <div
                      class="text-sm font-semibold"
                      :class="!apiOk ? 'moh-text-muted' : dbOk ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300'"
                    >
                      {{ !apiOk ? '—' : dbOk ? 'Operational' : 'Unavailable' }}
                    </div>
                  </div>
                  <div v-if="apiOk && dbOk" class="moh-meta">
                    Response: <span class="tabular-nums">{{ dbLatencyMsLabel }}</span>
                  </div>
                  <div v-else-if="apiOk && dbError" class="moh-meta text-red-700 dark:text-red-300">
                    {{ dbError }}
                  </div>
                  <div v-else-if="!apiOk" class="moh-meta">
                    Unavailable — API down
                  </div>
                </div>
              </div>
            </div>
          </div>

          <footer class="pt-1">
            <p class="moh-meta text-xs">{{ lastCheckedHuman }} · Refreshes every 10s</p>
          </footer>

          <blockquote class="pt-6 text-center">
            <p class="italic moh-meta">Real artists ship.</p>
            <cite class="block mt-1 text-xs moh-text-muted">— Steve Jobs</cite>
          </blockquote>
        </div>
      </div>
    </section>
  </AppPageContent>
</template>

<script setup lang="ts">
import { formatRelativeTime } from '~/utils/time-format'

definePageMeta({
  layout: 'app',
  title: 'Status',
})

usePageSeo({
  title: 'Status',
  description: 'Real-time system status. Stack health and availability.',
  canonicalPath: '/status',
  noindex: true,
})

const { data, pending, isUp, lastCheckedAtIso, refresh } = useApiHealth()
const { user } = useAuth()
const { nowMs } = useNowTicker({ everyMs: 10_000 })
const { isSocketConnected, isSocketConnecting } = usePresence()

const apiOk = computed(() => Boolean(data.value?.status === 'ok'))
const dbOk = computed(() => Boolean(data.value?.db?.status === 'ok'))
const dbLatencyMsLabel = computed(() => {
  const ms = data.value?.db?.latencyMs
  if (typeof ms !== 'number' || !Number.isFinite(ms)) return '—'
  return `${Math.max(0, Math.floor(ms))} ms`
})
const dbError = computed(() => (data.value?.db?.error ?? '').trim() || null)

/** 'connected' | 'connecting' | 'disconnected' | 'na' (not signed in) */
const wsStatus = computed(() => {
  if (!user.value?.id) return 'na'
  if (isSocketConnected.value) return 'connected'
  if (isSocketConnecting.value) return 'connecting'
  return 'disconnected'
})
const wsStatusLabel = computed(() => {
  switch (wsStatus.value) {
    case 'connected':
      return 'Connected'
    case 'connecting':
      return 'Connecting…'
    case 'na':
      return 'Not signed in'
    default:
      return 'Disconnected'
  }
})

const lastCheckedHuman = computed(() => {
  const iso = lastCheckedAtIso.value
  return `Last checked ${formatRelativeTime(iso, { nowMs: nowMs.value })}`
})

onMounted(() => {
  const t = window.setInterval(() => {
    void refresh()
  }, 10_000)
  onBeforeUnmount(() => window.clearInterval(t))
})
</script>

<!-- Dev-only reliability: prevents Vite from requesting a now-missing style chunk after HMR. -->
<style scoped>
/* no-op */
</style>

