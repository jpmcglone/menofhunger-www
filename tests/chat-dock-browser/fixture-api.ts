import { reactive, ref } from 'vue'
import type { MessageConversation, MessageUser } from '~/types/api'

const states = new Map<string, ReturnType<typeof ref>>()
export function useState(key: string, initial: () => unknown) {
  if (!states.has(key)) states.set(key, ref(initial()))
  return states.get(key)!
}
export function useHydratedMediaQuery() { return ref(true) }
export const route = reactive({ path: '/home', query: {} })
export function useRoute() { return route }
export function navigateTo() {}
export function useAuth() { return { user: ref({ id: 'fixture-user' }), isPageAccount: ref(false) } }
export function useSpaceLobby() { return { selectedSpaceId: ref(null), currentSpace: ref(null) } }
export function usePresence() { return { emitMessagesScreen() {}, isSocketConnected: ref(false), addInterest() {}, removeInterest() {} } }
export function useCallSession() { return { call: ref(null), incoming: ref(null), minimized: ref(false) } }
export function useChatDockSounds() { return { open() {}, minimize() {}, close() {} } }
export function usePresenceCallback() {}
export function useUsersStore() { return { overlay: (user: MessageUser) => user } }
export const conversations = ref<MessageConversation[]>(['a', 'b', 'c'].map(id => ({ id, type: 'direct', unreadCount: 0, lastMessageAt: null, lastMessage: null, participants: [] }) as unknown as MessageConversation))
