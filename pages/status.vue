<template>
  <section class="moh-status min-h-[calc(100dvh-0px)] w-full px-4 py-8">
    <div class="mx-auto w-full max-w-5xl">
      <div class="flex flex-col gap-4">
        <header class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div class="space-y-1">
            <div class="inline-flex items-center gap-2">
              <span class="moh-status-dot" :class="isUp ? 'moh-status-dot--up' : 'moh-status-dot--down'" />
              <h1 class="moh-status-title">STATUS</h1>
            </div>
            <p class="moh-status-subtitle">High-level health checks (web / api / db).</p>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <span class="moh-pill" :class="isUp ? 'moh-pill--up' : 'moh-pill--down'">
              {{ isUp ? 'NOMINAL' : 'DEGRADED' }}
            </span>
            <button
              type="button"
              class="moh-pill moh-pill--action"
              :disabled="pending"
              @click="refresh()"
            >
              <span class="font-mono text-xs">{{ pending ? 'CHECKING…' : 'REFRESH' }}</span>
            </button>
          </div>
        </header>

        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <!-- WEB -->
          <div class="moh-panel">
            <div class="moh-panel-h">
              <div class="moh-panel-k">WEB</div>
              <div class="moh-panel-v moh-ok">UP</div>
            </div>
            <div class="moh-panel-b">
              <div class="moh-big" :class="'moh-ok'">ONLINE</div>
              <div class="moh-mini font-mono moh-muted">public=true</div>
            </div>
          </div>

          <!-- API -->
          <div class="moh-panel">
            <div class="moh-panel-h">
              <div class="moh-panel-k">API</div>
              <div class="moh-panel-v" :class="apiOk ? 'moh-ok' : 'moh-bad'">
                {{ apiOk ? 'UP' : 'DOWN' }}
              </div>
            </div>
            <div class="moh-panel-b">
              <div class="moh-big" :class="apiOk ? 'moh-ok' : 'moh-bad'">
                {{ apiOk ? 'HEALTHY' : 'UNREACHABLE' }}
              </div>
              <div class="moh-mini font-mono moh-muted">/health</div>
            </div>
          </div>

          <!-- DB -->
          <div class="moh-panel">
            <div class="moh-panel-h">
              <div class="moh-panel-k">DB</div>
              <div class="moh-panel-v" :class="dbOk ? 'moh-ok' : 'moh-bad'">
                {{ dbOk ? 'READY' : 'DOWN' }}
              </div>
            </div>
            <div class="moh-panel-b">
              <div class="moh-big" :class="dbOk ? 'moh-ok' : 'moh-bad'">
                {{ dbOk ? 'CONNECTED' : 'FAILED' }}
              </div>
              <div v-if="dbOk" class="moh-mini font-mono moh-muted">latency={{ dbLatencyMsLabel }}</div>
              <div v-else-if="dbError" class="moh-mini font-mono moh-error">err={{ dbError }}</div>
            </div>
          </div>

          <!-- WebSocket (presence) -->
          <div class="moh-panel">
            <div class="moh-panel-h">
              <div class="moh-panel-k">WS</div>
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
            <div class="moh-panel-b">
              <div
                class="moh-big"
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
              <div class="moh-mini font-mono moh-muted">presence (when signed in)</div>
            </div>
          </div>
        </div>

        <footer class="pt-1">
          <p class="text-xs moh-muted font-mono">last_check={{ lastCheckedAtIso ?? '—' }} refresh_interval=10s</p>
        </footer>
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
  description: 'Live diagnostics for the Men of Hunger stack.',
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
  return `${Math.max(0, Math.floor(ms))}ms`
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
      return 'CONNECTED'
    case 'connecting':
      return 'CONNECTING…'
    case 'na':
      return 'NOT SIGNED IN'
    default:
      return 'DISCONNECTED'
  }
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
  font-family: var(--moh-font-serif);
  font-weight: 900;
  letter-spacing: 0.08em;
  font-size: 24px;
  line-height: 1;
}
.moh-status-subtitle {
  color: rgba(231, 233, 234, 0.75);
}
.moh-muted {
  color: rgba(231, 233, 234, 0.68);
}

.moh-status-dot {
  width: 12px;
  height: 12px;
  border-radius: 999px;
  box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.4);
}
.moh-status-dot--up {
  background: #22c55e;
  box-shadow: 0 0 20px rgba(34, 197, 94, 0.35), 0 0 0 2px rgba(0, 0, 0, 0.4);
}
.moh-status-dot--down {
  background: #ef4444;
  box-shadow: 0 0 20px rgba(239, 68, 68, 0.35), 0 0 0 2px rgba(0, 0, 0, 0.4);
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
</style>

