<template>
  <div
    :class="[
      'relative flex transition-colors',
      rollup.readAt ? '' : 'bg-gray-50/80 dark:bg-zinc-900/40',
    ]"
  >
    <!-- Column 1: unread indicator bar -->
    <div
      :class="[
        'shrink-0 self-stretch origin-left',
        rollup.readAt ? 'w-0 opacity-0 mr-0' : 'w-1 opacity-100 mr-4',
        'bg-gray-500',
      ]"
      aria-hidden="true"
    />

    <!-- Column 2 -->
    <div :class="['flex min-w-0 flex-1 gap-4 ml-1', rollup.readAt ? 'px-4 py-4' : 'pr-4 py-4']">
      <div class="min-w-0 flex-1">
        <!-- Top line: avatars (no overlap) + time -->
        <div class="flex items-start justify-between gap-4">
          <div ref="avatarsEl" class="min-w-0 flex-1 flex flex-wrap items-center gap-3" @click.stop>
            <!-- type icon (no circle, no overlap) -->
            <Icon
              name="tabler:file-text"
              class="h-6.5 w-6.5 text-gray-500 dark:text-gray-400 shrink-0"
              aria-hidden="true"
            />

            <template v-for="a in visibleActors" :key="a.id">
              <NuxtLink
                v-if="a.username"
                :to="`/u/${a.username}`"
                class="block"
                @click.stop
              >
                <AppUserAvatar
                  :user="{ id: a.id, username: a.username, name: a.name, avatarUrl: a.avatarUrl }"
                  size-class="h-10 w-10"
                />
              </NuxtLink>
              <AppUserAvatar
                v-else
                :user="{ id: a.id, username: a.username, name: a.name, avatarUrl: a.avatarUrl }"
                size-class="h-10 w-10"
              />
            </template>
          </div>

          <div class="shrink-0 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
            <ClientOnly>
              <template #fallback>
                <span aria-hidden="true">&nbsp;</span>
              </template>
              {{ formatWhen(rollup.createdAt) }}
            </ClientOnly>
          </div>
        </div>

        <!-- Message under avatars -->
        <div class="mt-2 min-w-0" :style="{ paddingLeft: `${messageIndentPx}px` }">
          <div :class="['min-w-0 max-w-full line-clamp-2 text-sm', rollup.readAt ? 'font-medium' : 'font-semibold']">
            <span class="text-gray-600 dark:text-gray-300 font-medium">New posts by</span>
            <span class="ml-1 inline-flex items-center gap-1">
              <span class="truncate">{{ firstActorLabel }}</span>
              <AppVerifiedBadge
                v-if="firstActorHasBadge"
                :status="firstActorVerifiedStatus"
                :premium="Boolean(firstActor?.premium)"
                :is-organization="Boolean(firstActor?.isOrganization)"
                size="xs"
                :show-tooltip="false"
              />
            </span>
            <span v-if="moreActorCount > 0" class="ml-1">
              and {{ moreActorCount }} {{ moreActorCount === 1 ? 'other' : 'others' }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { FollowedPostsRollup, NotificationActor } from '~/types/api'

const { formatWhen } = useNotifications()

const props = defineProps<{
  rollup: FollowedPostsRollup
}>()

const rollup = computed(() => props.rollup)

const firstActor = computed<NotificationActor | null>(() => rollup.value.actors?.[0] ?? null)
const firstActorLabel = computed(() => {
  const a = firstActor.value
  if (!a) return 'someone'
  return (a.name ?? '').trim() || (a.username ?? '').trim() || 'someone'
})
const firstActorVerifiedStatus = computed(() => {
  const a = firstActor.value as any
  return (a?.verifiedStatus ?? 'none') as 'none' | 'identity' | 'manual'
})
const firstActorHasBadge = computed(() => {
  const a = firstActor.value as any
  const vs = (a?.verifiedStatus ?? 'none') as string
  return Boolean((vs && vs !== 'none') || a?.isOrganization)
})
const moreActorCount = computed(() => Math.max(0, Math.floor((rollup.value.actorCount ?? 0) - 1)))

const avatarsEl = ref<HTMLElement | null>(null)
const maxVisibleAvatars = ref(8)
const messageIndentPx = 26 + 12 // iconPx + gapPx (matches avatar row)

function recomputeMaxVisibleAvatars() {
  const el = avatarsEl.value
  if (!el) return
  // Approximate capacity: each avatar is 40px, gap-3 is 12px, plus a leading icon.
  const avatarPx = 40
  const gapPx = 12
  const iconPx = 26 // matches h-6.5/w-6.5 (Tailwind = 1.625rem)
  const w = Math.max(0, el.clientWidth - (iconPx + gapPx))
  const capacity = Math.max(1, Math.floor((w + gapPx) / (avatarPx + gapPx)))
  // If we need an overflow pill, reserve a slot for it.
  maxVisibleAvatars.value = Math.max(1, capacity)
}

onMounted(() => {
  recomputeMaxVisibleAvatars()
  const el = avatarsEl.value
  if (!el) return

  let ro: ResizeObserver | null = null
  if (typeof ResizeObserver !== 'undefined') {
    ro = new ResizeObserver(() => recomputeMaxVisibleAvatars())
    ro.observe(el)
  } else {
    const onResize = () => recomputeMaxVisibleAvatars()
    window.addEventListener('resize', onResize, { passive: true })
    onBeforeUnmount(() => window.removeEventListener('resize', onResize))
  }
  onBeforeUnmount(() => ro?.disconnect())
  requestAnimationFrame(() => recomputeMaxVisibleAvatars())
})

const visibleActors = computed(() => {
  const actors = rollup.value.actors ?? []
  const cap = Math.max(1, Math.floor(maxVisibleAvatars.value))
  return actors.slice(0, cap)
})
</script>

