export type SpaceDisplayInput = {
  title: string | null
  isActive: boolean
  scheduledAt?: string | null
  mode: 'NONE' | 'WATCH_PARTY' | 'RADIO'
  playbackTitle?: string | null
  watchPartyUrl?: string | null
  radioStreamUrl?: string | null
}

export type SpaceLobbyRowKind = 'watch' | 'radio' | 'quiet'

/** Lobby card treatment: cinematic watch party, radio, or a quiet list row. */
export function spaceLobbyRowKind(space: SpaceDisplayInput): SpaceLobbyRowKind {
  // Same rule as radio: a saved YouTube URL earns the poster, live or scheduled.
  if (space.mode === 'WATCH_PARTY' && Boolean(space.watchPartyUrl?.trim())) {
    return 'watch'
  }
  if (space.mode === 'RADIO' && Boolean(space.radioStreamUrl?.trim())) {
    return 'radio'
  }
  return 'quiet'
}

export type SpacesNavGlyph = 'grid' | 'music' | 'tv'

/** Spaces nav icon: music for radio, TV for a live watch party, otherwise the grid. */
export function spacesNavGlyph(space: SpaceDisplayInput | null | undefined): SpacesNavGlyph {
  if (!space) return 'grid'
  if (space.mode === 'RADIO' && Boolean(space.radioStreamUrl?.trim())) return 'music'
  if (space.isActive && space.mode === 'WATCH_PARTY') return 'tv'
  return 'grid'
}

export type SpaceStatusKind = 'live' | 'scheduled' | 'radio' | 'idle'

export function upcomingScheduleDate(iso: string | null | undefined): Date | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime()) || d.getTime() <= Date.now()) return null
  return d
}

export function spaceStatusKind(
  space: Pick<SpaceDisplayInput, 'isActive' | 'scheduledAt'> & Partial<Pick<SpaceDisplayInput, 'mode' | 'radioStreamUrl'>>,
): SpaceStatusKind {
  if (space.isActive) return 'live'
  if (upcomingScheduleDate(space.scheduledAt)) return 'scheduled'
  if (space.mode === 'RADIO' && Boolean(space.radioStreamUrl?.trim())) return 'radio'
  return 'idle'
}

/** Default identity name from create: `{username}'s Space`. */
export function isDefaultSpaceTitle(title: string | null | undefined): boolean {
  return /^.+'s space$/i.test((title ?? '').trim())
}

function playingTitle(
  space: SpaceDisplayInput,
  extras?: { playbackTitleOverride?: string | null },
): string {
  return (space.playbackTitle?.trim() || extras?.playbackTitleOverride?.trim() || '')
}

/** Visible title: owner name wins; YouTube/radio fills in when the title is still the default. */
export function spaceDisplayTitle(
  space: SpaceDisplayInput,
  extras?: { playbackTitleOverride?: string | null },
): string {
  const stored = (space.title ?? '').trim()
  const playing = playingTitle(space, extras)
  if (stored && !isDefaultSpaceTitle(stored)) return stored
  if (playing) return playing
  if (space.isActive && space.mode === 'WATCH_PARTY') return 'Watch party'
  if (space.isActive && space.mode === 'RADIO') return 'Radio'
  return stored
}

/** YouTube/radio name when the owner also set a different title. */
export function spaceDisplaySubtitle(
  space: SpaceDisplayInput,
  extras?: { playbackTitleOverride?: string | null },
): string | null {
  const playing = playingTitle(space, extras)
  if (!playing) return null
  return playing !== spaceDisplayTitle(space, extras) ? playing : null
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
      space.mode === 'WATCH_PARTY' ? 'Watch party' : space.mode === 'RADIO' ? 'Listening' : null
    return [verb, host, here].filter(Boolean).join(' · ')
  }
  if (kind === 'scheduled') {
    return [host, formatSpaceScheduleShort(space.scheduledAt)].filter(Boolean).join(' · ')
  }
  if (kind === 'radio') {
    return ['Radio', host, here].filter(Boolean).join(' · ')
  }
  return ['Idle', host, here].filter(Boolean).join(' · ')
}
