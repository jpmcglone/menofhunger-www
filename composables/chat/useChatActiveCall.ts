import type { ComputedRef, InjectionKey } from 'vue'
import type { CallSession } from '~/types/api'

/**
 * The selected conversation's live call, provided by the chat page so deep rows
 * (`ChatMessageCallRow`) can show Join without threading a prop through the list.
 */
export const ChatActiveCallKey: InjectionKey<ComputedRef<CallSession | null>> = Symbol('chat-active-call')

export function provideChatActiveCall(activeCall: ComputedRef<CallSession | null>) {
  provide(ChatActiveCallKey, activeCall)
}

export function useChatActiveCall(): ComputedRef<CallSession | null> {
  return inject(ChatActiveCallKey, computed(() => null))
}
