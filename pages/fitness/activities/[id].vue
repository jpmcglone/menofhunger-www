<template>
  <AppPageContent bottom="standard">
    <div class="mx-auto w-full max-w-3xl px-4 pt-4 pb-8 space-y-5">
      <div class="flex items-center justify-between gap-3">
        <NuxtLink
          to="/fitness"
          class="inline-flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
        >
          <Icon name="tabler:arrow-left" size="16" />
          Back to Fitness
        </NuxtLink>
        <div v-if="activity" class="flex items-center gap-2">
          <button
            type="button"
            class="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium border moh-border hover:bg-gray-50 dark:hover:bg-zinc-900 transition-colors"
            @click="showShare = true"
          >
            Share
          </button>
          <button
            type="button"
            class="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium border moh-border hover:bg-gray-50 dark:hover:bg-zinc-900 transition-colors"
            @click="downloadRaw"
          >
            <Icon name="tabler:download" size="16" />
            Download raw data
          </button>
        </div>
      </div>

      <div v-if="loading" class="flex items-center justify-center py-20">
        <AppLogoLoader />
      </div>

      <div
        v-else-if="error"
        class="py-16 text-center space-y-3"
      >
        <p class="text-sm text-gray-500 dark:text-gray-400">{{ error }}</p>
        <button type="button" class="text-sm font-medium text-orange-600 dark:text-orange-400" @click="load">
          Try again
        </button>
      </div>

      <template v-else-if="activity">
        <div>
          <h1 class="text-xl font-bold">{{ title }}</h1>
          <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {{ providerLabel }} · {{ formatActivityDate(activity.startedAt) }}
          </p>
        </div>

        <dl class="rounded-xl border moh-border moh-surface-2 moh-divide text-sm">
          <div v-for="row in fieldRows" :key="row.label" class="flex items-start justify-between gap-4 px-4 py-3">
            <dt class="text-gray-500 dark:text-gray-400 shrink-0">{{ row.label }}</dt>
            <dd class="font-medium text-right tabular-nums break-all">{{ row.value }}</dd>
          </div>
        </dl>

        <div>
          <div class="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">
            Raw data
          </div>
          <pre class="rounded-xl border moh-border moh-surface-2 p-4 text-[11px] leading-5 overflow-x-auto whitespace-pre-wrap break-all">{{ prettyRaw }}</pre>
        </div>
      </template>
    </div>

    <AppModal
      v-model="showShare"
      title="Share workout"
      max-width-class="max-w-md"
      max-height="min(90vh, 36rem)"
      :disable-close="sharingPost"
    >
      <div class="p-4">
        <textarea
          v-model="shareBody"
          placeholder="Add a caption… (optional)"
          rows="3"
          class="w-full rounded-lg border moh-border bg-transparent px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-orange-500"
        />
      </div>
      <template #footer>
        <div class="flex items-center justify-end gap-3">
          <button type="button" class="text-sm moh-text-muted" :disabled="sharingPost" @click="showShare = false">
            Cancel
          </button>
          <button
            type="button"
            class="px-4 py-2 rounded-xl bg-gray-600 text-white text-sm font-semibold disabled:opacity-50"
            :disabled="sharingPost"
            @click="submitShare"
          >
            {{ sharingPost ? 'Posting…' : 'Post' }}
          </button>
        </div>
      </template>
    </AppModal>
  </AppPageContent>
</template>

<script setup lang="ts">
import type { FitnessActivityDetail, FitnessActivityType, FitnessUnits } from '~/types/api'
import { getSafeUserErrorMessage } from '~/utils/api-error'

definePageMeta({
  layout: 'app',
  requiresAuth: true,
  requiresVerified: true,
  ssr: false,
  hideTopBar: true,
})

usePageSeo({
  title: 'Activity',
  description: 'Full fitness activity data.',
  canonicalPath: '/fitness',
  noindex: true,
})

const route = useRoute()
const { apiFetchData } = useApiClient()

const activity = ref<FitnessActivityDetail | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)
const showShare = ref(false)
const shareBody = ref('')
const sharingPost = ref(false)
const toast = useAppToast()

const activityId = computed(() => String(route.params.id ?? '').trim())

const title = computed(() => {
  const a = activity.value
  if (!a) return 'Activity'
  return a.name?.trim() || activityLabel(a.activityType)
})

const providerLabel = computed(() => {
  if (activity.value?.provider === 'strava') return 'Strava'
  if (activity.value?.provider === 'apple_health') return 'Apple Health'
  return activity.value?.provider ?? ''
})

const prettyRaw = computed(() => {
  try {
    return JSON.stringify(activity.value?.raw ?? null, null, 2)
  } catch {
    return String(activity.value?.raw ?? '')
  }
})

const fieldRows = computed(() => {
  const a = activity.value
  if (!a) return []
  const units = a.units
  return [
    { label: 'Name', value: a.name?.trim() || '—' },
    { label: 'Type', value: activityLabel(a.activityType) },
    { label: 'Provider', value: providerLabel.value },
    { label: 'External ID', value: a.externalId || '—' },
    { label: 'Started', value: formatDateTime(a.startedAt) },
    { label: 'Ended', value: a.endedAt ? formatDateTime(a.endedAt) : '—' },
    { label: 'Duration', value: formatDuration(a.durationSec) },
    { label: 'Distance', value: a.distanceM != null ? `${formatDistance(a.distanceM, units)} ${units === 'us' ? 'mi' : 'km'}` : '—' },
    { label: 'Elevation', value: a.totalElevationM != null ? formatElevation(a.totalElevationM, units) : '—' },
    { label: 'Steps', value: a.stepsCount != null ? String(a.stepsCount) : '—' },
    { label: 'Calories', value: a.calories != null ? `${Math.round(a.calories)} kcal` : '—' },
    { label: 'Avg HR', value: a.avgHeartrate != null ? `${Math.round(a.avgHeartrate)} bpm` : '—' },
    { label: 'Max HR', value: a.maxHeartrate != null ? `${Math.round(a.maxHeartrate)} bpm` : '—' },
    { label: 'Effort', value: a.effortScore != null ? String(a.effortScore) : '—' },
  ]
})

async function load() {
  loading.value = true
  error.value = null
  try {
    activity.value = await apiFetchData<FitnessActivityDetail>(`/fitness/activities/${encodeURIComponent(activityId.value)}`)
  } catch (e) {
    activity.value = null
    error.value = getSafeUserErrorMessage(e, 'Could not load this activity.')
  } finally {
    loading.value = false
  }
}

async function submitShare() {
  const a = activity.value
  if (!a) return
  sharingPost.value = true
  try {
    const result = await apiFetchData<{ post: { id: string } }>('/fitness/share', {
      method: 'POST',
      body: { shareType: 'activity', activityId: a.id, body: shareBody.value, visibility: 'public' },
    })
    showShare.value = false
    shareBody.value = ''
    toast.push({ title: 'Posted!', to: `/p/${result.post.id}`, tone: 'success', durationMs: 6000 })
  } catch (e) {
    toast.pushError(e, 'Failed to share.')
  } finally {
    sharingPost.value = false
  }
}

function downloadRaw() {
  const a = activity.value
  if (!a) return
  const payload = {
    id: a.id,
    externalId: a.externalId,
    provider: a.provider,
    activityType: a.activityType,
    name: a.name,
    startedAt: a.startedAt,
    endedAt: a.endedAt,
    durationSec: a.durationSec,
    distanceM: a.distanceM,
    effortScore: a.effortScore,
    stepsCount: a.stepsCount,
    calories: a.calories,
    avgHeartrate: a.avgHeartrate,
    maxHeartrate: a.maxHeartrate,
    totalElevationM: a.totalElevationM,
    raw: a.raw,
  }
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `fitness-activity-${a.id}.json`
  link.click()
  URL.revokeObjectURL(url)
}

onMounted(() => {
  void load()
})

watch(activityId, () => {
  void load()
})

function activityLabel(type: FitnessActivityType): string {
  const map: Record<FitnessActivityType, string> = {
    run: 'Run', ride: 'Ride', walk: 'Walk', swim: 'Swim',
    workout: 'Workout', hike: 'Hike', yoga: 'Yoga', other: 'Activity',
  }
  return map[type] ?? type
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}h ${m}m ${s}s`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

function formatDistance(meters: number, units: FitnessUnits): string {
  if (units === 'us') return (meters / 1609.34).toFixed(2)
  return (meters / 1000).toFixed(2)
}

function formatElevation(meters: number, units: FitnessUnits): string {
  if (units === 'us') return `${Math.round(meters * 3.28084)} ft`
  return `${Math.round(meters)} m`
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  })
}

function formatActivityDate(iso: string): string {
  const d = new Date(iso)
  const dateStr = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  const timeStr = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  return `${dateStr} · ${timeStr}`
}
</script>
