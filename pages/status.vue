<template>
  <section class="moh-status min-h-[calc(100dvh-0px)] w-full px-4 py-10">
    <div class="mx-auto w-full max-w-5xl">
      <div class="flex flex-col gap-6">
        <header class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div class="space-y-1">
            <div class="inline-flex items-center gap-2">
              <span class="moh-status-dot" :class="isUp ? 'moh-status-dot--up' : 'moh-status-dot--down'" />
              <h1 class="moh-status-title">SYSTEM STATUS</h1>
            </div>
            <p class="moh-status-subtitle">
              Live diagnostics for the Men of Hunger stack.
            </p>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <span class="moh-pill" :class="isUp ? 'moh-pill--up' : 'moh-pill--down'">
              {{ isUp ? 'ALL SYSTEMS NOMINAL' : 'DEGRADED' }}
            </span>
            <button
              type="button"
              class="moh-pill moh-pill--action"
              :disabled="pending"
              @click="refresh()"
            >
              <span class="font-mono text-xs">REFRESH</span>
            </button>
          </div>
        </header>

        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div class="moh-panel">
            <div class="moh-panel-h">
              <div class="moh-panel-k">API</div>
              <div class="moh-panel-v" :class="apiOk ? 'moh-ok' : 'moh-bad'">
                {{ apiOk ? 'UP' : 'DOWN' }}
              </div>
            </div>
            <div class="moh-panel-b">
              <div class="moh-kv">
                <div class="moh-k">Base URL</div>
                <div class="moh-v font-mono">{{ apiBaseUrl }}</div>
              </div>
              <div class="moh-kv">
                <div class="moh-k">Probe</div>
                <div class="moh-v font-mono">{{ url }}</div>
              </div>
              <div class="moh-kv">
                <div class="moh-k">HTTP</div>
                <div class="moh-v font-mono">{{ status }}</div>
              </div>
              <div class="moh-kv">
                <div class="moh-k">Service</div>
                <div class="moh-v font-mono">{{ apiService ?? '—' }}</div>
              </div>
              <div class="moh-kv">
                <div class="moh-k">Env</div>
                <div class="moh-v font-mono">{{ apiEnv ?? '—' }}</div>
              </div>
              <div class="moh-kv">
                <div class="moh-k">Uptime</div>
                <div class="moh-v font-mono tabular-nums">{{ apiUptimeLabel }}</div>
              </div>
              <div class="moh-kv">
                <div class="moh-k">Config</div>
                <div class="moh-v font-mono">
                  r2={{ cfg?.r2Configured ? '1' : '0' }}
                  giphy={{ cfg?.giphyConfigured ? '1' : '0' }}
                  twilio={{ cfg?.twilioConfigured ? '1' : '0' }}
                </div>
              </div>
            </div>
          </div>

          <div class="moh-panel">
            <div class="moh-panel-h">
              <div class="moh-panel-k">DATABASE</div>
              <div class="moh-panel-v" :class="dbOk ? 'moh-ok' : 'moh-bad'">
                {{ dbOk ? 'READY' : 'DOWN' }}
              </div>
            </div>
            <div class="moh-panel-b">
              <div class="moh-kv">
                <div class="moh-k">Latency</div>
                <div class="moh-v font-mono tabular-nums">{{ dbLatencyMsLabel }}</div>
              </div>
              <div class="moh-kv">
                <div class="moh-k">Server time</div>
                <div class="moh-v font-mono">{{ serverNowIso ?? '—' }}</div>
              </div>
              <div v-if="dbError" class="moh-kv">
                <div class="moh-k">Error</div>
                <div class="moh-v font-mono moh-error">{{ dbError }}</div>
              </div>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div class="moh-panel lg:col-span-2">
            <div class="moh-panel-h">
              <div class="moh-panel-k">RAW RESPONSE</div>
            </div>
            <div class="moh-panel-b">
              <pre class="moh-pre"><code>{{ rawJson }}</code></pre>
            </div>
          </div>

          <div class="moh-panel">
            <div class="moh-panel-h">
              <div class="moh-panel-k">LOCAL</div>
              <div class="moh-panel-v moh-muted">TIMING</div>
            </div>
            <div class="moh-panel-b">
              <div class="moh-kv">
                <div class="moh-k">Last checked</div>
                <div class="moh-v font-mono">{{ lastCheckedAtIso ?? '—' }}</div>
              </div>
              <div class="moh-kv">
                <div class="moh-k">Auto refresh</div>
                <div class="moh-v font-mono">10s</div>
              </div>
              <div v-if="error" class="moh-kv">
                <div class="moh-k">Fetch error</div>
                <div class="moh-v font-mono moh-error">{{ error.message }}</div>
              </div>
            </div>
          </div>
        </div>

        <footer class="pt-2">
          <p class="text-xs moh-muted">
            This page is intentionally public and read-only. If something looks off, refresh once to confirm.
          </p>
        </footer>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'empty',
  title: 'Status',
})

usePageSeo({
  title: 'Status',
  description: 'Live diagnostics for the Men of Hunger stack.',
  canonicalPath: '/status',
  noindex: true,
})

const { apiBaseUrl, url, data, pending, error, status, isUp, lastCheckedAtIso, refresh } = useApiHealth()

const apiOk = computed(() => Boolean(data.value?.status === 'ok'))
const dbOk = computed(() => Boolean(data.value?.db?.status === 'ok'))
const serverNowIso = computed(() => data.value?.nowIso ?? null)
const apiService = computed(() => data.value?.service ?? null)
const apiEnv = computed(() => data.value?.config?.nodeEnv ?? null)
const apiUptimeLabel = computed(() => {
  const s = data.value?.uptimeSeconds
  if (typeof s !== 'number' || !Number.isFinite(s)) return '—'
  const sec = Math.max(0, Math.floor(s))
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const ss = sec % 60
  return `${h}h ${m}m ${ss}s`
})
const cfg = computed(() => data.value?.config ?? null)
const dbLatencyMsLabel = computed(() => {
  const ms = data.value?.db?.latencyMs
  if (typeof ms !== 'number' || !Number.isFinite(ms)) return '—'
  return `${Math.max(0, Math.floor(ms))}ms`
})
const dbError = computed(() => (data.value?.db?.error ?? '').trim() || null)

const rawJson = computed(() => (data.value ? JSON.stringify(data.value, null, 2) : '—'))

onMounted(() => {
  const t = window.setInterval(() => {
    void refresh()
  }, 10_000)
  onBeforeUnmount(() => window.clearInterval(t))
})
</script>

<style scoped>
.moh-status {
  /* “TV ops” vibe: deep black, faint grid + scanline */
  background:
    radial-gradient(1000px 600px at 20% 15%, rgba(29, 155, 240, 0.18), transparent 55%),
    radial-gradient(900px 500px at 85% 20%, rgba(245, 158, 11, 0.12), transparent 55%),
    linear-gradient(to bottom, rgba(255, 255, 255, 0.03), transparent 35%),
    repeating-linear-gradient(to bottom, rgba(255, 255, 255, 0.04) 0px, rgba(255, 255, 255, 0.04) 1px, transparent 1px, transparent 5px),
    #000;
  color: #e7e9ea;
}

.moh-status-title {
  font-weight: 900;
  letter-spacing: 0.08em;
  font-size: 28px;
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
.moh-panel-b {
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
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

.moh-pre {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 12px;
  line-height: 1.4;
  padding: 12px;
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(0, 0, 0, 0.55);
}
.moh-error {
  color: rgba(239, 68, 68, 0.95);
}
</style>

