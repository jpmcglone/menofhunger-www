import type { MembersMapState, MembersMapUser } from '~/types/api'
import type { MapMoment } from '~/composables/useMembersMap'

export interface MembersUsMapProps {
  states: MembersMapState[]
  onlineOnly: boolean
  selected: string | null
  /** Members of the selected state, online first. */
  members: MembersMapUser[]
  /** Members in the selected state that match the current filter, loaded or not. */
  memberTotal: number
  packLoading?: boolean
  viewerState: string | null
  /** False for signed-out and unverified viewers: counts only, never faces. */
  membersVisible: boolean
  /** Live joins / online / offline effects to draw on their states. */
  moments?: MapMoment[]
}

export interface MembersUsMapEmits {
  (e: 'select', code: string | null): void
  (e: 'showAll'): void
}
