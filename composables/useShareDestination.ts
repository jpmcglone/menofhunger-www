import type { ComposerVisibility } from '~/utils/injection-keys'

export type ShareDestination =
  | { kind: 'feed'; visibility?: ComposerVisibility }
  | { kind: 'group'; groupId: string; groupName?: string }
  | { kind: 'chat' }

const STORAGE_KEY = 'moh.shareDestination'

export function useShareDestination() {
  function load(): ShareDestination {
    if (!import.meta.client) return { kind: 'feed' }
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (!raw) return { kind: 'feed' }
      const parsed = JSON.parse(raw) as ShareDestination
      if (parsed?.kind === 'chat') return { kind: 'chat' }
      if (parsed?.kind === 'group' && parsed.groupId) {
        return { kind: 'group', groupId: parsed.groupId, groupName: parsed.groupName }
      }
      if (parsed?.kind === 'feed') {
        return { kind: 'feed', visibility: parsed.visibility }
      }
    } catch {
      // ignore corrupt storage
    }
    return { kind: 'feed' }
  }

  function save(destination: ShareDestination) {
    if (!import.meta.client) return
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(destination))
    } catch {
      // ignore quota / private mode
    }
  }

  function rememberFeed(visibility?: ComposerVisibility) {
    save({ kind: 'feed', visibility })
  }

  function rememberGroup(groupId: string, groupName?: string) {
    save({ kind: 'group', groupId, groupName })
  }

  function rememberChat() {
    save({ kind: 'chat' })
  }

  return { load, save, rememberFeed, rememberGroup, rememberChat }
}
