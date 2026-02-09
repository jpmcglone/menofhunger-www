import { computed, isRef, ref, watch } from 'vue'
import { useUsersStore, type PublicUserEntity } from '~/composables/useUsersStore'

type MaybeRef<T> = T | { value: T }

/**
 * Overlay a user snapshot with the normalized users store, and seed the store from the snapshot.
 * Store values win so realtime updates propagate everywhere.
 */
export function useUserOverlay<T extends { id?: string | null }>(
  user: MaybeRef<T | null | undefined>,
) {
  const src = isRef(user) ? (user as any) : ref(user as any)
  const users = useUsersStore()

  watch(
    () => src.value,
    (u) => {
      if (!u?.id) return
      users.upsert(u as any as Partial<PublicUserEntity>)
    },
    { immediate: true, deep: false },
  )

  const overlayed = computed(() => {
    const u = src.value
    if (!u) return u
    return users.overlay(u)
  })

  return { user: overlayed, upsert: users.upsert }
}

