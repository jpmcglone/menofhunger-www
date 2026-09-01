<template>
  <div ref="panelEl" class="relative z-20">
    <div
      class="rounded-xl border moh-border p-4 moh-bg"
      :class="expanded ? 'rounded-b-none z-30' : ''"
    >
      <div class="flex items-center justify-between gap-3">
        <button
          type="button"
          class="moh-tap moh-focus inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider moh-meta"
          :aria-expanded="expanded"
          aria-controls="space-owner-controls-body"
          @click="onToggleExpanded"
        >
          <span>Owner Controls</span>
          <Icon
            :name="expanded ? 'tabler:chevron-up' : 'tabler:chevron-down'"
            class="text-[14px] opacity-80"
            aria-hidden="true"
          />
        </button>
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
    </div>

    <div
      v-if="expanded"
      id="space-owner-controls-body"
      class="absolute inset-x-0 top-full z-30 -mt-px space-y-3 rounded-b-xl border-x border-b moh-border px-4 pb-4 moh-bg shadow-lg"
    >
      <div class="space-y-1.5">
        <label for="space-owner-title" class="text-xs font-semibold uppercase tracking-wider moh-meta">Title</label>
        <input
          id="space-owner-title"
          v-model="titleInput"
          type="text"
          maxlength="100"
          placeholder="What's this space about?"
          class="w-full rounded-lg border moh-border-subtle bg-transparent px-3 py-1.5 text-sm moh-text placeholder:moh-meta focus:outline-none focus:ring-1 focus:ring-[var(--p-primary-color)]"
        >
      </div>

      <div class="space-y-1.5">
        <label for="space-owner-type" class="text-xs font-semibold uppercase tracking-wider moh-meta">Type</label>
        <Select
          v-model="draftMode"
          input-id="space-owner-type"
          :options="modes"
          option-label="label"
          option-value="value"
          class="w-full"
        />
      </div>

      <div v-if="draftMode === 'WATCH_PARTY'" class="space-y-1.5">
        <label for="space-owner-watch-url" class="text-xs font-semibold uppercase tracking-wider moh-meta">
          YouTube URL
          <span class="ml-1 font-normal normal-case tracking-normal">(optional)</span>
        </label>
        <input
          id="space-owner-watch-url"
          v-model="watchPartyUrlInput"
          type="url"
          placeholder="https://youtube.com/watch?v=…"
          class="w-full rounded-lg border moh-border-subtle bg-transparent px-3 py-1.5 text-sm moh-text placeholder:moh-meta focus:outline-none focus:ring-1 focus:ring-[var(--p-primary-color)]"
        >
      </div>

      <div v-if="draftMode === 'RADIO'" class="space-y-2">
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
        <label for="space-owner-radio-url" class="sr-only">Stream URL</label>
        <input
          id="space-owner-radio-url"
          v-model="radioStreamUrlInput"
          type="url"
          placeholder="MP3 stream URL"
          class="w-full rounded-lg border moh-border-subtle bg-transparent px-3 py-1.5 text-sm moh-text placeholder:moh-meta focus:outline-none focus:ring-1 focus:ring-[var(--p-primary-color)]"
        >
      </div>

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
        <p v-if="scheduleLocalInput || space.scheduledAt" class="text-[11px] moh-meta">
          First save emails followers the title and time. Another ping ~30 minutes before. Cancel emails them too.
        </p>
        <div class="flex flex-wrap items-center gap-2">
          <input
            v-model="scheduleLocalInput"
            type="datetime-local"
            class="min-w-0 flex-1 rounded-lg border moh-border-subtle bg-transparent px-3 py-1.5 text-sm moh-text focus:outline-none focus:ring-1 focus:ring-[var(--p-primary-color)]"
          >
          <button
            v-if="scheduleLocalInput"
            type="button"
            class="moh-tap moh-focus shrink-0 text-xs font-medium px-3 py-1.5 rounded-lg border moh-border-subtle moh-meta moh-surface-hover"
            @click="scheduleLocalInput = ''"
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

      <div class="flex items-center justify-end gap-2 pt-1">
        <button
          type="button"
          class="moh-tap moh-focus text-xs font-semibold px-3 py-1.5 rounded-lg bg-[var(--p-primary-color)] text-white hover:opacity-90 transition-opacity disabled:opacity-50"
          :disabled="!canSave || saveBusy"
          @click="onSave"
        >
          {{ saveBusy ? 'Saving…' : 'Save' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onClickOutside, onKeyStroke } from '@vueuse/core'
import type { Space } from '~/types/api'
import { siteConfig } from '~/config/site'
import { MOH_OPEN_COMPOSER_KEY } from '~/utils/injection-keys'

type SpaceMode = Space['mode']

const props = defineProps<{
  space: Space
}>()

const emit = defineEmits<{
  spaceUpdated: [space: Space]
}>()

const expanded = ref(false)
const closing = ref(false)
const panelEl = ref<HTMLElement | null>(null)
onClickOutside(panelEl, () => { void requestClose() }, {
  ignore: ['.p-select-overlay', '[data-pc-section="overlay"]'],
})
onKeyStroke('Escape', () => {
  if (!expanded.value) return
  void requestClose()
})

const { updateSpace, setMode, activateSpace, deactivateSpace, setSchedule, clearSchedule } = useSpaceOwner()
const presence = usePresence()
const openComposer = inject(MOH_OPEN_COMPOSER_KEY, null)
const toast = useAppToast()
const { confirm } = useAppConfirm()

const modes = [
  { value: 'NONE' as const, label: 'None' },
  { value: 'WATCH_PARTY' as const, label: 'Watch Party' },
  { value: 'RADIO' as const, label: 'Radio' },
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

const draftMode = ref<SpaceMode>(props.space.mode ?? 'NONE')
const titleInput = ref(props.space.title ?? '')
const watchPartyUrlInput = ref(props.space.watchPartyUrl ?? '')
const radioStreamUrlInput = ref(props.space.radioStreamUrl ?? '')
const scheduleLocalInput = ref('')
const saveBusy = ref(false)

function toDatetimeLocalValue(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function resetDraftFromSpace(s: Space) {
  draftMode.value = s.mode ?? 'NONE'
  titleInput.value = s.title ?? ''
  watchPartyUrlInput.value = s.watchPartyUrl ?? ''
  radioStreamUrlInput.value = s.radioStreamUrl ?? ''
  scheduleLocalInput.value = toDatetimeLocalValue(s.scheduledAt)
}

const normalizedWatchPartyInput = computed(() => watchPartyUrlInput.value.trim())
const normalizedRadioInput = computed(() => radioStreamUrlInput.value.trim())
const normalizedCurrentWatchPartyUrl = computed(() => (props.space.watchPartyUrl ?? '').trim())
const normalizedCurrentRadioUrl = computed(() => (props.space.radioStreamUrl ?? '').trim())

const isModeDirty = computed(() => {
  if (draftMode.value !== (props.space.mode ?? 'NONE')) return true
  if (draftMode.value === 'WATCH_PARTY' && normalizedWatchPartyInput.value !== normalizedCurrentWatchPartyUrl.value) return true
  if (draftMode.value === 'RADIO' && normalizedRadioInput.value !== normalizedCurrentRadioUrl.value) return true
  return false
})

const isScheduleDirty = computed(() => (
  scheduleLocalInput.value !== toDatetimeLocalValue(props.space.scheduledAt)
))

const normalizedTitleInput = computed(() => titleInput.value.trim())
const isTitleDirty = computed(() => normalizedTitleInput.value !== (props.space.title ?? '').trim())

const isDirty = computed(() => isTitleDirty.value || isModeDirty.value || isScheduleDirty.value)

const scheduleError = computed(() => {
  const raw = scheduleLocalInput.value.trim()
  if (!raw) return null
  const d = new Date(raw)
  if (Number.isNaN(d.getTime()) || d.getTime() <= Date.now() + 60_000) {
    return 'Pick a time at least a minute from now.'
  }
  return null
})

const canSave = computed(() => {
  if (!isDirty.value) return false
  if (!normalizedTitleInput.value) return false
  if (draftMode.value === 'RADIO' && !normalizedRadioInput.value) return false
  if (scheduleError.value) return false
  return true
})

const upcomingLabel = computed(() => {
  const raw = scheduleLocalInput.value.trim()
  if (!raw) return null
  const d = new Date(raw)
  if (Number.isNaN(d.getTime()) || d.getTime() <= Date.now()) return null
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(d)
})

watch(() => props.space, (s) => {
  if (!s || isDirty.value) return
  resetDraftFromSpace(s)
}, { deep: true, immediate: true })

function onToggleExpanded() {
  if (expanded.value) {
    void requestClose()
    return
  }
  resetDraftFromSpace(props.space)
  expanded.value = true
}

async function requestClose() {
  if (!expanded.value || closing.value) return
  if (!isDirty.value) {
    expanded.value = false
    return
  }
  closing.value = true
  const result = await confirm({
    header: 'Save changes?',
    message: 'You have unsaved owner control changes.',
    confirmLabel: 'Save',
    confirmSeverity: 'primary',
    cancelLabel: 'Keep editing',
    discardLabel: 'Discard',
  })
  closing.value = false
  if (result === true) {
    const saved = await applyAll()
    if (saved) expanded.value = false
    return
  }
  if (result === 'discard') {
    resetDraftFromSpace(props.space)
    expanded.value = false
  }
}

async function toggleActive() {
  const updated = props.space.isActive
    ? await deactivateSpace(props.space.id)
    : await activateSpace(props.space.id)
  if (updated) emit('spaceUpdated', updated)
}

async function onSave() {
  const saved = await applyAll()
  if (saved) {
    toast.push({ title: 'Saved', tone: 'public', durationMs: 1400 })
    expanded.value = false
  }
}

async function applyAll(): Promise<boolean> {
  if (saveBusy.value) return false
  if (!canSave.value) {
    if (!normalizedTitleInput.value) {
      toast.push({ title: 'Add a title', tone: 'error', durationMs: 1800 })
    } else if (draftMode.value === 'RADIO' && !normalizedRadioInput.value) {
      toast.push({ title: 'Add a stream URL', tone: 'error', durationMs: 1800 })
    } else if (scheduleError.value) {
      toast.push({ title: scheduleError.value, tone: 'error', durationMs: 1800 })
    }
    return false
  }
  saveBusy.value = true
  try {
    let latest = props.space
    if (isTitleDirty.value) {
      const updated = await updateSpace(props.space.id, { title: normalizedTitleInput.value })
      if (!updated) {
        toast.push({ title: 'Could not save title', tone: 'error', durationMs: 2000 })
        return false
      }
      latest = updated
      emit('spaceUpdated', updated)
    }
    if (isModeDirty.value) {
      const updated = await setMode(props.space.id, {
        mode: draftMode.value,
        watchPartyUrl: draftMode.value === 'WATCH_PARTY' ? (normalizedWatchPartyInput.value || null) : null,
        radioStreamUrl: draftMode.value === 'RADIO' ? radioStreamUrlInput.value : null,
      })
      if (!updated) {
        toast.push({ title: 'Could not save type', tone: 'error', durationMs: 2000 })
        return false
      }
      latest = updated
      emit('spaceUpdated', updated)
      presence.emitSpacesAnnounceMode(props.space.id, {
        mode: updated.mode,
        watchPartyUrl: updated.watchPartyUrl ?? null,
        radioStreamUrl: updated.radioStreamUrl ?? null,
      })
    }
    if (isScheduleDirty.value) {
      const raw = scheduleLocalInput.value.trim()
      const updated = raw
        ? await setSchedule(props.space.id, new Date(raw).toISOString())
        : await clearSchedule(props.space.id)
      if (!updated) {
        toast.push({ title: raw ? 'Could not schedule' : 'Could not clear schedule', tone: 'error', durationMs: 2000 })
        return false
      }
      latest = updated
      emit('spaceUpdated', updated)
    }
    resetDraftFromSpace(latest)
    return true
  } finally {
    saveBusy.value = false
  }
}

function shareToFeed() {
  const username = props.space.owner?.username
  if (!username || !openComposer) return
  const url = `${siteConfig.url}/s/${encodeURIComponent(username)}`
  const iso = props.space.scheduledAt
  const d = iso ? new Date(iso) : null
  const when = d && !Number.isNaN(d.getTime()) && d.getTime() > Date.now()
    ? new Intl.DateTimeFormat(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      }).format(d)
    : null
  const eventName = /^.+'s space$/i.test((props.space.title ?? '').trim())
    ? 'my Space'
    : props.space.title.trim()
  const text = when
    ? `Join me for ${eventName} — ${when}\n${url}`
    : `Join me for ${eventName}\n${url}`
  openComposer({ initialText: text })
}
</script>
