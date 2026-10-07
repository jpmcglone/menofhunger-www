import type { ComputedRef, Ref } from 'vue'
import type { PostVisibility, ScheduledPost } from '~/types/api'
import type { ComposerPollPayload, CreateMediaPayload } from './types'

// Survive SPA navigation (module-scoped) but reset on hard refresh.
// _lastPickedScheduleTime: pre-fills the picker when "Schedule more" reopens it.
// _scheduleMore: remembers whether the user opted into the "schedule more" loop.
let _lastPickedScheduleTime: Date | null = null
const _scheduleMore = ref(false)

export function useComposerSchedule(opts: {
  isPremium: ComputedRef<boolean>
  mode: ComputedRef<'create' | 'edit'>
  editScheduledId: ComputedRef<string | null> | (() => string | null | undefined)
  refreshScheduledCount: () => void
  apiFetchData: <T>(url: string, init: Record<string, unknown>) => Promise<T>
  effectiveGroupId: ComputedRef<string | null>
  crosspostChoice: Ref<{ pickax?: unknown; x?: unknown } | Record<string, unknown>>
}) {
  const scheduledAt = ref<Date | null>(null)
  const scheduledAtDraft = ref<Date | null>(null)
  const schedulePickerOpen = ref(false)
  useOverlayDismiss(schedulePickerOpen, () => (schedulePickerOpen.value = false))

  const scheduleMore = computed({
    get: () => _scheduleMore.value,
    set: (v: boolean) => { _scheduleMore.value = v },
  })

  const scheduledEditId = computed(() => {
    const raw = typeof opts.editScheduledId === 'function' ? opts.editScheduledId() : opts.editScheduledId.value
    return (raw ?? '').trim() || null
  })

  const scheduleMinDate = computed(() => {
    const d = new Date()
    d.setMinutes(d.getMinutes() + 5)
    return d
  })

  const scheduleMaxDate = computed(() => {
    const d = new Date()
    d.setDate(d.getDate() + 60)
    return d
  })

  function formatScheduledAt(d: Date | null): string {
    if (!d) return ''
    return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' })
  }

  const scheduledAtDisplay = computed(() => formatScheduledAt(scheduledAt.value))
  const scheduledAtDraftIsPast = computed(() => Boolean(scheduledAtDraft.value && scheduledAtDraft.value.getTime() <= Date.now()))

  function openSchedulePicker() {
    if (!opts.isPremium.value) {
      useSchedulePremiumModal().show()
      return
    }
    opts.refreshScheduledCount()
    if (scheduledAt.value) {
      scheduledAtDraft.value = new Date(scheduledAt.value)
    } else if (_lastPickedScheduleTime) {
      scheduledAtDraft.value = new Date(_lastPickedScheduleTime)
    } else {
      const d = new Date()
      d.setMinutes(d.getMinutes() + 5, 0, 0)
      scheduledAtDraft.value = d
    }
    schedulePickerOpen.value = true
  }

  function confirmSchedule() {
    if (!scheduledAtDraft.value) return
    scheduledAt.value = scheduledAtDraft.value
    _lastPickedScheduleTime = new Date(scheduledAtDraft.value)
    schedulePickerOpen.value = false
  }

  function clearSchedule() {
    scheduledAt.value = null
    scheduledAtDraft.value = null
    schedulePickerOpen.value = false
  }

  function toScheduledPollBody(payload: ComposerPollPayload) {
    const durationHours = Math.max(1, payload.duration.days * 24 + payload.duration.hours + Math.round(payload.duration.minutes / 60))
    return {
      options: payload.options.map((o) => ({ text: o.text })),
      durationHours,
    }
  }

  async function performSchedule(submitBody: string, vis: PostVisibility, mediaPayload: CreateMediaPayload[], pollPayload: ComposerPollPayload | null) {
    const targetAt = scheduledAt.value
    if (!targetAt) throw new Error('No schedule time set.')
    const groupId = opts.effectiveGroupId.value
    const body = {
      body: submitBody,
      visibility: vis,
      scheduled_at: targetAt.toISOString(),
      crosspost: opts.crosspostChoice.value,
      ...(mediaPayload.length ? { media: mediaPayload } : {}),
      ...(pollPayload ? { poll: toScheduledPollBody(pollPayload) } : {}),
      ...(groupId ? { community_group_id: groupId } : {}),
    }
    return opts.apiFetchData<ScheduledPost>('/posts/scheduled', { method: 'POST', body })
  }

  function rememberPickedSchedule(d: Date) {
    _lastPickedScheduleTime = d
  }

  return {
    scheduledAt,
    scheduledAtDraft,
    schedulePickerOpen,
    scheduleMore,
    scheduledEditId,
    scheduleMinDate,
    scheduleMaxDate,
    formatScheduledAt,
    scheduledAtDisplay,
    scheduledAtDraftIsPast,
    openSchedulePicker,
    confirmSchedule,
    clearSchedule,
    toScheduledPollBody,
    performSchedule,
    rememberPickedSchedule,
  }
}
