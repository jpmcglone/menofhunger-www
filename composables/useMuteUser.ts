import type { Ref } from 'vue'

/**
 * Profile-level mute. Muting removes the person's posts from the viewer's feed
 * and Board and stops their notifications; their profile stays visitable.
 * State is optimistic and rolls back when the request fails.
 */
export function useMuteUser(opts: {
  userId: Ref<string | null | undefined>
  username: Ref<string | null | undefined>
  initialMuted: Ref<boolean | null | undefined>
}) {
  const { apiFetch } = useApiClient()
  const toast = useAppToast()

  const muted = ref(Boolean(opts.initialMuted.value))
  const pending = ref(false)

  watch(
    () => [opts.userId.value, opts.initialMuted.value] as const,
    ([, initial]) => {
      if (!pending.value) muted.value = Boolean(initial)
    },
  )

  const handle = computed(() => (opts.username.value ? `@${opts.username.value}` : 'this user'))

  async function toggle() {
    const userId = opts.userId.value
    if (!userId || pending.value) return
    const next = !muted.value
    muted.value = next
    pending.value = true
    try {
      if (next) {
        await apiFetch('/mutes', { method: 'POST', body: { user_id: userId } })
      } else {
        await apiFetch(`/mutes/${encodeURIComponent(userId)}`, { method: 'DELETE' })
      }
      toast.push({ title: `${next ? 'Muted' : 'Unmuted'} ${handle.value}`, tone: 'success', durationMs: 2000 })
    } catch (e: unknown) {
      muted.value = !next
      toast.pushError(e, next ? 'Couldn’t mute.' : 'Couldn’t unmute.')
    } finally {
      pending.value = false
    }
  }

  return { muted, pending, toggle }
}
