import type { Ref } from 'vue'
import type { ComposerOpenOptions } from '~/utils/injection-keys'
import type { CheckinAllowedVisibility, PostVisibility } from '~/types/api'
import { pickCheckinPrompt } from '~/utils/checkin-prompts'
import type { useHomeFeed } from '~/composables/useHomeFeed'

/**
 * Daily check-in state for the home page: hero/prompt-bar visibility, today's answer echo,
 * and the composer hand-off. `hydrated` gates client-only text so SSR matches first render.
 */
export function useHomeCheckin(deps: {
  hydrated: Ref<boolean>
  openComposer: ((options?: ComposerOpenOptions) => void) | null
  feed: Pick<ReturnType<typeof useHomeFeed>, 'posts' | 'feedCtaKind' | 'viewerIsVerified'>
}) {
  const { hydrated, openComposer } = deps
  const { posts, feedCtaKind, viewerIsVerified } = deps.feed
  const { isAuthed, isPageAccount, canAccessCheckins } = useAuth()

  const { dayKey: etDayKey } = useEasternMidnightRollover()

  const { state: checkinState, loading: checkinLoading, refresh: refreshCheckin, create: createCheckin } = useDailyCheckin()
  const { isOpen: checkinWindowOpen } = useCheckinWindow()

  const checkinAllowedVisibilities = computed<CheckinAllowedVisibility[]>(() => {
    const allowed = checkinState.value?.allowedVisibilities ?? []
    return Array.isArray(allowed) ? allowed : []
  })

  const fallbackCheckinAllowedVisibilities = computed<CheckinAllowedVisibility[]>(() => {
    // Product rule: ONLY verified (and above) can check in. Answer always posts as
    // verifiedOnly (locked in the modal); premiumOnly is not offered for check-ins.
    if (!viewerIsVerified.value) return []
    return ['verifiedOnly']
  })

  const effectiveCheckinAllowedVisibilities = computed<CheckinAllowedVisibility[]>(() => {
    const fromApi = checkinAllowedVisibilities.value.filter((v) => v === 'verifiedOnly')
    return fromApi.length ? fromApi : fallbackCheckinAllowedVisibilities.value
  })

  // True only when the user has completed today's check-in.
  // This intentionally ignores "any post today" so the check-in prompt remains visible
  // until a real check-in is submitted.
  const hasCheckedInToday = computed(() => {
    if (!hydrated.value) return false
    return Boolean(checkinState.value?.hasCheckedInToday)
  })

  // Gates whether either daily-check-in row (unanswered or answered) is allowed to render.
  // Goal: avoid a SSR/CSR flash where the unanswered row shows for a moment, then
  // collapses into the quiet line once the auth + check-in state finally resolves.
  //
  // Truthy when:
  //   - SSR has finished and the client has mounted (hydrated), AND
  //   - Either the user is unauthenticated (full hero is the obvious answer), OR
  //     the check-in state has loaded (success), OR
  //     the initial fetch has settled (even on error) — so the page is never
  //     left blank when the API is slow or fails. In the error case we show the
  //     unanswered row in a degraded "no crew / no streak" mode; that's always better
  //     than showing nothing.
  //
  // While false (still fetching), both <AppFeedDailyCheckinHero> instances are
  // v-if'd off so SSR produces nothing and there is no wrong-variant flash.
  const heroResolved = computed(() => {
    if (!hydrated.value) return false
    if (isPageAccount.value) return false
    if (!isAuthed.value) return true
    // Stay hidden while the initial fetch is in-flight to avoid flashing the wrong variant.
    if (checkinLoading.value) return false
    return checkinState.value !== null
  })

  // Show the check-in prompt when user is eligible and hasn't posted today.
  const showCheckinPromptBar = computed(() => {
    if (!isAuthed.value || isPageAccount.value || !canAccessCheckins.value) return false
    if (feedCtaKind.value || !checkinWindowOpen.value) return false
    if (!checkinState.value) return false
    if (checkinState.value.hasCheckedInToday) return false
    if (!effectiveCheckinAllowedVisibilities.value.length) return false
    return true
  })

  const checkinPromptText = computed(() => {
    const p = (checkinState.value?.prompt ?? '').trim()
    if (p) return p
    // API unavailable — derive today's question deterministically client-side
    // so the hero always shows the real prompt rather than generic placeholder text.
    return pickCheckinPrompt().prompt
  })

  // Use fallback text until after hydration so server and client match (checkinState can differ on SSR vs client).
  const displayCheckinPromptText = computed(() => (hydrated.value ? checkinPromptText.value : 'Write a check-in…'))
  const displayCheckinStreak = computed(() => (hydrated.value ? (checkinState.value?.checkinStreakDays ?? 0) : 0))

  watch(
    [isAuthed, canAccessCheckins, etDayKey],
    ([authed, canAccess]) => {
      // Unverified users never hit /checkins/today (it 403s); they see the
      // verify-CTA hero instead.
      if (!authed || !canAccess) {
        checkinState.value = null
        return
      }
      void refreshCheckin()
    },
    { immediate: true },
  )

  // When the ET day rolls over, refresh check-in state so the hero shows today's prompt.
  watch(etDayKey, () => {
    if (canAccessCheckins.value) void refreshCheckin()
  })

  /**
   * Last submitted check-in body for the hero's "you answered today" echo. Cleared on
   * day rollover so it doesn't bleed into tomorrow's prompt state.
   */
  const lastCheckinBody = ref<string | null>(null)
  watch(etDayKey, () => { lastCheckinBody.value = null })

  async function createCheckinViaComposer(
    snapshot: { prompt: string; dayKey: string },
    body: string,
    _visibility: PostVisibility,
    _media?: unknown[] | null,
    _poll?: unknown,
  ): Promise<{ id: string } | import('~/types/api').FeedPost | null> {
    const trimmed = body.trim()
    if (!trimmed) return null
    // Answer always posts verifiedOnly; modal locks that and leaves the session
    // composer preference untouched.
    const res = await createCheckin({ body: trimmed, visibility: 'verifiedOnly', ...snapshot })
    lastCheckinBody.value = trimmed
    posts.value = [res.post, ...posts.value.filter((p) => p.id !== res.post.id)]
    return res.post
  }

  /** Eligibility gate for the hero's primary action — verified users only (or premium). */
  const canAnswerCheckin = computed(() => checkinWindowOpen.value && effectiveCheckinAllowedVisibilities.value.length > 0)

  /** Hero prompt — falls back to a generic phrasing during SSR / initial load. */
  const checkinHeroPrompt = computed(() => displayCheckinPromptText.value)

  function goToLoginForCheckin() {
    void navigateTo('/login')
  }

  function openCheckinComposer() {
    const current = checkinState.value
    if (!current?.prompt) return
    const snapshot = { prompt: current.prompt, dayKey: current.dayKey }
    if (!checkinWindowOpen.value) return
    if (!canAccessCheckins.value) return
    if (!openComposer) return
    if (!effectiveCheckinAllowedVisibilities.value.length) return
    openComposer({
      checkinPrompt: snapshot.prompt,
      allowedVisibilities: ['verifiedOnly'],
      disableMedia: true,
      createPost: (body, visibility) => createCheckinViaComposer(snapshot, body, visibility),
    })
  }

  return {
    checkinState,
    hasCheckedInToday,
    heroResolved,
    showCheckinPromptBar,
    displayCheckinPromptText,
    displayCheckinStreak,
    lastCheckinBody,
    canAnswerCheckin,
    checkinHeroPrompt,
    goToLoginForCheckin,
    openCheckinComposer,
  }
}
