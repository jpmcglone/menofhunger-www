import type { ComputedRef, Ref } from 'vue'
import { makeLocalId, type ComposerPollPayload, type PostComposerProps } from './types'
import type { useComposerDestination } from './useComposerDestination'
import type { useComposerSchedule } from './useComposerSchedule'

/** One-shot seeding of composer state from initial props (text, media, files, group, poll, visibility, schedule). */
export function useComposerInitialSeed(
  props: PostComposerProps,
  deps: {
    draft: Ref<string>
    poll: Ref<ComposerPollPayload | null>
    disableMedia: ComputedRef<boolean>
    media: ReturnType<typeof useComposerMedia>
    dest: ReturnType<typeof useComposerDestination>
    schedule: ReturnType<typeof useComposerSchedule>
  },
) {
  const { draft, poll, disableMedia, media, dest, schedule } = deps
  const initialTextApplied = ref(false)
  const initialFilesApplied = ref(false)
  const initialGroupApplied = ref(false)
  const initialPollApplied = ref(false)
  const initialVisibilityApplied = ref(false)
  const initialScheduledAtApplied = ref(false)

  function seedInitialFilesIfNeeded() {
    if (initialFilesApplied.value || disableMedia.value) return
    const files = Array.isArray(props.initialFiles) ? props.initialFiles.filter(Boolean) : []
    initialFilesApplied.value = true
    if (!files.length) return
    media.ingestMediaFiles(files, 'picker')
  }

  function seedInitialGroupIfNeeded() {
    if (initialGroupApplied.value) return
    initialGroupApplied.value = true
    const id = (props.initialGroupId ?? '').trim()
    if (!id || props.communityGroupId) return
    dest.selectedGroupId.value = id
    dest.rememberGroup(id)
  }

  function seedInitialMediaIfNeeded() {
    if (disableMedia.value) return
    const items = Array.isArray(props.initialMedia) ? props.initialMedia : null
    if (!items || items.length === 0) return
    if ((media.composerMedia.value?.length ?? 0) > 0) return
    const seeded = items
      .filter((m) => m && !m.deletedAt)
      .slice(0, 4)
      .map((m) => {
        const isVideo = m.kind === 'video'
        const previewUrl = isVideo ? (m.thumbnailUrl || m.url) : m.url
        return {
          localId: makeLocalId(),
          source: m.source,
          kind: m.kind,
          previewUrl,
          url: m.source === 'giphy' ? m.url : undefined,
          mp4Url: m.mp4Url ?? undefined,
          width: m.width ?? null,
          height: m.height ?? null,
          durationSeconds: (m as { durationSeconds?: number | null }).durationSeconds ?? null,
          altText: m.alt ?? null,
          existingId: m.id,
          uploadStatus: 'done' as const,
        }
      })
    media.composerMedia.value = seeded as typeof media.composerMedia.value
  }

  function applyInitialTextIfNeeded() {
    if (initialTextApplied.value) return
    const t = (props.initialText ?? '').toString()
    if (!t.trim()) {
      initialTextApplied.value = true
      return
    }
    if (!draft.value) draft.value = t
    initialTextApplied.value = true
  }

  function seedInitialPollIfNeeded() {
    if (initialPollApplied.value) return
    const src = props.initialPoll
    if (!src || !src.options?.length) {
      initialPollApplied.value = true
      return
    }
    if (poll.value) {
      initialPollApplied.value = true
      return
    }
    const h = src.durationHours ?? 24
    poll.value = {
      options: src.options.map((o) => ({ text: o.text, image: null })),
      duration: { days: Math.floor(h / 24), hours: h % 24, minutes: 0 },
    }
    initialPollApplied.value = true
  }

  function seedInitialVisibilityIfNeeded() {
    if (initialVisibilityApplied.value) return
    const v = props.initialVisibility
    if (!v) {
      initialVisibilityApplied.value = true
      return
    }
    if (!props.lockedVisibility) dest.visibility.value = v
    initialVisibilityApplied.value = true
  }

  function seedInitialScheduledAtIfNeeded() {
    if (initialScheduledAtApplied.value) return
    const s = props.initialScheduledAt
    if (!s) {
      initialScheduledAtApplied.value = true
      return
    }
    const d = new Date(s)
    if (isNaN(d.getTime())) {
      initialScheduledAtApplied.value = true
      return
    }
    schedule.scheduledAt.value = d
    schedule.rememberPickedSchedule(d)
    initialScheduledAtApplied.value = true
  }

  function seedAll() {
    applyInitialTextIfNeeded()
    seedInitialMediaIfNeeded()
    seedInitialFilesIfNeeded()
    seedInitialGroupIfNeeded()
    seedInitialPollIfNeeded()
    seedInitialVisibilityIfNeeded()
    seedInitialScheduledAtIfNeeded()
  }

  return { applyInitialTextIfNeeded, seedInitialMediaIfNeeded, seedAll }
}
