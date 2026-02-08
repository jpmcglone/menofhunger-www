<template>
  <div class="-mt-4">
    <!-- Full-bleed profile header (cancel app layout padding) -->
    <div class="relative">
      <div class="group relative aspect-[3/1] w-full bg-gray-200 dark:bg-zinc-900">
        <img
          v-if="profileBannerUrl"
          v-show="!hideBannerThumb"
          :src="profileBannerUrl"
          alt=""
          class="h-full w-full object-cover"
          loading="lazy"
          decoding="async"
        >
        <div
          v-if="profileBannerUrl"
          v-show="!hideBannerThumb"
          class="pointer-events-none absolute inset-0 bg-black/0 transition-colors duration-200 group-hover:bg-black/20"
          aria-hidden="true"
        />
        <button
          v-if="profileBannerUrl"
          v-show="!hideBannerThumb"
          type="button"
          class="absolute inset-0 cursor-zoom-in"
          aria-label="View banner"
          @click="emit('openImage', { event: $event, url: profileBannerUrl, title: 'Banner', kind: 'banner' })"
        />
        <div
          v-if="showLastOnline"
          v-tooltip.bottom="tinyTooltip(lastOnlineTooltip)"
          class="absolute right-4 bottom-0 translate-y-[36px] rounded-full bg-white/70 px-2 py-0.5 text-[11px] text-gray-600 shadow-sm backdrop-blur-sm dark:bg-black/60 dark:text-gray-400 tabular-nums"
        >
          Last online {{ lastOnlineShort }}
        </div>
      </div>

      <div
        :class="[
          'absolute left-4 bottom-0 translate-y-1/2 transition-opacity duration-200',
          hideAvatarDuringBanner ? 'opacity-0 pointer-events-none' : 'opacity-100'
        ]"
      >
        <div class="group relative ring-4 ring-white dark:ring-black rounded-full">
          <AppUserAvatar
            v-show="!hideAvatarThumb"
            :user="profile"
            size-class="h-28 w-28"
            bg-class="bg-gray-200 dark:bg-zinc-800"
            :presence-scale="0.15"
            :presence-inset-ratio="0.25"
          />
          <div
            v-if="profileAvatarUrl"
            v-show="!hideAvatarThumb"
            class="pointer-events-none absolute inset-0 rounded-full bg-black/0 transition-colors duration-200 group-hover:bg-black/20"
            aria-hidden="true"
          />
          <button
            v-if="profileAvatarUrl"
            v-show="!hideAvatarThumb"
            type="button"
            class="absolute inset-0 cursor-zoom-in"
            aria-label="View avatar"
            @click="emit('openImage', { event: $event, url: profileAvatarUrl, title: 'Avatar', kind: 'avatar' })"
          />
        </div>
      </div>
    </div>

    <div class="mx-auto max-w-3xl px-4 pb-5 pt-16">
      <div class="flex items-start justify-between gap-4 mt-1">
        <div class="min-w-0">
          <div class="flex items-center gap-2 min-w-0">
            <div class="text-2xl font-bold leading-none text-gray-900 dark:text-gray-50 truncate">
              {{ profileName }}
            </div>
            <AppVerifiedBadge
              :status="profile?.verifiedStatus"
              :premium="profile?.premium"
              :premium-plus="profile?.premiumPlus"
            />
          </div>
          <div class="mt-1 text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
            <div class="truncate">
              @{{ profile?.username }}
            </div>
            <span
              v-if="relationshipTagLabel"
              class="shrink-0 inline-flex items-center rounded-md bg-gray-200/70 px-2.5 py-1 text-[10px] font-semibold leading-none text-gray-800 dark:bg-zinc-800/80 dark:text-zinc-200"
            >
              {{ relationshipTagLabel }}
            </span>
          </div>
        </div>

        <div class="shrink-0 flex items-center gap-2">
          <Button
            v-if="isSelf"
            label="Edit profile"
            icon="pi pi-pencil"
            severity="secondary"
            rounded
            @click="emit('edit')"
          />
          <AppFollowButton
            v-else-if="isAuthed && profile?.id"
            :user-id="profile.id"
            :username="profile.username"
            :initial-relationship="followRelationship"
            @followed="emit('followed')"
            @unfollowed="emit('unfollowed')"
          />
          <Button
            v-if="canOpenMenu"
            type="button"
            icon="pi pi-ellipsis-v"
            severity="secondary"
            rounded
            text
            aria-label="More"
            @click="toggleMenu"
          />
        </div>
      </div>

      <div v-if="showFollowCounts" class="mt-4 flex items-center gap-4 text-sm text-gray-600 dark:text-gray-300">
        <button type="button" class="hover:underline" @click="emit('openFollowing')">
          <span class="font-semibold text-gray-900 dark:text-gray-50 tabular-nums">{{ followingCount ?? 0 }}</span>
          <span class="ml-1 text-gray-600 dark:text-gray-400">Following</span>
        </button>
        <button type="button" class="hover:underline" @click="emit('openFollowers')">
          <span class="font-semibold text-gray-900 dark:text-gray-50 tabular-nums">{{ followerCountN }}</span>
          <span class="ml-1 text-gray-600 dark:text-gray-400">{{ followerLabel }}</span>
        </button>
      </div>

      <div v-if="profile?.bio" class="mt-4 whitespace-pre-wrap break-words text-gray-800 dark:text-gray-200">
        {{ profile.bio }}
      </div>
      <div v-else class="mt-4 text-sm text-gray-500 dark:text-gray-400">
        No bio yet.
      </div>
    </div>
  </div>

  <Menu v-if="canOpenMenu" ref="menuRef" :model="menuItems" popup />

  <AppReportDialog
    v-model:visible="reportOpen"
    target-type="user"
    :subject-user-id="profile?.id ?? null"
    :subject-label="profile?.username ? `@${profile.username}` : 'User'"
    @submitted="onReportSubmitted"
  />
</template>

<script setup lang="ts">
import AppImg from '~/components/app/AppImg.vue'
import type { FollowRelationship, PublicProfile } from '~/types/api'
import { formatDateTime, formatListTime } from '~/utils/time-format'
import { tinyTooltip } from '~/utils/tiny-tooltip'
import type { MenuItem } from 'primevue/menuitem'

const props = defineProps<{
  profile: PublicProfile | null
  profileName: string
  profileAvatarUrl: string | null
  profileBannerUrl: string | null
  hideBannerThumb: boolean
  hideAvatarThumb: boolean
  hideAvatarDuringBanner: boolean
  relationshipTagLabel: string | null
  isSelf: boolean
  followRelationship: FollowRelationship | null
  showFollowCounts: boolean
  followerCount: number | null
  followingCount: number | null
}>()

const emit = defineEmits<{
  (e: 'openImage', payload: { event: MouseEvent; url: string; title: string; kind: 'avatar' | 'banner' }): void
  (e: 'edit'): void
  (e: 'followed'): void
  (e: 'unfollowed'): void
  (e: 'openFollowers'): void
  (e: 'openFollowing'): void
}>()

const profile = computed(() => props.profile ?? null)
const profileName = computed(() => props.profileName)
const profileAvatarUrl = computed(() => props.profileAvatarUrl ?? null)
const profileBannerUrl = computed(() => props.profileBannerUrl ?? null)
const relationshipTagLabel = computed(() => props.relationshipTagLabel ?? null)
const isSelf = computed(() => Boolean(props.isSelf))
const followRelationship = computed(() => props.followRelationship ?? null)
const showFollowCounts = computed(() => Boolean(props.showFollowCounts))
const followerCount = computed(() => props.followerCount ?? null)
const followingCount = computed(() => props.followingCount ?? null)
const hideBannerThumb = computed(() => Boolean(props.hideBannerThumb))
const hideAvatarThumb = computed(() => Boolean(props.hideAvatarThumb))
const hideAvatarDuringBanner = computed(() => Boolean(props.hideAvatarDuringBanner))

const followerCountN = computed(() => Math.max(0, Math.floor(props.followerCount ?? 0)))
const followerLabel = computed(() => (followerCountN.value === 1 ? 'Follower' : 'Followers'))

const { user: authUser } = useAuth()
const isAuthed = computed(() => Boolean(authUser.value?.id))

const canOpenMenu = computed(() => {
  if (!isAuthed.value) return false
  if (isSelf.value) return false
  return Boolean(profile.value?.id)
})

const reportOpen = ref(false)
const menuRef = ref()

const menuItems = computed<MenuItem[]>(() => {
  if (!canOpenMenu.value) return []
  return [
    {
      label: 'Report user',
      icon: 'pi pi-flag',
      command: () => {
        reportOpen.value = true
      },
    },
  ]
})

function toggleMenu(event: Event) {
  // PrimeVue Menu expects the click event to position the popup.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(menuRef.value as any)?.toggle(event)
}

function onReportSubmitted() {
  // toast + close handled in dialog
}

const { addInterest, removeInterest, getPresenceStatus, isPresenceKnown } = usePresence()
const lastProfileId = ref<string | null>(null)
watch(
  () => profile.value?.id ?? null,
  (profileId) => {
    if (!import.meta.client) return
    const prev = lastProfileId.value
    if (prev && prev !== profileId) removeInterest([prev])
    lastProfileId.value = profileId ?? null
    if (profileId) addInterest([profileId])
  },
  { immediate: true },
)
onBeforeUnmount(() => {
  const id = lastProfileId.value
  if (id) removeInterest([id])
})

const presenceStatus = computed(() => {
  const id = profile.value?.id
  if (!id) return 'offline'
  return getPresenceStatus(id)
})

const showLastOnline = computed(() => {
  if (presenceStatus.value !== 'offline') return false
  if (!profile.value?.id || !isPresenceKnown(profile.value.id)) return false
  return Boolean(profile.value?.lastOnlineAt)
})

const lastOnlineShort = computed(() => {
  const iso = profile.value?.lastOnlineAt ?? null
  const t = formatListTime(iso)
  if (t === 'now') return '<1m ago'
  if (/^\d+[mhd]$/.test(t)) return `${t} ago`
  return t
})

const lastOnlineTooltip = computed(() => {
  const iso = profile.value?.lastOnlineAt ?? null
  if (!iso) return null
  return formatDateTime(iso, { dateStyle: 'medium', timeStyle: 'short' })
})
</script>

