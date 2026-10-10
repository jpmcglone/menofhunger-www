<template>
  <Teleport to="body">
    <div class="moh-activity-stack pointer-events-none fixed left-6 z-[var(--moh-z-toast)]" :style="stackStyle" aria-live="polite" aria-relevant="additions">
      <TransitionGroup name="moh-activity" tag="div" role="list" class="flex flex-col gap-2.5">
        <div
          v-for="toast in toasts" :key="toast.id" class="moh-activity-card pointer-events-auto flex items-center gap-3 rounded-2xl border moh-border py-3 pl-4 pr-2"
          role="listitem" @mouseenter="pause(toast.id, 'hovered', true)" @mouseleave="pause(toast.id, 'hovered', false)"
          @focusin="pause(toast.id, 'focused', true)" @focusout="focusOut(toast.id, $event)"
        >
          <NuxtLink :to="toast.to" class="moh-focus flex min-h-11 min-w-0 flex-1 items-center gap-3 rounded-xl" @click="openToast(toast)" @auxclick="$event.button === 1 && openToast(toast)">
            <span v-if="toast.kind === 'presence-online' || toast.kind === 'presence-offline'" class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--moh-surface-3)]" aria-hidden="true">
              <Icon :name="toast.kind === 'presence-online' ? 'tabler:user-check' : 'tabler:user-minus'" class="h-5 w-5" :class="toast.kind === 'presence-online' ? 'text-[var(--moh-online)]' : 'moh-text-muted'" />
            </span>
            <AppNotificationEventIcon v-else :kind="toast.kind" :actors="toast.actors" />
            <span class="min-w-0 flex-1">
              <span class="line-clamp-2 text-[13px] font-semibold leading-[18px] moh-text">{{ toast.title }}</span>
              <span class="mt-1 block truncate text-xs leading-4 moh-text-muted">{{ toast.context }}</span>
            </span>
          </NuxtLink>
          <button type="button" class="moh-focus flex h-11 w-11 shrink-0 items-center justify-center rounded-full moh-text-muted hover:bg-[var(--moh-surface-hover)]" aria-label="Dismiss activity" @click="dismiss(toast.id)">
            <Icon name="tabler:x" class="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { useCallSession } from '~/composables/calls/useCallSession'
import { useSpaceLobby } from '~/composables/useSpaceLobby'
import { usePresenceCallback } from '~/composables/presence/usePresenceCallback'
import { useNotificationDisplay } from '~/composables/notifications/useNotificationDisplay'
import { useActivityNotificationRead } from '~/composables/notifications/useActivityNotificationRead'
import { useActivityToastStack, type ActivityToast } from '~/composables/useActivityToastStack'
import { useActivityToastRoom } from '~/composables/useActivityToastRoom'
import { mediaFocus } from '~/utils/mediaFocus'
import { notificationShowsActor } from '~/utils/notification-presentation'
import { formatCount } from '~/utils/number-format'
import { isSoundBacklogSuppressed } from '~/utils/sound-policy'
import type { PresenceFollowedOnlinePayloadDto } from '~/types/api-contracts.gen'
import type { Notification, WsNotificationsNewPayload } from '~/types/api'
import type { WsNotificationsUpdatedPayload } from '~/composables/presence/types'

const route = useRoute()
const { user } = useAuth()
const room = useActivityToastRoom()
const popupsPaused = useState<boolean>('chat-dock-popups-paused', () => false)
const chimes = usePresenceChimes()
const { incoming } = useCallSession()
const { selectedSpaceId, currentSpace } = useSpaceLobby()
const { toasts, push, dismiss, pause, clear } = useActivityToastStack()
const display = useNotificationDisplay({ me: user, usersStore: useUsersStore() })
const reads = useActivityNotificationRead()
const stackStyle = computed(() => ({ bottom: selectedSpaceId.value && currentSpace.value ? 'calc(24px + var(--moh-radio-bar-height, 4rem))' : '24px' }))
let seq = 0
let batchTimer: ReturnType<typeof setTimeout> | undefined
let pending: ActivityToast[] = []
const arrivals = new Set<string>()
const presenceArrivals = new Map<string, number>()

function available(presence = false) {
  return import.meta.client && room.value && !popupsPaused.value && user.value?.id
    && document.visibilityState === 'visible' && !mediaFocus.isCallActive && !incoming.value
    && !isSoundBacklogSuppressed() && (!presence || route.path !== '/map')
}
function clearAll(resetIdentity = false) {
  clear(resetIdentity)
  if (batchTimer) clearTimeout(batchTimer)
  batchTimer = undefined
  pending = []
  if (resetIdentity) { arrivals.clear(); presenceArrivals.clear() }
}
function focusOut(id: string, event: FocusEvent) {
  const next = event.relatedTarget
  if (next instanceof Node && (event.currentTarget as HTMLElement).contains(next)) return
  pause(id, 'focused', false)
}
function openToast(toast: ActivityToast) {
  dismiss(toast.id)
  if (toast.readNotificationID) void reads.markRead(toast.readNotificationID)
}
function presence(payload: PresenceFollowedOnlinePayloadDto, online: boolean) {
  if (!available(true)) return
  const users = (payload.users ?? []).filter(person => person.username && person.id !== user.value?.id)
  if (!users.length) return
  const arrivalKey = `${online}-${users.map(person => person.id).sort().join(',')}`
  if (Date.now() - (presenceArrivals.get(arrivalKey) ?? 0) < 30000) return
  presenceArrivals.set(arrivalKey, Date.now())
  if (presenceArrivals.size > 256) presenceArrivals.delete(presenceArrivals.keys().next().value!)
  const first = users[0]!
  const others = Math.max(0, payload.total - 1)
  const name = first.name?.trim() || `@${first.username}`
  const title = others ? `${name} and ${formatCount(others)} ${others === 1 ? 'other' : 'others'} are ${online ? 'online' : 'offline'}` : `${name} is ${online ? 'online' : 'offline'}`
  if (push({ id: `presence-${online}-${++seq}`, kind: online ? 'presence-online' : 'presence-offline', title, context: 'People you follow', to: users.length > 1 || others ? '/online' : `/u/${encodeURIComponent(first.username!)}` })) {
    const identity = user.value?.id
    chimes.play(online ? 'follow' : 'offline', { extraEnabled: () => Boolean(available(true) && user.value?.id === identity) })
  }
}
function notificationToast(notification: Notification): ActivityToast {
  const title = notificationShowsActor(notification.kind) && notification.actor
    ? `${display.actorDisplay(notification)} ${display.titleSuffix(notification)}` : display.titleSuffix(notification)
  const context = notification.boardThreadId ? 'Board · ' + display.notificationContext(notification)
    : notification.subjectGroupName ? notification.subjectGroupName : display.notificationContext(notification)
  return { id: `notification-${notification.id}`, notificationIDs: [notification.id], readNotificationID: notification.id,
    subjectPostIDs: [notification.subjectPostId, notification.actorPostId, notification.post?.id].filter((id): id is string => Boolean(id)),
    boardThreadIDs: notification.boardThreadId ? [notification.boardThreadId] : [],
    kind: notification.kind, title, context, to: display.rowHref(notification) ?? '/notifications', actors: notification.actor ? [notification.actor] : [] }
}
function flushNotifications() {
  batchTimer = undefined
  const batch = pending
  pending = []
  if (!available()) return
  if (batch.length > 3) {
    const summarized = batch.slice(0, -2)
    push({ id: `batch-${++seq}`, kind: 'generic', title: `${formatCount(summarized.length)} new notifications`, context: 'More activity · Open notifications', to: '/notifications',
      notificationIDs: summarized.flatMap(toast => toast.notificationIDs ?? []), subjectPostIDs: summarized.flatMap(toast => toast.subjectPostIDs ?? []), boardThreadIDs: summarized.flatMap(toast => toast.boardThreadIDs ?? []) })
    for (const toast of batch.slice(-2)) push(toast)
  } else for (const toast of batch) push(toast)
}
function onNotification(payload: WsNotificationsNewPayload) {
  const notification = payload?.notification
  if (notification?.id && (notification.readAt || notification.ignoredAt)) { removeNotifications([notification.id]); return }
  if (!available() || payload.silent || !notification?.id || notification.kind === 'message'
    || notification.actor?.id === user.value?.id || notification.readAt || notification.ignoredAt) return
  const age = Date.now() - Date.parse(notification.createdAt)
  if (!Number.isFinite(age) || age > 15000 || age < -5000 || arrivals.has(notification.id)) return
  arrivals.add(notification.id)
  if (arrivals.size > 1000) arrivals.delete(arrivals.values().next().value!)
  pending = [...pending, notificationToast(notification)].slice(-20)
  if (!batchTimer) batchTimer = setTimeout(flushNotifications, 100)
}
function removeReadSubjects(payload: WsNotificationsUpdatedPayload) {
  const posts = new Set(payload.clearedPostIds ?? [])
  const threads = new Set(payload.clearedBoardThreadIds ?? [])
  const matches = (toast: ActivityToast) => toast.subjectPostIDs?.some(id => posts.has(id)) || toast.boardThreadIDs?.some(id => threads.has(id))
  pending = pending.filter(toast => !matches(toast))
  for (const toast of toasts.value) if (matches(toast)) dismiss(toast.id)
}
function removeNotifications(ids: string[]) {
  const removed = new Set(ids.map(id => `notification-${id}`))
  pending = pending.filter(toast => !removed.has(toast.id))
  for (const toast of toasts.value) if (removed.has(toast.id) || toast.notificationIDs?.some(id => ids.includes(id))) dismiss(toast.id)
}
usePresenceCallback('FollowedOnline', { onFollowedOnline: payload => presence(payload, true), onFollowedOffline: payload => presence(payload, false) })
usePresenceCallback('Notifications', { onNew: onNotification, onDeleted: payload => removeNotifications(payload.notificationIds ?? []), onUpdated: removeReadSubjects })
watch(reads.notifications, items => removeNotifications(items.flatMap(item => item.type === 'single' && (item.notification.readAt || item.notification.ignoredAt) ? [item.notification.id] : [])))
watch(() => user.value?.id, () => clearAll(true), { flush: 'sync' })
watch([room, popupsPaused, incoming], () => { if (!available()) clearAll() })
watch(() => route.path, path => { if (path === '/map') for (const toast of toasts.value) if (toast.kind.startsWith('presence-')) dismiss(toast.id) })
function dismissIfUnavailable() { if (!available()) clearAll() }
let unsubscribe: (() => void) | undefined
onMounted(() => {
  document.addEventListener('visibilitychange', dismissIfUnavailable)
  unsubscribe = mediaFocus.subscribe(dismissIfUnavailable)
})
onBeforeUnmount(() => {
  clearAll()
  document.removeEventListener('visibilitychange', dismissIfUnavailable)
  unsubscribe?.()
})
</script>

<style scoped>
/* Figma activity master 1457:2904; motion timeline 1458:3346. */
.moh-activity-stack { width: 352px; }
.moh-activity-card { width: 352px; min-height: 80px; background: var(--moh-surface-2); box-shadow: 0 6px 20px rgb(0 0 0 / 10%); }
@supports (backdrop-filter: blur(12px)) {
  .moh-activity-card { background: color-mix(in srgb, var(--moh-surface-2) 92%, transparent); backdrop-filter: blur(12px); }
}
.moh-activity-enter-active, .moh-activity-move { transition: transform 280ms cubic-bezier(.2,.8,.2,1), opacity 280ms cubic-bezier(.2,.8,.2,1); }
.moh-activity-enter-from { transform: translateX(-32px); opacity: 0; }
.moh-activity-leave-active { position: absolute; transition: transform 180ms ease, opacity 180ms ease; }
.moh-activity-leave-to { transform: translateY(-6px); opacity: 0; }
@media (prefers-reduced-motion: reduce) {
  .moh-activity-enter-active, .moh-activity-leave-active { transition: opacity 120ms ease; }
  .moh-activity-move { transition: none; }
  .moh-activity-enter-from, .moh-activity-leave-to { transform: none; }
}
@media (prefers-reduced-transparency: reduce) {
  .moh-activity-card { background: var(--moh-surface-2); backdrop-filter: none; }
}
</style>
