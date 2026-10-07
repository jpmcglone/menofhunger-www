import type { CashtagResult, FeedPost, Topic, TopicCategory, PostVisibility, CheckinAllowedVisibility } from '~/types/api'
import { getApiErrorMessage } from '~/utils/api-error'
import { pickCheckinPrompt } from '~/utils/checkin-prompts'
import type { useExplorePageDiscover } from './useExplorePage'

/**
 * Daily check-in card, cashtag header, topic and category options, interests, and
 * the followed-topic toggle.
 */
export function useExplorePageCheckin(ctx: ReturnType<typeof useExplorePageDiscover>) {
  const { apiFetch, apiFetchData, isAuthed, authUser, patchUser, isPageAccount, canAccessCheckins, didAttempt, etDayKey, hydrated, searchQueryTrimmed, activeTopic, featuredPosts, trendingArticles, categories, followedTopics, onlineUsers, recommendedUsers, newestUsers, trendingPosts, exploreGroups, trendingHashtags, topUsers, discoverHasLoadedOnce, discoverError, refreshDiscover, discoverInitialLoading } = ctx

  const {
    state: checkinState,
    loading: checkinLoading,
    error: checkinError,
    refresh: refreshCheckin,
    create: createCheckin,
  } = useDailyCheckin()

  const hasCheckedInToday = computed(() => (hydrated.value ? Boolean(checkinState.value?.hasCheckedInToday) : false))

  const checkinAllowedVisibilities = computed<CheckinAllowedVisibility[]>(() => {
    const allowed = checkinState.value?.allowedVisibilities ?? []
    return Array.isArray(allowed) ? allowed : []
  })

  const showExploreCheckinCard = computed(() => {
    if (!isAuthed.value || !canAccessCheckins.value) return false
    if (!checkinState.value) return false
    if (checkinState.value.hasCheckedInToday) return false
    return checkinAllowedVisibilities.value.length > 0
  })

  const shouldRenderCheckinSection = computed(() => {
    if (!isAuthed.value || !canAccessCheckins.value) return false
    if (checkinLoading.value) return true
    if (!checkinState.value) return false
    if (checkinState.value.hasCheckedInToday) return false
    return showExploreCheckinCard.value || Boolean(checkinError.value)
  })

  const checkinPromptText = computed(() => {
    const p = (checkinState.value?.prompt ?? '').trim()
    return p || 'Write a check-in…'
  })

  const displayCheckinPromptText = computed(() => (hydrated.value ? checkinPromptText.value : 'Write a check-in…'))
  const displayCheckinStreak = computed(() => (hydrated.value ? (checkinState.value?.checkinStreakDays ?? 0) : 0))

  // Verify-CTA prompt: unverified users never load /checkins/today, so derive today's
  // question client-side (deterministic, mirrors the API) for the CTA headline.
  const verifyCtaPrompt = computed(() => {
    const p = (checkinState.value?.prompt ?? '').trim()
    if (p) return p
    return hydrated.value ? pickCheckinPrompt().prompt : 'Write a check-in…'
  })

  function onVisibilityChange() {
    if (!import.meta.client || document.hidden) return
    if (!isAuthed.value || !canAccessCheckins.value) return
    void refreshCheckin()
  }

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

  async function createCheckinViaComposer(
    snapshot: { prompt: string; dayKey: string },
    body: string,
    _visibility: PostVisibility,
    _media?: unknown[] | null,
    _poll?: unknown,
  ): Promise<{ id: string } | FeedPost | null> {
    const trimmed = body.trim()
    if (!trimmed) return null
    // Answer always posts verifiedOnly; modal locks that and leaves the session
    // composer preference untouched.
    const res = await createCheckin({ body: trimmed, visibility: 'verifiedOnly', ...snapshot })
    void refreshCheckin()
    return res.post
  }

  const isCheckinQuery = computed(() => /\b(check[\s-]?in|streak|prompt|daily)\b/i.test(searchQueryTrimmed.value))

  // ─── Cashtag header: $SPY · company name ────────────────────────────────────
  const cashtagHeaderSymbol = computed(() => {
    const m = searchQueryTrimmed.value.match(/^\$([A-Za-z]{1,6})$/)
    const sym = m?.[1]
    return sym ? sym.toUpperCase() : null
  })

  const cashtagName = ref<string | null>(null)
  watch(cashtagHeaderSymbol, async (sym) => {
    if (!sym) { cashtagName.value = null; return }
    try {
      const result = await apiFetchData<CashtagResult>(`/cashtags/${encodeURIComponent(sym)}`)
      cashtagName.value = result?.name ?? null
    } catch {
      cashtagName.value = null
    }
  }, { immediate: true })

  const { labelByValue: topicLabelByValue, load: loadTopicOptions } = useTopicOptions()
  void loadTopicOptions().catch(() => {})

  const displayCategories = computed(() => {
    const raw = (categories.value ?? []) as TopicCategory[]
    const mapped = raw
      .map((c) => ({
        value: c.category,
        label: c.label,
        score: c.score ?? 0,
        postCount: c.postCount ?? 0,
      }))
      .filter((c) => Boolean(c.value))
    mapped.sort((a, b) => (b.score ?? 0) - (a.score ?? 0) || (b.postCount ?? 0) - (a.postCount ?? 0) || a.label.localeCompare(b.label))
    return mapped.slice(0, 7)
  })

  const followedTopicsUi = computed(() => {
    const raw = (followedTopics.value ?? []) as Topic[]
    const mapped = raw
      .map((t) => ({
        value: t.topic,
        label: topicLabelByValue.value.get(t.topic) ?? t.topic,
        score: t.score ?? 0,
      }))
      .filter((t) => Boolean(t.value))
    mapped.sort((a, b) => (b.score ?? 0) - (a.score ?? 0) || a.label.localeCompare(b.label))
    return mapped.slice(0, 20)
  })

  const showVerifyCheckinCta = computed(
    () => didAttempt.value && isAuthed.value && !isPageAccount.value && !canAccessCheckins.value,
  )

  const discoverHasContent = computed(() => {
    if (discoverInitialLoading.value) return true
    if (shouldRenderCheckinSection.value) return true
    if (showVerifyCheckinCta.value) return true
    if (followedTopicsUi.value.length > 0) return true
    if (trendingHashtags.value.length > 0) return true
    if (exploreGroups.value.length > 0) return true
    if (displayCategories.value.length > 0) return true
    if (featuredPosts.value.length > 0) return true
    if (trendingArticles.value.length > 0) return true
    if (onlineUsers.value.length > 0) return true
    if (recommendedUsers.value.length > 0) return true
    if (trendingPosts.value.length > 0) return true
    if (newestUsers.value.length > 0) return true
    if (!isAuthed.value && topUsers.value.length > 0) return true
    return false
  })

  const showDiscoverEmpty = computed(
    () => discoverHasLoadedOnce.value && !discoverInitialLoading.value && !discoverError.value && !discoverHasContent.value,
  )

  const editInterestsOpen = ref(false)
  const editInterestsInput = ref<string[]>([])
  const editInterestsSaving = ref(false)
  const editInterestsError = ref<string | null>(null)

  const { content: exploreRailContent, interestsRequest } = useExploreRail()
  watch([followedTopicsUi, displayCategories], () => {
    exploreRailContent.value = {
      topics: followedTopicsUi.value.length ? followedTopicsUi.value : displayCategories.value,
      categories: !followedTopicsUi.value.length,
    }
  }, { immediate: true })
  watch(interestsRequest, () => openEditInterests())

  function openEditInterests() {
    editInterestsInput.value = Array.isArray(authUser.value?.interests) ? [...authUser.value!.interests] : []
    editInterestsError.value = null
    editInterestsOpen.value = true
  }

  function normalizeInterests(vals: string[]): string[] {
    return (vals ?? [])
      .map((s) => String(s ?? '').trim())
      .filter(Boolean)
      .slice(0, 30)
  }

  async function saveEditInterests() {
    if (editInterestsSaving.value) return
    editInterestsSaving.value = true
    editInterestsError.value = null
    try {
      const result = await apiFetch<{ user: import('~/composables/useAuth').AuthUser }>('/users/me/profile', {
        method: 'PATCH',
        body: { interests: normalizeInterests(editInterestsInput.value) },
      })
      patchUser(result.data.user)
      editInterestsOpen.value = false
      await Promise.resolve(refreshDiscover())
    } catch (e: unknown) {
      editInterestsError.value = getApiErrorMessage(e) || 'Failed to save interests.'
    } finally {
      editInterestsSaving.value = false
    }
  }

  const isActiveTopicFollowed = computed(() => {
    const t = activeTopic.value
    if (!t) return false
    return Boolean((followedTopics.value ?? []).some((x) => x.topic === t))
  })

  const followBusy = ref(false)
  async function toggleFollowActiveTopic() {
    const t = activeTopic.value
    if (!t || followBusy.value) return
    followBusy.value = true
    try {
      if (isActiveTopicFollowed.value) {
        await apiFetch(`/topics/${encodeURIComponent(t)}/follow`, { method: 'DELETE' })
      } else {
        await apiFetch(`/topics/${encodeURIComponent(t)}/follow`, { method: 'POST' })
      }
      // Refresh discovery topics + followed list (cheap enough; keeps viewerFollows accurate).
      void refreshDiscover()
    } catch {
      // Soft-fail: ignore (user can retry; explore should not hard error).
    } finally {
      followBusy.value = false
    }
  }

  const TRENDING_INLINE_NEW_USERS_AFTER = 6
  const shouldInlineNewUsers = computed(() => trendingPosts.value.length >= 4)
  const trendingBefore = computed(() => trendingPosts.value.slice(0, TRENDING_INLINE_NEW_USERS_AFTER))
  const trendingAfter = computed(() => trendingPosts.value.slice(TRENDING_INLINE_NEW_USERS_AFTER))

  return {
    checkinState,
    checkinLoading,
    checkinError,
    hasCheckedInToday,
    checkinAllowedVisibilities,
    showExploreCheckinCard,
    shouldRenderCheckinSection,
    displayCheckinPromptText,
    displayCheckinStreak,
    verifyCtaPrompt,
    onVisibilityChange,
    createCheckinViaComposer,
    isCheckinQuery,
    cashtagHeaderSymbol,
    cashtagName,
    topicLabelByValue,
    displayCategories,
    followedTopicsUi,
    showDiscoverEmpty,
    editInterestsOpen,
    editInterestsInput,
    editInterestsSaving,
    editInterestsError,
    openEditInterests,
    saveEditInterests,
    isActiveTopicFollowed,
    followBusy,
    toggleFollowActiveTopic,
    shouldInlineNewUsers,
    trendingBefore,
    trendingAfter,
  }
}
