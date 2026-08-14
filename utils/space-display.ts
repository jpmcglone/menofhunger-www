export type SpaceDisplayInput = {
  title: string
  isActive: boolean
  scheduledAt?: string | null
  mode: 'NONE' | 'WATCH_PARTY' | 'RADIO'
  playbackTitle?: string | null
}

export type SpaceStatusKind = 'live' | 'scheduled' | 'idle'

export function upcomingScheduleDate(iso: string | null | undefined): Date | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime()) || d.getTime() <= Date.now()) return null
  return d
}

export function spaceStatusKind(space: Pick<SpaceDisplayInput, 'isActive' | 'scheduledAt'>): SpaceStatusKind {
  if (space.isActive) return 'live'
  if (upcomingScheduleDate(space.scheduledAt)) return 'scheduled'
  return 'idle'
}

/** Visible title: what's on when live, otherwise the stored identity name. */
export function spaceDisplayTitle(
  space: SpaceDisplayInput,
  extras?: { playbackTitleOverride?: string | null },
): string {
  if (space.isActive && space.mode === 'WATCH_PARTY') {
    const playing = space.playbackTitle?.trim() || extras?.playbackTitleOverride?.trim()
    return playing || 'Watch party'
  }
  if (space.isActive && space.mode === 'RADIO') {
    const playing = space.playbackTitle?.trim() || extras?.playbackTitleOverride?.trim()
    return playing || 'Radio'
  }
  return space.title
}

export function formatSpaceScheduleShort(iso: string | null | undefined): string | null {
  const d = upcomingScheduleDate(iso)
  if (!d) return null
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(d)
}

export function spaceCardMetaLine(
  space: SpaceDisplayInput,
  opts: { hostUsername?: string | null; hereCount?: number },
): string {
  const kind = spaceStatusKind(space)
  const host = opts.hostUsername?.trim() ? `@${opts.hostUsername.trim()}` : null
  const hereCount = Math.max(0, Number(opts.hereCount) || 0)
  const here = hereCount > 0 ? `${hereCount} here` : null

  if (kind === 'live') {
    const verb =
      space.mode === 'WATCH_PARTY' ? 'Watching' : space.mode === 'RADIO' ? 'Listening' : null
    return [verb, host, here].filter(Boolean).join(' · ')
  }
  if (kind === 'scheduled') {
    return [host, formatSpaceScheduleShort(space.scheduledAt)].filter(Boolean).join(' · ')
  }
  return ['Idle', host, here].filter(Boolean).join(' · ')
}
