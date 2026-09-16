<template>
  <div class="space-y-6">
    <section class="space-y-4" aria-labelledby="healthkit-title">
      <h2 id="healthkit-title" class="moh-h2">Apple Health · HealthKit</h2>
      <p class="moh-body moh-text-muted">
        Men of Hunger uses HealthKit to read the Apple Health data you choose to share:
        workouts and routes, activity and steps, heart health, body measurements, sleep, and recovery.
      </p>
      <p class="moh-body moh-text-muted">
        When you connect, this data syncs to your Men of Hunger account to show your fitness progress.
        Your fitness data is only visible to you unless you choose to share an activity or progress update.
        You choose the audience for each post. Men of Hunger does not write to Apple Health.
      </p>
      <p class="moh-meta">You control access in the Health app. Connecting is optional.</p>
    </section>

    <AppPersonAccountSwitchPrompt v-if="isPageAccount" feature="Fitness" />
    <div v-else-if="!canAccessFitness" class="space-y-3">
      <p class="moh-body moh-text-muted">Get verified to connect Apple Health and track your fitness.</p>
      <div class="flex flex-wrap gap-2">
        <Button as="NuxtLink" to="/settings/verification" label="Verify account" rounded />
      </div>
    </div>
    <p v-else-if="loading" role="status" class="moh-meta">Checking connection…</p>
    <div v-else-if="loadError" role="alert" class="space-y-2">
      <p class="moh-body moh-text-muted">{{ loadError }}</p>
      <Button label="Try again" severity="secondary" @click="loadPage" />
    </div>

    <!-- Native connection status; browser never requests HealthKit access. -->
    <div v-if="canAccessFitness && !loading && !loadError" class="border-b moh-border pb-5 space-y-3 text-sm">
      <div class="flex items-center justify-between gap-3">
        <div class="flex items-center gap-2">
          <Icon name="simple-icons:apple" class="text-gray-700 dark:text-gray-200 text-lg" />
          <span class="font-medium">Apple Health connection</span>
        </div>
        <div v-if="appleHealthConnection" class="flex items-center gap-2">
          <span class="text-xs text-green-600 dark:text-green-400">Connected via iOS</span>
          <button
            class="text-xs text-red-500 hover:text-red-600 transition-colors disabled:opacity-50"
            :disabled="disconnectingAppleHealth"
            @click="disconnectAppleHealth"
          >
            Disconnect
          </button>
        </div>
        <span v-else class="text-xs text-gray-400">iOS app only</span>
      </div>
      <p v-if="!appleHealthConnection" class="text-xs text-gray-500 dark:text-gray-400">
        Open Men of Hunger on your iPhone or iPad, then tap your avatar → Settings → Fitness &amp; Apple Health. Apple Health cannot be connected in a browser.
      </p>
      <div v-else class="text-xs text-gray-500 dark:text-gray-400">
        <div v-if="appleHealthConnection.lastSyncAt">
          Last synced: {{ formatRelative(appleHealthConnection.lastSyncAt) }}
        </div>
      </div>
    </div>

    <!-- Units preference -->
    <div v-if="canAccessFitness && !loading && !loadError" class="border-b moh-border pb-5 space-y-3 text-sm">
      <div class="font-medium">Units</div>
      <div class="flex items-center gap-3">
        <label class="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            value="us"
            :checked="units === 'us'"
            class="accent-orange-500"
            @change="setUnits('us')"
          >
          <span>US (lbs, miles)</span>
        </label>
        <label class="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            value="metric"
            :checked="units === 'metric'"
            class="accent-orange-500"
            @change="setUnits('metric')"
          >
          <span>Metric (kg, km)</span>
        </label>
      </div>
    </div>

    <!-- Strava connection -->
    <div v-if="canAccessFitness && !loading && !loadError" class="space-y-3 text-sm" :class="!stravaEnabled ? 'opacity-60' : ''">
      <div class="flex items-center justify-between gap-3">
        <div class="flex items-center gap-2">
          <span class="text-[11px] font-black uppercase tracking-wide" style="color: #FC4C02">Strava</span>
          <span class="font-medium">Strava</span>
        </div>

        <!-- Not yet available for this account -->
        <span v-if="!stravaEnabled" class="text-xs text-gray-400 dark:text-gray-500 italic">
          Not yet available
        </span>

        <!-- Enabled: connected or connect button -->
        <template v-else>
          <div v-if="stravaConnection" class="flex items-center gap-2">
            <span class="text-xs text-green-600 dark:text-green-400">Connected</span>
            <button
              class="text-xs text-red-500 hover:text-red-600 transition-colors"
              :disabled="disconnecting"
              @click="disconnectStrava"
            >
              Disconnect
            </button>
          </div>
          <button
            v-else
            class="text-xs font-medium text-orange-600 dark:text-orange-400 hover:underline"
            :disabled="connecting"
            @click="connectStrava"
          >
            Connect
          </button>
        </template>
      </div>

      <p v-if="!stravaEnabled" class="text-xs text-gray-500 dark:text-gray-400">
        Strava integration is coming soon. Check back later or contact support to get early access.
      </p>

      <template v-else-if="stravaConnection">
        <div class="text-xs text-gray-500 dark:text-gray-400 space-y-1">
          <div v-if="stravaConnection.lastSyncAt">
            Last synced: {{ formatRelative(stravaConnection.lastSyncAt) }}
          </div>
          <div v-else>Never synced</div>
        </div>
        <button
          class="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50"
          :disabled="syncing || syncCooldownRemaining > 0"
          @click="syncNow"
        >
          <span v-if="syncing">Syncing...</span>
          <span v-else-if="syncCooldownRemaining > 0">Sync again in {{ formatCooldown(syncCooldownRemaining) }}</span>
          <span v-else>Sync now</span>
        </button>
      </template>
    </div>


  </div>
</template>

<script setup lang="ts">
import type { FitnessConnection } from '~/types/api'

// Figma: https://www.figma.com/design/YnuRSJB7p90n9jEY4mb4RN?node-id=608-192
const { isVerified, isPageAccount } = useAuth()
const canAccessFitness = computed(() => isVerified.value && !isPageAccount.value)
const loading = ref(true)
const loadError = ref('')

const { apiFetchData } = useApiClient()
const toast = useAppToast()

const connections = ref<FitnessConnection[]>([])
const units = ref<'us' | 'metric'>('us')
const stravaEnabled = ref(false)
const connecting = ref(false)
const disconnecting = ref(false)
const disconnectingAppleHealth = ref(false)
const syncing = ref(false)
const syncCooldownRemaining = ref(0)
let cooldownInterval: ReturnType<typeof setInterval> | null = null

const stravaConnection = computed(() => connections.value.find((c) => c.provider === 'strava') ?? null)
const appleHealthConnection = computed(() => connections.value.find((c) => c.provider === 'apple_health') ?? null)

async function loadPage() {
  if (!canAccessFitness.value) {
    loading.value = false
    return
  }
  loading.value = true
  loadError.value = ''
  try {
    const data = await apiFetchData<{ connections: FitnessConnection[]; units: 'us' | 'metric'; stravaEnabled: boolean }>('/fitness/me')
    connections.value = data.connections
    units.value = data.units
    stravaEnabled.value = Boolean(data.stravaEnabled)
    const strava = data.connections.find((c) => c.provider === 'strava')
    const remaining = manualSyncRemainingSeconds(strava?.lastManualSyncAt ?? null)
    if (remaining > 0) startCooldown(remaining)
  } catch {
    loadError.value = "Couldn't load fitness settings."
  } finally {
    loading.value = false
  }
}

onMounted(loadPage)
watch(canAccessFitness, loadPage)

function formatRelative(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

async function setUnits(u: 'us' | 'metric') {
  units.value = u
  try {
    await apiFetchData<void>('/fitness/units', { method: 'PUT', body: { units: u } })
  } catch {
    toast.push({ title: 'Failed to update units.', tone: 'error' })
  }
}

async function connectStrava() {
  connecting.value = true
  try {
    const redirectUri = `${window.location.origin}/settings/fitness?strava_callback=1`
    const data = await apiFetchData<{ url: string }>(`/fitness/strava/auth-url?redirectUri=${encodeURIComponent(redirectUri)}`)
    window.location.href = data.url
  } catch {
    toast.push({ title: 'Could not start Strava connection.', tone: 'error' })
    connecting.value = false
  }
}

async function disconnectStrava() {
  disconnecting.value = true
  try {
    await apiFetchData<void>('/fitness/strava/disconnect', { method: 'DELETE' })
    connections.value = connections.value.filter((c) => c.provider !== 'strava')
    toast.push({ title: 'Strava disconnected.', tone: 'success' })
  } catch {
    toast.push({ title: 'Failed to disconnect Strava.', tone: 'error' })
  } finally {
    disconnecting.value = false
  }
}

async function disconnectAppleHealth() {
  disconnectingAppleHealth.value = true
  try {
    await apiFetchData<void>('/fitness/apple_health/disconnect', { method: 'DELETE' })
    connections.value = connections.value.filter((c) => c.provider !== 'apple_health')
    toast.push({ title: 'Apple Health disconnected.', tone: 'success' })
  } catch {
    toast.push({ title: 'Failed to disconnect Apple Health.', tone: 'error' })
  } finally {
    disconnectingAppleHealth.value = false
  }
}

async function syncNow() {
  syncing.value = true
  try {
    await apiFetchData<{ inserted: number; deduped: number }>('/fitness/sync', {
      method: 'POST',
      body: { provider: 'strava' },
    })
    toast.push({ title: 'Sync complete.', tone: 'success' })
    await loadPage()
    startCooldown(300)
  } catch (err: any) {
    const msg = err?.data?.message ?? 'Sync failed.'
    toast.push({ title: msg, tone: 'error' })
    if (msg.includes('wait')) {
      const match = msg.match(/(\d+) more seconds/)
      if (match) startCooldown(Number(match[1]))
    }
  } finally {
    syncing.value = false
  }
}

function startCooldown(seconds: number) {
  syncCooldownRemaining.value = seconds
  if (cooldownInterval) clearInterval(cooldownInterval)
  cooldownInterval = setInterval(() => {
    syncCooldownRemaining.value = Math.max(0, syncCooldownRemaining.value - 1)
    if (syncCooldownRemaining.value === 0 && cooldownInterval) {
      clearInterval(cooldownInterval)
      cooldownInterval = null
    }
  }, 1000)
}

function formatCooldown(seconds: number): string {
  if (seconds >= 60) return `${Math.ceil(seconds / 60)}m`
  return `${seconds}s`
}

const MANUAL_SYNC_COOLDOWN_SEC = 5 * 60

function manualSyncRemainingSeconds(lastManualSyncAt: string | null | undefined): number {
  if (!lastManualSyncAt) return 0
  const elapsed = Math.floor((Date.now() - new Date(lastManualSyncAt).getTime()) / 1000)
  return Math.max(0, MANUAL_SYNC_COOLDOWN_SEC - elapsed)
}

onBeforeUnmount(() => {
  if (cooldownInterval) clearInterval(cooldownInterval)
})

// Handle Strava OAuth callback redirect.
const route = useRoute()
onMounted(async () => {
  if (!canAccessFitness.value || route.query.strava_callback !== '1' || !route.query.code) return
  connecting.value = true
  try {
    const code = String(route.query.code)
    const redirectUri = `${window.location.origin}/settings/fitness?strava_callback=1`
    await apiFetchData<{ connection: FitnessConnection }>('/fitness/strava/connect', {
      method: 'POST',
      body: { code, redirectUri },
    })
    toast.push({ title: 'Strava connected.', tone: 'success' })
    await loadPage()
    await navigateTo('/settings/fitness', { replace: true })
  } catch {
    toast.push({ title: 'Failed to connect Strava.', tone: 'error' })
  } finally {
    connecting.value = false
  }
})
</script>
