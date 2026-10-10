import type { Ref } from 'vue'
import type { FollowListUser } from '~/types/api'
import type { DockSession } from '~/utils/chat-dock'
export interface ReturnTypeOfDock {
  width: Ref<number>; desktop: Ref<boolean>; capacity: Ref<number>; sessions: Ref<DockSession[]>;
  focusedKey: Ref<string | null>; focusRequest: Ref<number>; focusRequestKey: Ref<string | null>; listExpanded: Ref<boolean>; popupsPaused: Ref<boolean>; fullHostReady: Ref<boolean>;
  open: (key: string, automatic?: boolean) => void;
  openDraft: (recipients: FollowListUser[]) => string;
  setMode: (key: string, mode: DockSession['mode']) => void; reset: () => void;
}
