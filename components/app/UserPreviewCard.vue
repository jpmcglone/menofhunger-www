<template>
  <div class="overflow-hidden rounded-2xl moh-popover moh-card-matte">
    <div class="relative">
      <div class="relative aspect-[3/1] w-full moh-surface">
        <img
          v-if="user.bannerUrl"
          :src="user.bannerUrl"
          alt=""
          class="h-full w-full object-cover"
          loading="lazy"
          decoding="async"
        >
      </div>

      <div class="absolute left-4 bottom-0 translate-y-1/2">
        <div class="rounded-full ring-4 ring-[color:var(--moh-surface-3)]">
          <NuxtLink
            v-if="profilePath"
            :to="profilePath"
            :aria-label="`View @${user.username} profile`"
            class="block moh-focus rounded-full"
            @click="onNavigate"
          >
            <AppUserAvatar
              :user="user"
              size-class="h-16 w-16"
              bg-class="moh-surface"
              :enable-preview="false"
              :presence-scale="0.22"
              :presence-inset-ratio="0.4"
            />
          </NuxtLink>
          <AppUserAvatar
            v-else
            :user="user"
            size-class="h-16 w-16"
            bg-class="moh-surface"
            :enable-preview="false"
            :presence-scale="0.22"
            :presence-inset-ratio="0.4"
          />
        </div>
      </div>
    </div>

    <div class="px-4 pb-4 pt-12">
      <!-- Online / last-online pill: right below the banner -->
      <div v-if="user.id && (showOnlineNow || showLastOnline)" class="flex justify-end -mt-10 mb-3">
        <div
          v-tooltip.bottom="showLastOnline ? tinyTooltip(lastOnlineTooltip) : undefined"
          class="rounded-full px-2 py-0.5 text-[11px] shadow-sm backdrop-blur-sm"
          :class="
            showOnlineNow
              ? 'bg-green-600/90 text-white dark:bg-green-500/20 dark:text-green-200'
              : 'bg-white/70 text-gray-600 dark:bg-black/60 dark:text-gray-400 tabular-nums'
          "
        >
          <template v-if="showOnlineNow">
            Online now
          </template>
          <template v-else>
            Last online {{ lastOnlineShort }}
          </template>
        </div>
      </div>

      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <div class="flex items-center gap-2 min-w-0">
            <NuxtLink
              v-if="profilePath"
              :to="profilePath"
              class="min-w-0 truncate hover:underline underline-offset-2 font-bold moh-text moh-focus"
              :aria-label="`View @${user.username} profile`"
              @click="onNavigate"
            >
              {{ displayName }}
            </NuxtLink>
            <div v-else class="min-w-0 font-bold moh-text truncate">
              {{ displayName }}
            </div>
            <AppVerifiedBadge
              :status="user.verifiedStatus"
              :premium="user.premium"
              :premium-plus="user.premiumPlus"
              :steward-badge-enabled="user.stewardBadgeEnabled ?? true"
            />
          </div>

          <NuxtLink
            v-if="profilePath"
            :to="profilePath"
            class="mt-0.5 block moh-meta truncate hover:underline underline-offset-2 moh-focus"
            :aria-label="`View @${user.username} profile`"
            @click="onNavigate"
          >
            @{{ user.username }}
          </NuxtLink>
          <div v-else class="mt-0.5 moh-meta truncate">
            @{{ user.username }}
          </div>
        </div>

        <div class="shrink-0 pt-0.5 flex flex-col items-end">
          <AppFollowButton
            v-if="user.id"
            size="small"
            :user-id="user.id"
            :username="user.username"
            :initial-relationship="user.relationship"
            @confirm-opened="pop.lock()"
            @confirm-closed="pop.unlock()"
          />
        </div>
      </div>

      <div
        v-if="user.bio"
        class="mt-3 moh-body whitespace-pre-wrap break-words max-h-[4.5rem] overflow-hidden"
      >
        {{ user.bio }}
      </div>

      <div
        v-if="typeof user.followingCount === 'number' && typeof user.followerCount === 'number'"
        class="mt-3 flex items-center gap-4 text-sm text-gray-600 dark:text-gray-300"
      >
        <NuxtLink
          v-if="followingPath"
          :to="followingPath"
          class="tabular-nums hover:underline"
          aria-label="View following"
          @click="onNavigate"
        >
          <span class="font-semibold text-gray-900 dark:text-gray-50">{{ user.followingCount }}</span>
          <span class="ml-1 text-gray-600 dark:text-gray-400">Following</span>
        </NuxtLink>
        <div v-else class="tabular-nums">
          <span class="font-semibold text-gray-900 dark:text-gray-50">{{ user.followingCount }}</span>
          <span class="ml-1 text-gray-600 dark:text-gray-400">Following</span>
        </div>

        <NuxtLink
          v-if="followersPath"
          :to="followersPath"
          class="tabular-nums hover:underline"
          aria-label="View followers"
          @click="onNavigate"
        >
          <span class="font-semibold text-gray-900 dark:text-gray-50">{{ user.followerCount }}</span>
          <span class="ml-1 text-gray-600 dark:text-gray-400">Followers</span>
        </NuxtLink>
        <div v-else class="tabular-nums">
          <span class="font-semibold text-gray-900 dark:text-gray-50">{{ user.followerCount }}</span>
          <span class="ml-1 text-gray-600 dark:text-gray-400">Followers</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { UserPreview } from '~/types/api'
import { useUserOverlay } from '~/composables/useUserOverlay'
import { formatDateTime, formatListTime } from '~/utils/time-format'
import { tinyTooltip } from '~/utils/tiny-tooltip'

const props = defineProps<{
  user: UserPreview
}>()

const { user } = useUserOverlay(computed(() => props.user))

const { addInterest, removeInterest, getPresenceStatus, isPresenceKnown } = usePresence()
const lastUserId = ref<string | null>(null)
watch(
  () => user.value.id ?? null,
  (nextId) => {
    if (!import.meta.client) return
    const prev = lastUserId.value
    if (prev && prev !== nextId) removeInterest([prev])
    lastUserId.value = nextId ?? null
    if (nextId) addInterest([nextId])
  },
  { immediate: true },
)
onBeforeUnmount(() => {
  const id = lastUserId.value
  if (id) removeInterest([id])
})

const presenceStatus = computed(() => {
  const id = user.value.id
  if (!id) return 'offline'
  return getPresenceStatus(id)
})
const showOnlineNow = computed(() => presenceStatus.value !== 'offline')

const { user: authUser } = useAuth()
const viewerCanSeeLastOnline = computed(() => {
  const status = authUser.value?.verifiedStatus ?? 'none'
  return Boolean(authUser.value?.siteAdmin) || (typeof status === 'string' && status !== 'none')
})

const showLastOnline = computed(() => {
  if (!viewerCanSeeLastOnline.value) return false
  if (presenceStatus.value !== 'offline') return false
  if (!user.value.id || !isPresenceKnown(user.value.id)) return false
  return Boolean(user.value.lastOnlineAt)
})
const lastOnlineShort = computed(() => {
  const iso = user.value.lastOnlineAt ?? null
  const t = formatListTime(iso)
  if (t === 'now') return '<1m ago'
  if (/^\d+[mhd]$/.test(t)) return `${t} ago`
  return t
})
const lastOnlineTooltip = computed(() => {
  const iso = user.value.lastOnlineAt ?? null
  if (!iso) return null
  return formatDateTime(iso, { dateStyle: 'medium', timeStyle: 'short' })
})

const profilePath = computed(() => {
  const u = (user.value.username ?? '').trim()
  return u ? `/u/${encodeURIComponent(u)}` : null
})
const followersPath = computed(() => (profilePath.value ? `${profilePath.value}/followers` : null))
const followingPath = computed(() => (profilePath.value ? `${profilePath.value}/following` : null))

const displayName = computed(() => {
  const nm = (user.value.name ?? '').trim()
  if (nm) return nm
  const un = (user.value.username ?? '').trim()
  return un ? `@${un}` : 'User'
})

const pop = useUserPreviewPopover()
function onNavigate() {
  pop.close()
}
</script>

