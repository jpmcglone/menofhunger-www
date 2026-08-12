<template>
  <div class="rounded-xl border moh-border p-3 space-y-3">
    <div class="flex items-center justify-between gap-3">
      <span class="text-xs font-semibold uppercase tracking-wider moh-meta">Owner Controls</span>
      <button
        type="button"
        class="moh-tap moh-focus text-xs font-medium px-3 py-1 rounded-full transition-colors"
        :class="space.isActive
          ? 'bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20'
          : 'bg-green-500/10 text-green-600 dark:text-green-400 hover:bg-green-500/20'"
        @click="toggleActive"
      >
        {{ space.isActive ? 'End' : 'Go live' }}
      </button>
    </div>

    <!-- Mode selector -->
    <div class="flex items-center gap-2">
      <button
        v-for="m in modes"
        :key="m.value"
        type="button"
        class="moh-tap moh-focus text-xs font-medium px-3 py-1.5 rounded-full border transition-colors"
        :class="currentMode === m.value
          ? 'border-[var(--p-primary-color)] bg-[var(--p-primary-color)]/10 text-[var(--p-primary-color)]'
          : 'moh-border-subtle moh-meta moh-surface-hover'"
        @click="onModeSelect(m.value)"
      >
        <Icon :name="m.icon" class="text-[13px] mr-1" aria-hidden="true" />
        {{ m.label }}
      </button>
    </div>

    <!-- URL input for Watch Party -->
    <div v-if="currentMode === 'WATCH_PARTY'" class="flex items-center gap-2">
      <input
        v-model="watchPartyUrlInput"
        type="url"
        placeholder="YouTube URL"
        class="flex-1 rounded-lg border moh-border-subtle bg-transparent px-3 py-1.5 text-sm moh-text placeholder:moh-meta focus:outline-none focus:ring-1 focus:ring-[var(--p-primary-color)]"
        @keydown.enter="applyMode"
      />
      <button
        type="button"
        class="moh-tap moh-focus shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg transition-opacity"
        :class="canApplyWatchParty
          ? 'bg-[var(--p-primary-color)] text-white hover:opacity-90'
          : 'bg-gray-300/60 text-gray-600 dark:bg-zinc-700 dark:text-zinc-300 cursor-not-allowed'"
        :disabled="!canApplyWatchParty"
        @click="applyMode"
      >
        {{ canApplyWatchParty ? 'Apply' : 'Current URL' }}
      </button>
    </div>

    <!-- URL input + presets for Radio -->
    <div v-if="currentMode === 'RADIO'" class="space-y-2">
      <div class="flex flex-wrap gap-1.5">
        <button
          v-for="preset in radioPresets"
          :key="preset.url"
          type="button"
          class="moh-tap moh-focus text-xs px-2.5 py-1 rounded-full border transition-colors"
          :class="radioStreamUrlInput === preset.url
            ? 'border-[var(--p-primary-color)] bg-[var(--p-primary-color)]/10 text-[var(--p-primary-color)]'
            : 'moh-border-subtle moh-meta moh-surface-hover'"
          @click="radioStreamUrlInput = preset.url"
        >
          {{ preset.label }}
        </button>
      </div>
      <div class="flex items-center gap-2">
        <input
          v-model="radioStreamUrlInput"
          type="url"
          placeholder="MP3 stream URL"
          class="flex-1 rounded-lg border moh-border-subtle bg-transparent px-3 py-1.5 text-sm moh-text placeholder:moh-meta focus:outline-none focus:ring-1 focus:ring-[var(--p-primary-color)]"
          @keydown.enter="applyMode"
        />
        <button
          type="button"
          class="moh-tap moh-focus shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg bg-[var(--p-primary-color)] text-white hover:opacity-90 transition-opacity"
          @click="applyMode"
        >
          Apply
        </button>
      </div>
    </div>

    <!-- Schedule -->
    <div class="space-y-2 border-t moh-border-subtle pt-3">
      <div class="flex items-center justify-between gap-2">
        <span class="text-xs font-semibold uppercase tracking-wider moh-meta">Schedule</span>
        <AppSpaceNotifyCount
          v-if="space.scheduledAt"
          :count="space.subscriberCount"
        />
      </div>
      <p v-if="upcomingLabel" class="text-sm moh-text">
        {{ upcomingLabel }}
      </p>
      <p v-if="space.scheduledAt" class="text-[11px] moh-meta">
        Reminder ~15 minutes before. Others who tap Notify me get day-of and soon alerts.
      </p>
      <div class="flex flex-wrap items-center gap-2">
        <input
          v-model="scheduleLocalInput"
          type="datetime-local"
          class="min-w-0 flex-1 rounded-lg border moh-border-subtle bg-transparent px-3 py-1.5 text-sm moh-text focus:outline-none focus:ring-1 focus:ring-[var(--p-primary-color)]"
        />
        <button
          type="button"
          class="moh-tap moh-focus shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg bg-[var(--p-primary-color)] text-white hover:opacity-90 transition-opacity disabled:opacity-50"
          :disabled="!canSaveSchedule || scheduleBusy"
          @click="saveSchedule"
        >
          {{ space.scheduledAt ? 'Update' : 'Schedule' }}
        </button>
        <button
          v-if="space.scheduledAt"
          type="button"
          class="moh-tap moh-focus shrink-0 text-xs font-medium px-3 py-1.5 rounded-lg border moh-border-subtle moh-meta moh-surface-hover disabled:opacity-50"
          :disabled="scheduleBusy"
          @click="onClearSchedule"
        >
          Clear
        </button>
      </div>
      <button
        v-if="space.scheduledAt && space.owner?.username"
        type="button"
        class="moh-tap moh-focus text-xs font-medium text-[var(--p-primary-color)] hover:underline"
        @click="shareToFeed"
      >
        Share to feed
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Space } from '~/types/api'
import { siteConfig } from '~/config/site'
import { MOH_OPEN_COMPOSER_KEY } from '~/utils/injection-keys'

const props = defineProps<{
  space: Space
}>()

const emit = defineEmits<{
  spaceUpdated: [space: Space]
}>()

const { setMode, activateSpace, deactivateSpace, setSchedule, clearSchedule } = useSpaceOwner()
const presence = usePresence()
const openComposer = inject(MOH_OPEN_COMPOSER_KEY, null)
const toast = useAppToast()

const modes = [
  { value: 'NONE' as const, label: 'None', icon: 'tabler:circle-off' },
  { value: 'WATCH_PARTY' as const, label: 'Watch Party', icon: 'tabler:device-tv' },
  { value: 'RADIO' as const, label: 'Radio', icon: 'tabler:radio' },
]

const radioPresets = [
  { label: 'Drone Zone', url: 'https://ice1.somafm.com/dronezone-128-mp3' },
  { label: 'Groove Salad', url: 'https://ice1.somafm.com/groovesalad-128-mp3' },
  { label: 'Mission Control', url: 'https://ice1.somafm.com/missioncontrol-128-mp3' },
  { label: 'Illinois Street', url: 'https://ice1.somafm.com/illstreet-128-mp3' },
  { label: 'Fluid', url: 'https://ice1.somafm.com/fluid-128-mp3' },
  { label: 'Lush', url: 'https://ice1.somafm.com/lush-128-mp3' },
  { label: 'Ancient Faith', url: 'https://tcast.ancientfaith.com/ancientfaithradio.mp3' },
]

const currentMode = ref(props.space.mode ?? 'NONE')
const watchPartyUrlInput = ref(props.space.watchPartyUrl ?? '')
const radioStreamUrlInput = ref(props.space.radioStreamUrl ?? '')
const scheduleLocalInput = ref('')
const scheduleBusy = ref(false)
const normalizedWatchPartyInput = computed(() => watchPartyUrlInput.value.trim())
const normalizedCurrentWatchPartyUrl = computed(() => (props.space.watchPartyUrl ?? '').trim())
const canApplyWatchParty = computed(() => (
  normalizedWatchPartyInput.value.length > 0
  && (
    props.space.mode !== 'WATCH_PARTY'
    || normalizedWatchPartyInput.value !== normalizedCurrentWatchPartyUrl.value
  )
))

function toDatetimeLocalValue(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const upcomingLabel = computed(() => {
  const iso = props.space.scheduledAt
  if (!iso || props.space.isActive) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime()) || d.getTime() <= Date.now()) return null
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(d)
})

const canSaveSchedule = computed(() => {
  const raw = scheduleLocalInput.value.trim()
  if (!raw) return false
  const d = new Date(raw)
  return !Number.isNaN(d.getTime()) && d.getTime() > Date.now() + 60_000
})

watch(() => props.space, (s) => {
  if (s) {
    currentMode.value = s.mode ?? 'NONE'
    watchPartyUrlInput.value = s.watchPartyUrl ?? ''
    radioStreamUrlInput.value = s.radioStreamUrl ?? ''
    scheduleLocalInput.value = toDatetimeLocalValue(s.scheduledAt)
  }
}, { deep: true, immediate: true })

async function toggleActive() {
  const updated = props.space.isActive
    ? await deactivateSpace(props.space.id)
    : await activateSpace(props.space.id)
  if (updated) emit('spaceUpdated', updated)
}

function onModeSelect(mode: string) {
  currentMode.value = mode as any
  if (mode === 'NONE') {
    void applyMode()
  }
}

async function applyMode() {
  // No-op: in watch-party mode, applying the exact same URL should do nothing.
  if (currentMode.value === 'WATCH_PARTY' && !canApplyWatchParty.value) return
  const updated = await setMode(props.space.id, {
    mode: currentMode.value,
    watchPartyUrl: currentMode.value === 'WATCH_PARTY' ? watchPartyUrlInput.value : null,
    radioStreamUrl: currentMode.value === 'RADIO' ? radioStreamUrlInput.value : null,
  })
  if (updated) {
    emit('spaceUpdated', updated)
    // Broadcast the mode change to all viewers in real time.
    presence.emitSpacesAnnounceMode(props.space.id, {
      mode: updated.mode,
      watchPartyUrl: updated.watchPartyUrl ?? null,
      radioStreamUrl: updated.radioStreamUrl ?? null,
    })
  }
}

async function saveSchedule() {
  if (!canSaveSchedule.value || scheduleBusy.value) return
  scheduleBusy.value = true
  try {
    const d = new Date(scheduleLocalInput.value)
    const updated = await setSchedule(props.space.id, d.toISOString())
    if (updated) {
      emit('spaceUpdated', updated)
      toast.push({ title: 'Space scheduled', tone: 'public', durationMs: 1600 })
    } else {
      toast.push({ title: 'Could not schedule', tone: 'error', durationMs: 2000 })
    }
  } finally {
    scheduleBusy.value = false
  }
}

async function onClearSchedule() {
  if (scheduleBusy.value) return
  scheduleBusy.value = true
  try {
    const updated = await clearSchedule(props.space.id)
    if (updated) {
      emit('spaceUpdated', updated)
      toast.push({ title: 'Schedule cleared', tone: 'public', durationMs: 1400 })
    }
  } finally {
    scheduleBusy.value = false
  }
}

function shareToFeed() {
  const username = props.space.owner?.username
  if (!username || !openComposer) return
  const url = `${siteConfig.url}/s/${encodeURIComponent(username)}`
  const when = upcomingLabel.value
  const text = when
    ? `Join me in my Space — ${when}\n${url}`
    : `Join me in my Space\n${url}`
  openComposer({ initialText: text })
}
</script>
