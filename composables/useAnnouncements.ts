import type { Announcement, AnnouncementDismissMethod } from '~/types/api'
import { needsOnboarding } from '~/utils/onboarding'

const ANON_STORAGE_KEY = 'moh_announcement_viewer'
const VIEWED_AFTER_MS = 1000

export function getAnnouncementAnonymousId(): string | null {
  if (!import.meta.client) return null
  try {
    const existing = localStorage.getItem(ANON_STORAGE_KEY)?.trim()
    if (existing && existing.length >= 12) return existing
    const created = crypto.randomUUID()
    localStorage.setItem(ANON_STORAGE_KEY, created)
    return created
  } catch {
    return null
  }
}

export function useAnnouncements() {
  const { user } = useAuth()
  const { apiFetchData } = useApiClient()
  const current = useState<Announcement | null>('moh.announcements.current', () => null)
  const open = useState('moh.announcements.open', () => false)
  const previewing = useState('moh.announcements.previewing', () => false)
  const fetchedThisLoad = useState('moh.announcements.fetched', () => false)

  let viewedTimer: ReturnType<typeof setTimeout> | null = null
  let completed = false
  let viewed = false

  const locationPromptOpen = computed(() => {
    const u = user.value
    if (!u?.id) return false
    if (needsOnboarding(u)) return false
    return !u.locationZip && !u.locationPromptSkipped
  })

  const blockedByGate = computed(() => {
    if (user.value && needsOnboarding(user.value)) return true
    return locationPromptOpen.value
  })

  function clearTimer() {
    if (viewedTimer) {
      clearTimeout(viewedTimer)
      viewedTimer = null
    }
  }

  async function record(
    type: 'presented' | 'viewed' | 'dismissed' | 'clicked' | 'abandoned',
    dismissMethod?: AnnouncementDismissMethod,
  ) {
    const item = current.value
    if (!item || previewing.value) return
    const anonymousId = getAnnouncementAnonymousId()
    try {
      await apiFetchData(`/announcements/${item.id}/events`, {
        method: 'POST',
        body: {
          type,
          platform: 'web',
          anonymousId,
          dismissMethod: dismissMethod ?? null,
        },
      })
    } catch {
      // Best-effort; next open will retry the same item if this was incomplete.
    }
  }

  async function fetchPending() {
    if (fetchedThisLoad.value || previewing.value || blockedByGate.value) return
    fetchedThisLoad.value = true
    try {
      const data = await apiFetchData<Announcement | null>('/announcements/pending', {
        query: {
          platform: 'web',
          anonymousId: getAnnouncementAnonymousId() ?? undefined,
        },
      })
      if (!data) return
      current.value = data
      previewing.value = false
      completed = false
      viewed = false
      open.value = true
      void record('presented')
      clearTimer()
      viewedTimer = setTimeout(() => {
        if (!completed && !viewed) {
          viewed = true
          void record('viewed')
        }
      }, VIEWED_AFTER_MS)
    } catch {
      fetchedThisLoad.value = false
    }
  }

  function showPreview(announcement: Announcement) {
    clearTimer()
    current.value = announcement
    previewing.value = true
    completed = true
    open.value = true
  }

  function finish() {
    clearTimer()
    open.value = false
    if (!previewing.value) current.value = null
    previewing.value = false
  }

  async function onDismiss(method: AnnouncementDismissMethod) {
    if (!completed && !previewing.value) {
      completed = true
      await record('dismissed', method)
    }
    finish()
  }

  async function onCta() {
    const href = current.value?.ctaHref
    if (!completed && !previewing.value) {
      completed = true
      await record('clicked')
    }
    finish()
    if (!href) return
    if (href.startsWith('/') && !href.startsWith('//')) {
      await navigateTo(href)
      return
    }
    if (import.meta.client) window.location.assign(href)
  }

  async function onAbandoned() {
    if (completed || previewing.value || !current.value || !open.value) return
    await record('abandoned')
  }

  return {
    current,
    open,
    previewing,
    blockedByGate,
    fetchPending,
    showPreview,
    onDismiss,
    onCta,
    onAbandoned,
    finish,
  }
}
