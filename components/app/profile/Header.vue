<template>
  <div>
    <!-- Full-bleed profile header (cancel app layout padding) -->
    <div class="-mx-4 -mt-4 relative">
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

    <div class="mx-auto max-w-3xl pb-5 pt-16">
      <div class="flex items-start justify-between gap-4 mt-1">
        <div class="min-w-0">
          <div class="flex items-center gap-2 min-w-0">
            <div class="text-2xl font-bold leading-none text-gray-900 dark:text-gray-50 truncate">
              {{ profileName }}
            </div>
            <AppVerifiedBadge :status="profile?.verifiedStatus" :premium="profile?.premium" />
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

        <div class="shrink-0">
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
        </div>
      </div>

      <div v-if="showFollowCounts" class="mt-4 flex items-center gap-4 text-sm text-gray-600 dark:text-gray-300">
        <button type="button" class="hover:underline" @click="emit('openFollowers')">
          <span class="font-semibold text-gray-900 dark:text-gray-50 tabular-nums">{{ followerCount ?? 0 }}</span>
          Followers
        </button>
        <button type="button" class="hover:underline" @click="emit('openFollowing')">
          <span class="font-semibold text-gray-900 dark:text-gray-50 tabular-nums">{{ followingCount ?? 0 }}</span>
          Following
        </button>
      </div>

      <div v-if="profile?.bio" class="mt-4 whitespace-pre-wrap text-gray-800 dark:text-gray-200">
        {{ profile.bio }}
      </div>
      <div v-else class="mt-4 text-sm text-gray-500 dark:text-gray-400">
        No bio yet.
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { FollowRelationship } from '~/types/api'

type PublicProfile = {
  id: string
  username: string | null
  name: string | null
  bio: string | null
  premium: boolean
  verifiedStatus: 'none' | 'identity' | 'manual'
  avatarUrl?: string | null
  bannerUrl?: string | null
}

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

const { user: authUser } = useAuth()
const isAuthed = computed(() => Boolean(authUser.value?.id))

const { addInterest, removeInterest } = usePresence()
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
</script>

