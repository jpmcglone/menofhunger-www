import { computed, isRef, ref, watch, type Ref } from 'vue'
import { useUsersStore, type PublicUserEntity } from '~/composables/useUsersStore'

type MaybeRef<T> = T | { value: T }

/**
 * Overlay a user snapshot with the normalized users store, and seed the store from the snapshot.
 * Store values win so realtime updates propagate everywhere.
 */
export function useUserOverlay<T extends { id?: string | null } | null | undefined>(
  user: MaybeRef<T>,
) {
  const src = (isRef(user) ? user : ref(user)) as Ref<T>
  const users = useUsersStore()

  watch(
    () => src.value,
    (u) => {
      if (!u?.id) return
      // seed, not upsert: a stale embedded snapshot (e.g. a KeepAlive'd feed row) must never
      // overwrite a fresher value already written by realtime or a post-save upsert.
      users.seed(u as Partial<PublicUserEntity>)
    },
    { immediate: true, deep: false },
  )

  const overlayed = computed<T>(() => {
    const u = src.value
    if (!u) return u
    return users.overlay(u) as T
  })

  return { user: overlayed, upsert: users.upsert }
}

