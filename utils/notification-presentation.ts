import type catalog from '../design/icon-catalog.json'
import { userColorTier, userTierTextClass, type UserTierLike } from './user-tier'

const ACTOR_EVENTS = new Set(['boost', 'repost', 'follow', 'comment', 'mention', 'crew_wall_mention', 'message', 'status_update', 'nudge'])

/** Shapes identify the event; social colors identify the actor, not content visibility. */
export function notificationPresentation(kind: string, actors: UserTierLike[] = []): { icon: string; color: string } {
  const result = eventPresentation(kind)
  if (!ACTOR_EVENTS.has(kind)) return result
  const tiers = new Set(actors.map(userColorTier))
  const tier = tiers.size === 1 ? [...tiers][0]! : 'normal'
  return { ...result, color: userTierTextClass(tier, { fallback: 'moh-text-muted' }) }
}

function eventPresentation(kind: string): { icon: string; color: string } {
  switch (kind) {
    case 'boost': return { icon: 'tabler:arrow-big-up-filled', color: 'text-orange-500' }
    case 'repost': return { icon: 'tabler:repeat', color: 'text-emerald-500' }
    case 'follow': return { icon: 'tabler:user-filled', color: 'text-sky-500' }
    case 'mention': case 'crew_wall_mention': return { icon: 'tabler:at', color: 'text-sky-500' }
    case 'comment': case 'message': case 'status_update': return { icon: 'tabler:message-circle-filled', color: 'text-sky-500' }
    case 'nudge': return { icon: 'tabler:hand-click', color: 'text-violet-500' }
    case 'marv_not_in_group': return { icon: 'tabler:sparkles', color: 'text-[var(--moh-ai)]' }
    case 'poll_results_ready': return { icon: 'tabler:chart-bar', color: 'text-sky-500' }
    case 'word_of_the_day': return { icon: 'tabler:book-filled', color: 'text-amber-500' }
    case 'quote_of_the_day': return { icon: 'tabler:quote-filled', color: 'text-indigo-500' }
    case 'account_verified': return { icon: 'tabler:rosette-discount-check-filled', color: 'text-[var(--moh-verified)]' }
    case 'premium_started': return { icon: 'tabler:crown-filled', color: 'text-[var(--moh-premium)]' }
    case 'premium_ended': return { icon: 'tabler:crown-off', color: 'moh-text-muted' }
    case 'coin_transfer': return { icon: 'tabler:coin-filled', color: 'text-amber-500' }
    case 'checkin_post': case 'checkin_reminder': return { icon: 'tabler:calendar-check', color: 'text-[var(--moh-checkin)]' }
    case 'on_this_day': return { icon: 'tabler:history', color: 'text-teal-500' }
    case 'followed_article': return { icon: 'tabler:article', color: 'text-sky-500' }
    case 'followed_post': case 'community_group_post': return { icon: 'tabler:file-text-filled', color: 'text-sky-500' }
    default:
      if (kind.startsWith('space_') || kind === 'followed_space') return { icon: 'tabler:broadcast', color: 'text-[var(--moh-brass)]' }
      if (kind.startsWith('crew_') || kind.startsWith('community_group_') || kind === 'group_join_request') return { icon: 'tabler:users-group', color: 'text-sky-500' }
      return { icon: 'tabler:bell-filled', color: 'moh-text-muted' }
  }
}

const SYSTEM_KINDS = new Set([
    'marv_not_in_group', 'poll_results_ready', 'word_of_the_day', 'quote_of_the_day',
    'account_verified', 'checkin_reminder', 'on_this_day', 'premium_started', 'premium_ended',
    'space_reminder_day', 'space_reminder_soon', 'space_live', 'space_schedule_cancelled',
    'space_schedule_rescheduled', 'followed_space', 'generic',
])

export function notificationShowsActor(kind: string): boolean {
  return !SYSTEM_KINDS.has(kind)
}

/** Figma event glyphs; retain legacy glyphs for event states the library does not define. */
export function notificationGlyph(kind: string): { name: keyof typeof catalog; selected: boolean } | null {
  const icon = eventPresentation(kind).icon
  const glyphs: Record<string, [keyof typeof catalog, boolean]> = {
    'tabler:arrow-big-up-filled': ['boost', true],
    'tabler:repeat': ['repost', false],
    'tabler:user-filled': ['profile', true],
    'tabler:message-circle-filled': ['reply', false],
    'tabler:hand-click': ['nudge', false],
    'tabler:sparkles': ['marv', false],
    'tabler:chart-bar': ['analytics', false],
    'tabler:book-filled': ['word', false],
    'tabler:quote-filled': ['quote', false],
    'tabler:rosette-discount-check-filled': ['verified', true],
    'tabler:crown-filled': ['premium', false],
    'tabler:coin-filled': ['coins', false],
    'tabler:calendar-check': ['checkin', false],
    'tabler:history': ['history', false],
    'tabler:article': ['article', false],
    'tabler:file-text-filled': ['article', true],
    'tabler:broadcast': ['spaces', false],
    'tabler:users-group': ['members', false],
    'tabler:bell-filled': ['notifications', false],
  }
  const glyph = glyphs[icon]
  return glyph ? { name: glyph[0], selected: glyph[1] } : null
}
