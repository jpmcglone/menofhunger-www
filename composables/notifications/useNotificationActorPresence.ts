import type { Ref } from 'vue'
import type { NotificationFeedItem } from '~/types/api'

/** Presence: subscribe to notification actors so avatars show online/offline (works after hard refresh). */
export function useNotificationActorPresence(notifications: Ref<NotificationFeedItem[]>) {
  const { addInterest, removeInterest } = usePresence()
  const notificationActorIds = computed(() => {
    const ids = new Set<string>()
    for (const item of notifications.value) {
      if (item.type === 'single') {
        const id = item.notification.actor?.id
        if (id) ids.add(id)
        continue
      }
      if (item.type === 'group') {
        for (const a of item.group.actors ?? []) {
          const id = a?.id
          if (id) ids.add(id)
        }
      }
    }
    return [...ids]
  })
  const presenceAddedIds = ref<Set<string>>(new Set())
  watch(
    notificationActorIds,
    (newIds) => {
      const added = presenceAddedIds.value
      const toRemove = [...added].filter((id) => !newIds.includes(id))
      const toAdd = newIds.filter((id) => !added.has(id))
      if (toRemove.length) {
        removeInterest(toRemove)
        toRemove.forEach((id) => added.delete(id))
      }
      if (toAdd.length) {
        addInterest(toAdd)
        toAdd.forEach((id) => added.add(id))
      }
    },
    { immediate: true },
  )
  onBeforeUnmount(() => {
    const added = [...presenceAddedIds.value]
    if (added.length) removeInterest(added)
  })

  return { notificationActorIds, presenceAddedIds }
}
