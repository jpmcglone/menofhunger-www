<template>
  <Teleport to="body">
    <Transition name="moh-follow-online">
      <div
        v-if="toast"
        :key="toast.id"
        class="moh-follow-online-toast pointer-events-auto fixed left-3 right-3 z-[var(--moh-z-toast)] sm:right-auto sm:w-[22rem] md:left-6"
        role="status"
        aria-live="polite"
      >
        <div class="flex items-center gap-3 rounded-2xl border moh-border bg-[var(--moh-surface-2)] py-2.5 pl-3 pr-2 shadow-lg">
          <NuxtLink :to="toast.to" class="moh-focus flex min-w-0 flex-1 items-center gap-3 rounded-xl" @click="dismiss">
            <span class="flex shrink-0 -space-x-2">
              <AppUserAvatar
                v-for="u in toast.users"
                :key="u.id"
                :user="u"
                size-class="h-9 w-9"
                class="ring-2 ring-[var(--moh-surface-2)] rounded-full"
                :enable-preview="false"
                :show-status="false"
              />
            </span>
            <span class="min-w-0">
              <span class="block truncate text-sm font-semibold moh-text">{{ toast.title }}</span>
              <span class="mt-0.5 flex items-center gap-1.5 text-xs font-medium text-[var(--moh-online)]">
                <span class="h-1.5 w-1.5 rounded-full bg-[var(--moh-online)]" aria-hidden="true" />
                {{ toast.subtitle }}
              </span>
            </span>
          </NuxtLink>
          <button
            type="button"
            class="moh-focus inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full moh-text-muted hover:bg-[var(--moh-surface-hover)]"
            aria-label="Dismiss"
            @click="dismiss"
          >
            <Icon name="tabler:x" class="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { formatCount } from '~/utils/number-format'
import { usePresenceCallback } from '~/composables/presence/usePresenceCallback'
import type { FollowedOnlineCallback } from '~/composables/presence/types'
import type { PresenceFollowedOnlinePayloadDto } from '~/types/api-contracts.gen'

const VISIBLE_MS = 6000

type FollowOnlineToast = {
  id: number
  users: PresenceFollowedOnlinePayloadDto['users']
  title: string
  subtitle: string
  to: string
}

const route = useRoute()
const chimes = usePresenceChimes()

const toast = ref<FollowOnlineToast | null>(null)
let seq = 0
let hideTimer: ReturnType<typeof setTimeout> | null = null

function displayName(u: PresenceFollowedOnlinePayloadDto['users'][number]): string {
  return (u.name || '').trim() || (u.username ? `@${u.username}` : 'Someone')
}

function dismiss() {
  if (hideTimer) clearTimeout(hideTimer)
  hideTimer = null
  toast.value = null
}

function show(payload: PresenceFollowedOnlinePayloadDto) {
  const users = (payload.users ?? []).filter(u => Boolean(u?.username))
  if (!users.length) return
  // The map page has its own presence moments; don't double up there.
  if (route.path === '/map') return

  const first = users[0]!
  const others = Math.max(0, (payload.total ?? users.length) - 1)
  const title = others > 0
    ? `${displayName(first)} and ${formatCount(others)} ${others === 1 ? 'other' : 'others'} are online`
    : `${displayName(first)} is online`

  seq += 1
  toast.value = {
    id: seq,
    users: users.slice(0, 3),
    title,
    subtitle: others > 0 ? 'People you follow' : 'Someone you follow',
    to: others > 0 ? '/online' : `/u/${encodeURIComponent(first.username!)}`,
  }
  chimes.play('follow')

  if (hideTimer) clearTimeout(hideTimer)
  hideTimer = setTimeout(dismiss, VISIBLE_MS)
}

const callback: FollowedOnlineCallback = { onFollowedOnline: show }

usePresenceCallback('FollowedOnline', callback)
onBeforeUnmount(() => {
  if (hideTimer) clearTimeout(hideTimer)
})
</script>

<style scoped>
.moh-follow-online-toast {
  bottom: calc(var(--moh-tabbar-height, 4.5rem) + var(--moh-safe-bottom, 0px) + 0.75rem);
}

@media (min-width: 768px) {
  .moh-follow-online-toast {
    bottom: calc(var(--moh-safe-bottom, 0px) + 1.5rem);
  }
}

.moh-follow-online-enter-active,
.moh-follow-online-leave-active {
  transition: opacity 220ms ease, transform 260ms cubic-bezier(0.2, 0.8, 0.2, 1);
}

.moh-follow-online-enter-from,
.moh-follow-online-leave-to {
  opacity: 0;
  transform: translateY(12px) scale(0.98);
}

@media (prefers-reduced-motion: reduce) {
  .moh-follow-online-enter-active,
  .moh-follow-online-leave-active {
    transition: opacity 150ms ease;
  }

  .moh-follow-online-enter-from,
  .moh-follow-online-leave-to {
    transform: none;
  }
}
</style>
