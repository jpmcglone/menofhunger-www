import { describe, expect, it } from 'vitest'
import { mergeWelcomeProgress, parseWelcomeProgress, recordWelcomeProgress, welcomeProgressKey, WELCOME_PROGRESS_EVENT } from '~/utils/welcome-progress'

describe('getting-started milestones', () => {
  it('accepts only confirmed boolean milestones, including corrupt storage', () => {
    for (const raw of [null, 'broken', 'null', '{"followed":"true","posted":1}']) {
      expect(parseWelcomeProgress(raw)).toEqual({ followed: false, posted: false, dismissed: false })
    }
  })
  it('allows either order, deduplicates echoes, and retains achievements after unfollow', () => {
    const first = mergeWelcomeProgress(parseWelcomeProgress(null), { posted: true })
    expect(first).toEqual({ followed: false, posted: true, dismissed: false })
    const both = mergeWelcomeProgress(first, { followed: true })
    expect(mergeWelcomeProgress(both, { followed: false, posted: false })).toEqual(both)
    expect(mergeWelcomeProgress(both, both)).toEqual(both)
  })
  it('persists milestones and dismissal independently per account', () => {
    localStorage.clear()
    recordWelcomeProgress('first', { followed: true })
    recordWelcomeProgress('first', { dismissed: true })
    recordWelcomeProgress('second', { posted: true })
    expect(parseWelcomeProgress(localStorage.getItem(welcomeProgressKey('first')))).toEqual({ followed: true, posted: false, dismissed: true })
    expect(parseWelcomeProgress(localStorage.getItem(welcomeProgressKey('second')))).toEqual({ followed: false, posted: true, dismissed: false })
  })
  it('notifies active views only with the action owner and confirmed patch', () => {
    const events: unknown[] = []
    const listener = (event: Event) => events.push((event as CustomEvent).detail)
    window.addEventListener(WELCOME_PROGRESS_EVENT, listener)
    recordWelcomeProgress('owner', { posted: true })
    recordWelcomeProgress('', { posted: true })
    window.removeEventListener(WELCOME_PROGRESS_EVENT, listener)
    expect(events).toEqual([{ userId: 'owner', patch: { posted: true } }])
  })
})
