<template>
  <section class="moh-status min-h-[calc(100dvh-0px)] w-full px-4 pt-0 pb-8">
    <div class="mx-auto w-full max-w-5xl">
      <div class="flex flex-col gap-4">
        <header class="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 class="moh-status-title">System status</h1>
            <p class="moh-status-sub">Stack health and availability.</p>
          </div>
          <div class="flex flex-wrap items-center gap-2">
          <span class="moh-pill" :class="isUp ? 'moh-pill--up' : 'moh-pill--down'">
            {{ isUp ? 'Operational' : 'Degraded' }}
          </span>
          <button
            type="button"
            class="moh-pill moh-pill--action"
            :disabled="pending"
            @click="refresh()"
          >
            <span class="text-xs">{{ pending ? 'Checking…' : 'Refresh' }}</span>
          </button>
          </div>
        </header>

        <div class="moh-status-grid grid grid-cols-1 gap-4 sm:grid-cols-2">
          <!-- Left column: Web over WebSocket (thin cards, same combined height as API card) -->
          <div class="moh-status-left flex flex-col gap-3">
            <div class="moh-panel moh-panel-thin flex-1 flex flex-col min-h-0">
              <div class="moh-panel-h moh-panel-h--thin">
                <div class="moh-panel-k">APP</div>
                <div class="moh-panel-v moh-ok">UP</div>
              </div>
              <div class="moh-panel-b moh-panel-b--thin flex-1 flex flex-col justify-center">
                <div class="moh-big moh-big--thin moh-ok">Live</div>
                <div class="moh-mini moh-muted">Frontend serving</div>
              </div>
            </div>
            <div class="moh-panel moh-panel-thin flex-1 flex flex-col min-h-0">
              <div class="moh-panel-h moh-panel-h--thin">
                <div class="moh-panel-k">REALTIME</div>
                <div
                  class="moh-panel-v"
                  :class="
                    wsStatus === 'connected'
                      ? 'moh-ok'
                      : wsStatus === 'connecting'
                        ? 'moh-warn'
                        : wsStatus === 'na'
                          ? 'moh-na'
                          : 'moh-bad'
                  "
                >
                  {{ wsStatus === 'connected' ? 'UP' : wsStatus === 'connecting' ? '…' : wsStatus === 'na' ? 'N/A' : 'DOWN' }}
                </div>
              </div>
              <div class="moh-panel-b moh-panel-b--thin flex-1 flex flex-col justify-center">
                <div
                  class="moh-big moh-big--thin"
                  :class="
                    wsStatus === 'connected'
                      ? 'moh-ok'
                      : wsStatus === 'connecting'
                        ? 'moh-warn'
                        : wsStatus === 'na'
                          ? 'moh-na'
                          : 'moh-bad'
                  "
                >
                  {{ wsStatusLabel }}
                </div>
                <div class="moh-mini moh-muted">Who’s online</div>
              </div>
            </div>
          </div>

          <!-- Right column: API with DB -->
          <div class="moh-panel">
            <div class="moh-panel-h">
              <div class="moh-panel-k">API</div>
              <div class="moh-panel-v" :class="apiOk ? 'moh-ok' : 'moh-bad'">
                {{ apiOk ? 'UP' : 'DOWN' }}
              </div>
            </div>
            <div class="moh-panel-b">
              <div class="moh-big" :class="apiOk ? 'moh-ok' : 'moh-bad'">
                {{ apiOk ? 'Operational' : 'Unreachable' }}
              </div>
              <div class="moh-mini moh-muted">Backend</div>

              <!-- Children of API: DB (embedded; only known when API is up) -->
              <div class="moh-api-children">
                <div class="moh-api-child">
                  <span class="moh-api-child-k">↳ Database</span>
                  <span
                    class="moh-api-child-v"
                    :class="
                      !apiOk ? 'moh-na' : dbOk ? 'moh-ok' : 'moh-bad'
                    "
                  >
                    {{ !apiOk ? '—' : dbOk ? 'Operational' : 'Unavailable' }}
                  </span>
                </div>
                <div v-if="apiOk && dbOk" class="moh-mini moh-muted moh-api-child-detail">
                  Response: {{ dbLatencyMsLabel }}
                </div>
                <div v-else-if="apiOk && dbError" class="moh-mini moh-error moh-api-child-detail">
                  {{ dbError }}
                </div>
                <div v-else-if="!apiOk" class="moh-mini moh-muted moh-api-child-detail">
                  Unavailable — API down
                </div>
              </div>
            </div>
          </div>
        </div>

        <footer class="pt-1">
          <p class="text-xs moh-muted">{{ lastCheckedHuman }} · Refreshes every 10s</p>
        </footer>

        <blockquote class="moh-quote">
          <p class="moh-quote-text">Real artists ship.</p>
          <cite class="moh-quote-cite">— Steve Jobs</cite>
        </blockquote>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
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

function formatRelativeTime(iso: string | null): string {
  if (!iso?.trim()) return 'Never'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return 'Unknown'
  const now = Date.now()
  const diffMs = now - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  if (diffSec < 10) return 'Just now'
  if (diffSec < 60) return `${diffSec} seconds ago`
  if (diffMin === 1) return '1 minute ago'
  if (diffMin < 60) return `${diffMin} minutes ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr === 1) return '1 hour ago'
  if (diffHr < 24) return `${diffHr} hours ago`
  return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

const lastCheckedHuman = computed(() => {
  const iso = lastCheckedAtIso.value
  return `Last checked ${formatRelativeTime(iso)}`
})

onMounted(() => {
  const t = window.setInterval(() => {
    void refresh()
  }, 10_000)
  onBeforeUnmount(() => window.clearInterval(t))
})
</script>

<style scoped>
.moh-status {
  /* Background comes from `layouts/app.vue` when route is /status. */
  color: var(--moh-text);
}

.moh-status-title {
  font-size: 1.25rem;
  font-weight: 800;
  letter-spacing: 0.02em;
  margin: 0;
  color: var(--moh-text);
}

.moh-status-sub {
  font-size: 0.8125rem;
  color: rgba(231, 233, 234, 0.7);
  margin: 0.25rem 0 0;
}

.moh-muted {
  color: rgba(231, 233, 234, 0.68);
}

.moh-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 8px 10px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.06);
  font-weight: 800;
  letter-spacing: 0.06em;
  font-size: 11px;
}
.moh-pill--up {
  border-color: rgba(34, 197, 94, 0.35);
  background: rgba(34, 197, 94, 0.12);
}
.moh-pill--down {
  border-color: rgba(239, 68, 68, 0.35);
  background: rgba(239, 68, 68, 0.12);
}
.moh-pill--action {
  cursor: pointer;
  user-select: none;
}
.moh-pill--action:disabled {
  opacity: 0.6;
  cursor: default;
}

.moh-panel {
  border-radius: 18px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(10px);
  overflow: hidden;
}
.moh-panel-h {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.04);
}
.moh-panel-k {
  font-weight: 900;
  letter-spacing: 0.12em;
  font-size: 11px;
  color: rgba(231, 233, 234, 0.75);
}
.moh-panel-v {
  font-weight: 900;
  letter-spacing: 0.12em;
  font-size: 11px;
}
.moh-ok {
  color: #22c55e;
}
.moh-bad {
  color: #ef4444;
}
.moh-warn {
  color: #eab308;
}
.moh-na {
  color: rgba(231, 233, 234, 0.5);
}
.moh-panel-b {
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.moh-status-grid {
  align-items: stretch;
}
.moh-status-left {
  min-height: 0;
}
.moh-panel-thin {
  min-height: 0;
}
.moh-panel-h--thin {
  padding: 8px 12px;
}
.moh-panel-h--thin .moh-panel-k,
.moh-panel-h--thin .moh-panel-v {
  font-size: 10px;
}
.moh-panel-b--thin {
  padding: 10px 12px;
  gap: 4px;
}
.moh-big--thin {
  font-size: 14px;
}

.moh-api-children {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.moh-api-child {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  font-size: 13px;
}
.moh-api-child-k {
  font-weight: 700;
  letter-spacing: 0.06em;
  color: rgba(231, 233, 234, 0.7);
}
.moh-api-child-v {
  font-weight: 800;
  letter-spacing: 0.05em;
  font-size: 12px;
}
.moh-api-child-detail {
  padding-left: 0.5rem;
  margin-top: -2px;
}

.moh-big {
  font-weight: 900;
  letter-spacing: 0.06em;
  font-size: 16px;
}

.moh-mini {
  font-size: 12px;
  color: rgba(231, 233, 234, 0.82);
  overflow-wrap: anywhere;
}

.moh-kv {
  display: grid;
  grid-template-columns: 120px 1fr;
  gap: 10px;
}
.moh-k {
  color: rgba(231, 233, 234, 0.65);
  font-size: 12px;
}
.moh-v {
  color: rgba(231, 233, 234, 0.92);
  font-size: 12px;
  overflow-wrap: anywhere;
}

.moh-error {
  color: rgba(239, 68, 68, 0.95);
}

.moh-quote {
  margin: 1.5rem 0 0;
  padding: 0;
  border: none;
  text-align: center;
}
.moh-quote-text {
  font-style: italic;
  font-size: 14px;
  color: rgba(231, 233, 234, 0.75);
  margin: 0;
}
.moh-quote-cite {
  display: block;
  font-style: normal;
  font-size: 12px;
  color: rgba(231, 233, 234, 0.55);
  margin-top: 0.25rem;
}
</style>

