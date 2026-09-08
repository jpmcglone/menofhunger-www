export type WelcomeProgress = { followed: boolean; posted: boolean; dismissed: boolean }
export const WELCOME_PROGRESS_EVENT = 'moh:welcome-progress'
export const welcomeProgressKey = (userId: string) => `moh.welcome.v2.${userId}`

export function parseWelcomeProgress(raw: string | null): WelcomeProgress {
  try {
    const value = JSON.parse(raw ?? '{}')
    return { followed: value?.followed === true, posted: value?.posted === true, dismissed: value?.dismissed === true }
  } catch {
    return { followed: false, posted: false, dismissed: false }
  }
}

/** Milestones are durable achievements, not current counts (unfollowing never undoes them). */
export function mergeWelcomeProgress(current: WelcomeProgress, patch: Partial<WelcomeProgress>): WelcomeProgress {
  return {
    followed: current.followed || patch.followed === true,
    posted: current.posted || patch.posted === true,
    dismissed: current.dismissed || patch.dismissed === true,
  }
}

export function recordWelcomeProgress(userId: string, patch: Partial<WelcomeProgress>) {
  if (!import.meta.client || !userId) return
  try {
    const key = welcomeProgressKey(userId)
    const next = mergeWelcomeProgress(parseWelcomeProgress(localStorage.getItem(key)), patch)
    localStorage.setItem(key, JSON.stringify(next))
  } catch { /* Storage may be unavailable; the active view still receives the achievement. */ }
  window.dispatchEvent(new CustomEvent(WELCOME_PROGRESS_EVENT, { detail: { userId, patch } }))
}
