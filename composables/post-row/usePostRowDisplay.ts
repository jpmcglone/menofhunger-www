import { easternDateKey } from '~/utils/eastern-time'
import { formatLocaleDateTime } from '~/utils/time-format'
import type { FeedPost } from '~/types/api'
import { visibilityTagClasses, visibilityTagLabel } from '~/utils/post-visibility'
import { tinyTooltip, type TinyTooltipConfig } from '~/utils/tiny-tooltip'

/** Row header display state: visibility/check-in tags and the created-at label. */
export function usePostRowDisplay(postView: ComputedRef<FeedPost>, isCheckinPost: ComputedRef<boolean>) {
  const isCheckinPromptToday = computed(() => {
    const dk = (postView.value.checkinDayKey ?? '').trim()
    return Boolean(dk && dk === easternDateKey())
  })
  const metaTags = computed(() => {
    const out: Array<{ key: string; label: string; class: string; tooltip: TinyTooltipConfig; icon?: string | null; to?: string | null }> = []

    // Visibility tag first (Verified/Premium/Only me), if any.
    const vis = visibilityTagLabel(postView.value.visibility)
    if (vis) {
      out.push({
        key: `vis:${postView.value.visibility}`,
        label: vis,
        class: visibilityTagClasses(postView.value.visibility),
        tooltip:
          postView.value.visibility === 'verifiedOnly'
            ? tinyTooltip('Visible to verified members')
            : postView.value.visibility === 'premiumOnly'
              ? tinyTooltip('Visible to premium members')
              : postView.value.visibility === 'onlyMe'
                ? tinyTooltip('Visible only to you')
                : null,
        icon: postView.value.visibility === 'onlyMe' ? 'tabler:eye-off' : null,
      })
    }

    // Check-in tag second (replaces nothing; appends after visibility).
    if (isCheckinPost.value) {
      out.push({
        key: 'kind:checkin',
        label: 'Check-in answer',
        class: 'moh-tag-checkin',
        tooltip: tinyTooltip('Daily check-in'),
        icon: 'tabler:calendar-check',
        to: '/check-ins/new',
      })
    }

    return out
  })

  const createdAtDate = computed(() => new Date(postView.value.createdAt))
  const { nowMs } = useNowTicker({ everyMs: 15_000 })
  const createdAtShort = computed(() => formatShortDate(createdAtDate.value, nowMs.value))
  // Fixed locale for SSR: server and client must produce identical output.
  const createdAtTooltip = computed(() =>
    tinyTooltip(formatLocaleDateTime(createdAtDate.value)),
  )

  function formatShortDate(d: Date, nowMs: number): string {
    const diffMs = Math.max(0, Math.floor((nowMs || 0) - d.getTime()))
    const diffSec = Math.floor(diffMs / 1000)
    if (diffSec < 60) return 'now'
    const diffMin = Math.floor(diffSec / 60)
    if (diffMin < 60) return `${diffMin}m`
    const diffHr = Math.floor(diffMin / 60)
    if (diffHr < 24) return `${diffHr}h`
    const diffDay = Math.floor(diffHr / 24)
    if (diffDay < 7) return `${diffDay}d`

    const sameYear = new Date(nowMs).getFullYear() === d.getFullYear()
    const month = formatLocaleDateTime(d, { month: 'short' })
    const day = d.getDate()
    return sameYear ? `${month} ${day}` : `${month} ${day}, ${d.getFullYear()}`
  }

  return { isCheckinPromptToday, metaTags, createdAtShort, createdAtTooltip }
}
