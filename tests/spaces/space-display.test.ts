import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  formatSpaceScheduleShort,
  spaceCardMetaLine,
  spaceDisplaySubtitle,
  spaceDisplayTitle,
  spaceLobbyRowKind,
  spacesNavGlyph,
  spaceStatusKind,
} from '../../utils/space-display'

const base = {
  title: "john's Space",
  isActive: false,
  scheduledAt: null as string | null,
  mode: 'NONE' as const,
  playbackTitle: null as string | null,
}

describe('spaceDisplayTitle', () => {
  it('uses the YouTube title when a watch party is live', () => {
    expect(
      spaceDisplayTitle({
        ...base,
        isActive: true,
        mode: 'WATCH_PARTY',
        playbackTitle: 'Conference talk',
      }),
    ).toBe('Conference talk')
  })

  it('falls back to Watch party when live without a playback title', () => {
    expect(
      spaceDisplayTitle({
        ...base,
        isActive: true,
        mode: 'WATCH_PARTY',
        playbackTitle: null,
      }),
    ).toBe('Watch party')
  })

  it('uses a YouTube oEmbed override when the server title is missing', () => {
    expect(
      spaceDisplayTitle(
        {
          ...base,
          isActive: true,
          mode: 'WATCH_PARTY',
          playbackTitle: null,
        },
        { playbackTitleOverride: 'THE GREAT DEBATE' },
      ),
    ).toBe('THE GREAT DEBATE')
  })

  it('uses the station name when radio is live', () => {
    expect(
      spaceDisplayTitle({
        ...base,
        isActive: true,
        mode: 'RADIO',
        playbackTitle: 'Groove Salad',
      }),
    ).toBe('Groove Salad')
  })

  it('falls back to Radio when live without a station name', () => {
    expect(
      spaceDisplayTitle({
        ...base,
        isActive: true,
        mode: 'RADIO',
      }),
    ).toBe('Radio')
  })

  it('uses YouTube metadata when the stored title is still the default', () => {
    expect(spaceDisplayTitle(base)).toBe("john's Space")
    expect(
      spaceDisplayTitle({
        ...base,
        scheduledAt: '2099-08-16T18:00:00.000Z',
        mode: 'WATCH_PARTY',
        playbackTitle: 'Conference talk',
      }),
    ).toBe('Conference talk')
  })

  it('keeps a custom title and exposes YouTube as the subtitle', () => {
    const space = {
      ...base,
      title: 'The Great Debate',
      isActive: true,
      mode: 'WATCH_PARTY' as const,
      playbackTitle: 'Conference talk',
    }
    expect(spaceDisplayTitle(space)).toBe('The Great Debate')
    expect(spaceDisplaySubtitle(space)).toBe('Conference talk')
  })
})

describe('spaceStatusKind', () => {
  it('is live, scheduled, radio, or idle', () => {
    expect(spaceStatusKind({ isActive: true, scheduledAt: null })).toBe('live')
    expect(spaceStatusKind({ isActive: false, scheduledAt: '2099-08-16T18:00:00.000Z' })).toBe('scheduled')
    expect(spaceStatusKind({
      isActive: false,
      scheduledAt: null,
      mode: 'RADIO',
      radioStreamUrl: 'https://ice1.somafm.com/groovesalad-128-mp3',
    })).toBe('radio')
    expect(spaceStatusKind({ isActive: false, scheduledAt: null })).toBe('idle')
    expect(spaceStatusKind({ isActive: false, scheduledAt: '2000-01-01T00:00:00.000Z' })).toBe('idle')
  })
})

describe('spaceLobbyRowKind', () => {
  it('uses a watch card whenever a YouTube URL is set, live or scheduled', () => {
    expect(spaceLobbyRowKind({
      ...base,
      isActive: true,
      mode: 'WATCH_PARTY',
      watchPartyUrl: 'https://youtu.be/abc',
    })).toBe('watch')
    expect(spaceLobbyRowKind({
      ...base,
      scheduledAt: '2099-08-16T18:00:00.000Z',
      mode: 'WATCH_PARTY',
      watchPartyUrl: 'https://youtu.be/abc',
    })).toBe('watch')
    expect(spaceLobbyRowKind({
      ...base,
      mode: 'WATCH_PARTY',
    })).toBe('quiet')
  })

  it('uses a radio card whenever a stream is set', () => {
    expect(spaceLobbyRowKind({
      ...base,
      isActive: true,
      mode: 'RADIO',
      radioStreamUrl: 'https://ice1.somafm.com/groovesalad-128-mp3',
    })).toBe('radio')
    expect(spaceLobbyRowKind({
      ...base,
      mode: 'RADIO',
      radioStreamUrl: 'https://ice1.somafm.com/groovesalad-128-mp3',
    })).toBe('radio')
    expect(spaceLobbyRowKind({
      ...base,
      mode: 'RADIO',
    })).toBe('quiet')
  })
})

describe('spacesNavGlyph', () => {
  it('uses music for radio, TV for a live watch party, otherwise the grid', () => {
    expect(spacesNavGlyph(null)).toBe('grid')
    expect(spacesNavGlyph({
      ...base,
      mode: 'RADIO',
      radioStreamUrl: 'https://ice1.somafm.com/groovesalad-128-mp3',
    })).toBe('music')
    expect(spacesNavGlyph({
      ...base,
      isActive: true,
      mode: 'WATCH_PARTY',
      watchPartyUrl: 'https://youtu.be/abc',
    })).toBe('tv')
    expect(spacesNavGlyph({
      ...base,
      mode: 'WATCH_PARTY',
      watchPartyUrl: 'https://youtu.be/abc',
    })).toBe('grid')
    expect(spacesNavGlyph(base)).toBe('grid')
  })
})

describe('spaceCardMetaLine', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('describes a live watch party', () => {
    expect(
      spaceCardMetaLine(
        { ...base, isActive: true, mode: 'WATCH_PARTY', playbackTitle: 'Talk' },
        { hostUsername: 'john', hereCount: 3 },
      ),
    ).toBe('Watch party · @john · 3 here')
  })

  it('describes live radio', () => {
    expect(
      spaceCardMetaLine(
        { ...base, isActive: true, mode: 'RADIO', playbackTitle: 'Groove Salad' },
        { hostUsername: 'john', hereCount: 1 },
      ),
    ).toBe('Listening · @john · 1 here')
  })

  it('describes radio that is not on-air as Radio, not Idle', () => {
    expect(
      spaceCardMetaLine(
        {
          ...base,
          mode: 'RADIO',
          radioStreamUrl: 'https://ice1.somafm.com/groovesalad-128-mp3',
        },
        { hostUsername: 'john', hereCount: 2 },
      ),
    ).toBe('Radio · @john · 2 here')
  })

  it('omits the here count on idle when nobody is in the room', () => {
    expect(spaceCardMetaLine(base, { hostUsername: 'john', hereCount: 0 })).toBe('Idle · @john')
  })

  it('includes the here count on idle when people are hanging out', () => {
    expect(spaceCardMetaLine(base, { hostUsername: 'john', hereCount: 2 })).toBe('Idle · @john · 2 here')
  })

  it('shows host and short date for scheduled spaces', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-14T15:00:00.000Z'))
    const iso = '2026-08-16T18:00:00.000Z'
    expect(
      spaceCardMetaLine(
        { ...base, scheduledAt: iso },
        { hostUsername: 'john', hereCount: 4 },
      ),
    ).toBe(`@john · ${formatSpaceScheduleShort(iso)}`)
  })
})
