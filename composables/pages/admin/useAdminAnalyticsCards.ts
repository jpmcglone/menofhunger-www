import type { useAdminAnalyticsState, useAdminAnalyticsActions } from './useAdminAnalyticsPage'

/**
 * Derived KPI cards, breakdown rows, color scales, and percentages for each section.
 */
export function useAdminAnalyticsCards(ctx: ReturnType<typeof useAdminAnalyticsState> & ReturnType<typeof useAdminAnalyticsActions>) {
  const { data, rangeLabel, load } = ctx

  // ─── Computed ─────────────────────────────────────────────────────────────────

  const coinKpiCards = computed(() => {
    if (!data.value) return []
    const c = data.value.coins
    const r = rangeLabel.value
    return [
      { label: 'Total in Economy', value: c.totalInEconomy.toLocaleString(), sub: 'all users, all time', color: 'text-amber-600 dark:text-amber-400' },
      { label: 'Minted from Streaks', value: c.mintedInRange.toLocaleString(), sub: r },
      { label: 'Sent Peer-to-Peer', value: c.transferredInRange.toLocaleString(), sub: r },
      { label: 'Unique Earners', value: c.uniqueEarnersInRange.toLocaleString(), sub: `earned in ${r}` },
    ]
  })

  const MULTIPLIER_META: Array<{ amount: number; label: string; desc: string; dot: string; bar: string }> = [
    { amount: 1, label: '1x', desc: 'days 1–7',   dot: 'bg-gray-400',   bar: 'bg-gray-400' },
    { amount: 2, label: '2x', desc: 'days 8–14',  dot: 'bg-amber-400',  bar: 'bg-amber-400' },
    { amount: 3, label: '3x', desc: 'days 15–21', dot: 'bg-orange-500', bar: 'bg-orange-500' },
    { amount: 4, label: '4x', desc: 'days 22+',   dot: 'bg-red-500',    bar: 'bg-red-500' },
  ]

  const coinMultiplierTotal = computed(() => {
    if (!data.value) return 0
    return Object.values(data.value.coins.mintedByMultiplier).reduce((a, b) => a + b, 0)
  })

  const velocityColor = computed(() => {
    const v = data.value?.coins.velocityRatio
    if (v == null) return 'text-gray-400 dark:text-gray-500'
    if (v < 0.1) return 'text-gray-400 dark:text-gray-500'
    if (v < 0.4) return 'text-blue-600 dark:text-blue-400'
    if (v < 0.8) return 'text-green-600 dark:text-green-400'
    return 'text-orange-500 dark:text-orange-400'
  })

  const giniColor = computed(() => {
    const g = data.value?.coins.giniCoefficient
    if (g == null) return 'text-gray-400 dark:text-gray-500'
    if (g < 0.35) return 'text-green-600 dark:text-green-400'
    if (g < 0.55) return 'text-amber-600 dark:text-amber-400'
    return 'text-red-600 dark:text-red-400'
  })

  const coinMultiplierRows = computed(() => {
    if (!data.value) return []
    const total = coinMultiplierTotal.value
    const byMult = data.value.coins.mintedByMultiplier
    return MULTIPLIER_META.map((m) => {
      const count = byMult[String(m.amount)] ?? 0
      return { ...m, count, pct: total > 0 ? Math.round((count / total) * 100) : 0 }
    })
  })

  const ARTICLE_VISIBILITY_META: Record<string, { label: string; description: string; dot: string; bar: string }> = {
    public:       { label: 'Public',       description: 'visible to everyone',    dot: 'bg-blue-500',   bar: 'bg-blue-500' },
    verifiedOnly: { label: 'Verified Only', description: 'verified members only',  dot: 'bg-violet-500', bar: 'bg-violet-500' },
    premiumOnly:  { label: 'Premium Only',  description: 'premium members only',   dot: 'bg-amber-500',  bar: 'bg-amber-500' },
  }
  const ARTICLE_VISIBILITY_ORDER = ['public', 'verifiedOnly', 'premiumOnly']

  const articleVisibilityRows = computed(() => {
    if (!data.value) return []
    const byVis = data.value.articles.byVisibility
    const total = Object.values(byVis).reduce((a, b) => a + b, 0)
    return ARTICLE_VISIBILITY_ORDER.map((key) => {
      const count = byVis[key] ?? 0
      const meta = ARTICLE_VISIBILITY_META[key] ?? { label: key, description: '', dot: 'bg-gray-400', bar: 'bg-gray-400' }
      return { key, ...meta, count, pct: total > 0 ? Math.round((count / total) * 100) : 0 }
    })
  })

  const articleKpiCards = computed(() => {
    if (!data.value) return []
    const k = data.value.articles.kpis
    const r = rangeLabel.value
    return [
      { label: 'Published', value: k.totalPublished.toLocaleString(), sub: r },
      { label: 'Authors', value: k.uniqueAuthors.toLocaleString(), sub: `published in ${r}` },
      { label: 'People', value: (k.uniqueViewsInRange ?? k.totalViewsInRange).toLocaleString(), sub: `first-time viewers · ${r}` },
      { label: 'Views', value: Math.max(k.uniqueViewsInRange ?? 0, k.totalViewsInRange).toLocaleString(), sub: `total · ${r}` },
      { label: 'Boosts', value: k.totalBoostsInRange.toLocaleString(), sub: r },
      { label: 'Reactions', value: k.totalReactionsInRange.toLocaleString(), sub: r },
      { label: 'Replies', value: k.totalCommentsInRange.toLocaleString(), sub: r },
    ]
  })

  const boardKpiCards = computed(() => {
    if (!data.value) return []
    const b = data.value.board
    const r = rangeLabel.value
    return [
      { label: 'Posts', value: b.threadsInRange.toLocaleString(), sub: `${b.totalThreads.toLocaleString()} all time` },
      { label: 'Comments', value: b.commentsInRange.toLocaleString(), sub: `${b.totalComments.toLocaleString()} all time` },
      { label: 'People', value: b.participantsInRange.toLocaleString(), sub: `started or commented · ${r}` },
      { label: 'Boosts', value: b.boostsInRange.toLocaleString(), sub: r },
      {
        label: 'Answered in 24h',
        value: b.pctThreadsWithCommentWithin24h == null ? '—' : `${b.pctThreadsWithCommentWithin24h}%`,
        sub: `threads started in ${r}`,
      },
    ]
  })

  function visibilityBadgeClass(visibility: string): string {
    if (visibility === 'verifiedOnly') return 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300'
    if (visibility === 'premiumOnly')  return 'bg-amber-100  text-amber-700  dark:bg-amber-900/40  dark:text-amber-300'
    return 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
  }

  function visibilityLabel(v: string) {
    if (v === 'verifiedOnly') return 'Verified'
    if (v === 'premiumOnly')  return 'Premium'
    return 'Public'
  }

  function articleAge(iso: string) {
    const d = new Date(iso)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })
  }

  const groupKpiCards = computed(() => {
    if (!data.value?.groups) return []
    const g = data.value.groups
    return [
      {
        label: 'Users in ≥1 group',
        value: g.usersInAnyGroup.toLocaleString(),
        sub: g.pctUsersInAnyGroup != null ? `${g.pctUsersInAnyGroup}% of all users` : undefined,
      },
      { label: 'Active groups', value: g.activeGroups.toLocaleString(), sub: 'not deleted' },
      {
        label: 'New memberships',
        value: g.newActiveMembershipsInRange.toLocaleString(),
        sub: 'active joins in range',
      },
      { label: 'Pending approvals', value: g.pendingApprovals.toLocaleString(), sub: 'current backlog' },
      { label: 'Group root posts', value: g.groupRootPostsInRange.toLocaleString(), sub: 'in range' },
      { label: 'Group replies', value: g.groupRepliesInRange.toLocaleString(), sub: 'in range' },
      {
        label: 'Roots w/ reply in 24h',
        value: g.pctGroupRootsWithReplyWithin24h !== null ? `${g.pctGroupRootsWithReplyWithin24h}%` : '—',
        sub: 'of roots in range',
      },
    ]
  })

  const channelKpiCards = computed(() => {
    const c = data.value?.channels
    if (!c) return []
    return [
      { label: 'Messages', value: c.messagesInRange.toLocaleString(), sub: `${c.threadRepliesInRange.toLocaleString()} thread replies` },
      { label: 'People talking', value: c.sendersInRange.toLocaleString(), sub: `${c.readersInRange.toLocaleString()} people reading` },
      { label: 'Active channels', value: c.channelsWithActivityInRange.toLocaleString(), sub: `of ${c.activeChannels.toLocaleString()} (${c.privateChannels.toLocaleString()} private)` },
      { label: 'Groups with channels', value: c.groupsWithChannels.toLocaleString() },
      { label: 'Mentions', value: c.mentionsInRange.toLocaleString(), sub: 'in range' },
      { label: 'Uploads', value: c.uploadsInRange.toLocaleString(), sub: `${c.marvRepliesInRange.toLocaleString()} @marv replies` },
    ]
  })

  const spaceKpiCards = computed(() => {
    if (!data.value?.spaces) return []
    const s = data.value.spaces
    return [
      { label: 'Live now', value: s.activeSpaces.toLocaleString(), sub: 'currently on' },
      { label: 'Went live', value: s.wentLiveInRange.toLocaleString(), sub: rangeLabel.value },
      { label: 'Scheduled', value: s.scheduledSpaces.toLocaleString(), sub: 'upcoming' },
      {
        label: 'Notify me',
        value: s.notifyMeSubscribersInRange.toLocaleString(),
        sub: `${s.notifyMeSubscribers.toLocaleString()} all time`,
      },
      { label: 'Spaces', value: s.totalSpaces.toLocaleString(), sub: 'all time' },
      { label: 'Created', value: s.spacesCreatedInRange.toLocaleString(), sub: rangeLabel.value },
    ]
  })

  const aiKpiCards = computed(() => {
    if (!data.value?.ai) return []
    const ai = data.value.ai
    const r = rangeLabel.value
    return [
      { label: 'Total Interactions', value: ai.totalInteractionsInRange.toLocaleString(), sub: r },
      { label: 'Successful', value: ai.successfulInteractionsInRange.toLocaleString(), sub: 'AI responses delivered' },
      { label: 'Unique Users', value: ai.uniqueUsersInRange.toLocaleString(), sub: `used M.A.R.V. in ${r}` },
      { label: 'Credits Spent', value: Math.round(ai.creditsSpentInRange).toLocaleString(), sub: r },
      {
        label: 'Est. Cost (USD)',
        value: ai.estimatedCostUsdInRange != null ? `$${ai.estimatedCostUsdInRange.toFixed(4)}` : '—',
        sub: r,
      },
      {
        label: 'Avg Latency',
        value: ai.avgLatencyMsInRange != null ? `${ai.avgLatencyMsInRange.toLocaleString()} ms` : '—',
        sub: 'successful replies',
      },
    ]
  })

  const AI_SOURCE_META: Record<string, { label: string; dot: string; bar: string }> = {
    public_thread:   { label: 'Public Thread',  dot: 'bg-blue-500',   bar: 'bg-blue-500' },
    private_session: { label: 'Private DM',     dot: 'bg-violet-500', bar: 'bg-violet-500' },
    catch_up:        { label: 'Catch Me Up',    dot: 'bg-emerald-500', bar: 'bg-emerald-500' },
  }

  const aiSourceRows = computed(() => {
    if (!data.value?.ai) return []
    const bySource = data.value.ai.bySource
    const total = Object.values(bySource).reduce((a, b) => a + b, 0)
    return Object.entries(bySource).map(([key, count]) => {
      const meta = AI_SOURCE_META[key] ?? { label: key, dot: 'bg-gray-400', bar: 'bg-gray-400' }
      return { key, ...meta, count, pct: total > 0 ? Math.round((count / total) * 100) : 0 }
    }).sort((a, b) => b.count - a.count)
  })

  const AI_MODE_META: Record<string, { label: string; dot: string; bar: string }> = {
    fast:    { label: 'Standard', dot: 'bg-green-500',  bar: 'bg-green-500' },
    regular: { label: 'Search',   dot: 'bg-blue-500',   bar: 'bg-blue-500' },
    smart:   { label: 'Deep',     dot: 'bg-violet-500', bar: 'bg-violet-500' },
    auto:    { label: 'Auto',     dot: 'bg-gray-400',   bar: 'bg-gray-400' },
  }

  const aiModeRows = computed(() => {
    if (!data.value?.ai) return []
    const byMode = data.value.ai.byEffectiveMode
    const total = Object.values(byMode).reduce((a, b) => a + b, 0)
    return Object.entries(byMode).map(([key, count]) => {
      const meta = AI_MODE_META[key] ?? { label: key, dot: 'bg-gray-400', bar: 'bg-gray-400' }
      return { key, ...meta, count, pct: total > 0 ? Math.round((count / total) * 100) : 0 }
    }).sort((a, b) => b.count - a.count)
  })

  const AI_OUTCOME_META: Record<string, { label: string; dot: string }> = {
    success:       { label: 'Success',          dot: 'bg-green-500' },
    not_premium:   { label: 'Not Premium',       dot: 'bg-gray-400' },
    no_credits:    { label: 'No Credits',        dot: 'bg-amber-500' },
    rate_limited:  { label: 'Rate Limited',      dot: 'bg-orange-500' },
    ai_error:      { label: 'AI Error',          dot: 'bg-red-500' },
    not_configured:{ label: 'Not Configured',    dot: 'bg-red-400' },
    banned:        { label: 'Banned User',        dot: 'bg-zinc-500' },
    deduped:       { label: 'Deduped',           dot: 'bg-zinc-400' },
  }

  const aiOutcomeRows = computed(() => {
    if (!data.value?.ai) return []
    const byOutcome = data.value.ai.byOutcome
    const total = Object.values(byOutcome).reduce((a, b) => a + b, 0)
    return Object.entries(byOutcome).map(([key, count]) => {
      const meta = AI_OUTCOME_META[key] ?? { label: key, dot: 'bg-gray-400' }
      return { key, ...meta, count, pct: total > 0 ? Math.round((count / total) * 100) : 0 }
    }).sort((a, b) => b.count - a.count)
  })

  const summaryCards = computed(() => {
    if (!data.value) return []
    const { summary } = data.value
    const dauMauPct = summary.mau > 0 ? Math.round((summary.dau / summary.mau) * 100) : 0
    const verifiedPct = summary.totalUsers > 0
      ? Math.round((summary.verifiedUsers / summary.totalUsers) * 100)
      : 0
    const paying = data.value.monetization.payingPremium + data.value.monetization.payingPremiumPlus
    return [
      { label: 'Users', value: summary.totalUsers.toLocaleString(), sub: undefined },
      { label: 'Verified', value: summary.verifiedUsers.toLocaleString(), sub: `${verifiedPct}% of users` },
      { label: 'DAU', value: summary.dau.toLocaleString(), sub: `${rangeLabel.value} avg` },
      { label: 'MAU', value: summary.mau.toLocaleString(), sub: '30-day window' },
      { label: 'DAU/MAU', value: dauMauPct + '%', sub: 'Stickiness' },
      { label: 'Premium', value: summary.premiumUsers.toLocaleString(), sub: `incl. ${summary.premiumPlusUsers} Premium+` },
      { label: 'Paying', value: paying.toLocaleString(), sub: 'Stripe, all time' },
    ]
  })

  const VISIBILITY_META: Record<string, { label: string; description: string; dot: string; bar: string }> = {
    public:       { label: 'Public',       description: 'visible to everyone',    dot: 'bg-blue-500',   bar: 'bg-blue-500' },
    verifiedOnly: { label: 'Verified Only', description: 'verified members only',  dot: 'bg-violet-500', bar: 'bg-violet-500' },
    premiumOnly:  { label: 'Premium Only',  description: 'premium members only',   dot: 'bg-amber-500',  bar: 'bg-amber-500' },
    onlyMe:       { label: 'Only Me',       description: 'private / journal',      dot: 'bg-gray-400',   bar: 'bg-gray-400' },
  }

  const VISIBILITY_ORDER = ['public', 'verifiedOnly', 'premiumOnly', 'onlyMe']

  const totalPostsByVisibility = computed(() => {
    if (!data.value) return 0
    return Object.values(data.value.postsByVisibility).reduce((a, b) => a + b, 0)
  })

  const visibilityRows = computed(() => {
    if (!data.value) return []
    const total = totalPostsByVisibility.value
    return VISIBILITY_ORDER.map((key) => {
      const count = data.value!.postsByVisibility[key] ?? 0
      const meta = VISIBILITY_META[key] ?? { label: key, description: '', dot: 'bg-gray-400', bar: 'bg-gray-400' }
      return {
        key,
        ...meta,
        count,
        pct: total > 0 ? Math.round((count / total) * 100) : 0,
      }
    }).filter((r) => r.count > 0 || VISIBILITY_ORDER.includes(r.key))
  })

  const retentionRows = computed(() => {
    if (!data.value) return []
    const now = new Date()
    return data.value.retention.map((r) => ({
      ...r,
      isW1Eligible: cohortWeeksElapsed(r.cohortWeek, now) >= 1,
      isW4Eligible: cohortWeeksElapsed(r.cohortWeek, now) >= 4,
      w1Pct: r.size > 0 ? Math.round((r.w1 / r.size) * 100) : 0,
      w4Pct: r.size > 0 ? Math.round((r.w4 / r.size) * 100) : 0,
    }))
  })

  function cohortWeeksElapsed(cohortWeek: string, nowDate = new Date()): number {
    const cohortTime = Date.parse(`${cohortWeek}T00:00:00Z`)
    if (Number.isNaN(cohortTime)) return Number.POSITIVE_INFINITY
    const elapsedMs = nowDate.getTime() - cohortTime
    return Math.floor(elapsedMs / (7 * 24 * 60 * 60 * 1000))
  }

  function retentionColor(pct: number): string {
    if (pct >= 40) return 'text-green-600 dark:text-green-400 font-semibold'
    if (pct >= 20) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-red-500 dark:text-red-400'
  }

  /** Returns a color class based on low/high thresholds for a metric */
  function engagementColor(pct: number, low: number, high: number): string {
    if (pct >= high) return 'text-green-600 dark:text-green-400'
    if (pct >= low)  return 'text-yellow-600 dark:text-yellow-400'
    return 'text-red-500 dark:text-red-400'
  }

  /** Higher share = more concentrated = worse (inverted vs engagementColor). */
  function concentrationColor(pct: number, warnAt: number, badAt: number): string {
    if (pct >= badAt) return 'text-red-500 dark:text-red-400'
    if (pct >= warnAt) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-green-600 dark:text-green-400'
  }

  const landingContributorPct = computed(() => {
    const men = data.value?.landing?.men
    if (!men || men.total <= 0) return 0
    return Math.round((men.contributors / men.total) * 100)
  })

  const totalPaying = computed(() => {
    if (!data.value) return 0
    return data.value.monetization.payingPremium + data.value.monetization.payingPremiumPlus
  })
  const totalComped = computed(() => {
    if (!data.value) return 0
    return data.value.monetization.compedPremium + data.value.monetization.compedPremiumPlus
  })
  const freePct = computed(() => {
    if (!data.value || data.value.summary.totalUsers === 0) return 100
    return Math.round((data.value.monetization.free / data.value.summary.totalUsers) * 100)
  })
  const compedPct = computed(() => {
    if (!data.value || data.value.summary.totalUsers === 0) return 0
    return Math.round((totalComped.value / data.value.summary.totalUsers) * 100)
  })
  const payingPct = computed(() => {
    if (!data.value || data.value.summary.totalUsers === 0) return 0
    return Math.round((totalPaying.value / data.value.summary.totalUsers) * 100)
  })

  const verifiedConversionPct = computed(() => {
    if (!data.value || data.value.summary.totalUsers === 0) return 0
    return Math.round((data.value.summary.verifiedUsers / data.value.summary.totalUsers) * 100)
  })

  const premiumOfVerifiedPct = computed(() => {
    if (!data.value || data.value.summary.verifiedUsers === 0) return 0
    return Math.round((data.value.summary.premiumUsers / data.value.summary.verifiedUsers) * 100)
  })

  const asOfDisplay = computed(() => {
    if (!data.value) return ''
    return new Date(data.value.asOf).toLocaleString()
  })

  onMounted(load)

  return {
    coinKpiCards,
    coinMultiplierTotal,
    velocityColor,
    giniColor,
    coinMultiplierRows,
    articleVisibilityRows,
    articleKpiCards,
    boardKpiCards,
    visibilityBadgeClass,
    visibilityLabel,
    articleAge,
    groupKpiCards,
    channelKpiCards,
    spaceKpiCards,
    aiKpiCards,
    aiSourceRows,
    aiModeRows,
    aiOutcomeRows,
    summaryCards,
    totalPostsByVisibility,
    visibilityRows,
    retentionRows,
    retentionColor,
    engagementColor,
    concentrationColor,
    landingContributorPct,
    totalPaying,
    totalComped,
    freePct,
    compedPct,
    payingPct,
    verifiedConversionPct,
    premiumOfVerifiedPct,
    asOfDisplay,
  }
}
