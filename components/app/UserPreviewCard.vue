<template>
  <div class="overflow-hidden rounded-2xl border bg-white shadow-xl moh-card-matte dark:bg-black dark:border-zinc-800">
    <div class="relative">
      <div class="relative aspect-[3/1] w-full bg-gray-200 dark:bg-zinc-900">
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
        <div class="rounded-full ring-4 ring-white dark:ring-black">
          <NuxtLink
            v-if="profilePath"
            :to="profilePath"
            :aria-label="`View @${user.username} profile`"
            class="block"
            @click="onNavigate"
          >
            <AppUserAvatar
              :user="user"
              size-class="h-16 w-16"
              bg-class="bg-gray-200 dark:bg-zinc-800"
              :enable-preview="false"
              :presence-scale="0.22"
              :presence-inset-ratio="0.4"
            />
          </NuxtLink>
          <AppUserAvatar
            v-else
            :user="user"
            size-class="h-16 w-16"
            bg-class="bg-gray-200 dark:bg-zinc-800"
            :enable-preview="false"
            :presence-scale="0.22"
            :presence-inset-ratio="0.4"
          />
        </div>
      </div>
    </div>

    <div class="px-4 pb-4 pt-12">
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <div class="flex items-center gap-2 min-w-0">
            <NuxtLink
              v-if="profilePath"
              :to="profilePath"
              class="min-w-0 font-bold text-gray-900 dark:text-gray-50 truncate hover:underline underline-offset-2"
              :aria-label="`View @${user.username} profile`"
              @click="onNavigate"
            >
              {{ displayName }}
            </NuxtLink>
            <div v-else class="min-w-0 font-bold text-gray-900 dark:text-gray-50 truncate">
              {{ displayName }}
            </div>
            <AppVerifiedBadge :status="user.verifiedStatus" :premium="user.premium" :premium-plus="user.premiumPlus" />
          </div>

          <NuxtLink
            v-if="profilePath"
            :to="profilePath"
            class="mt-0.5 block text-sm text-gray-500 dark:text-gray-400 truncate hover:underline underline-offset-2"
            :aria-label="`View @${user.username} profile`"
            @click="onNavigate"
          >
            @{{ user.username }}
          </NuxtLink>
          <div v-else class="mt-0.5 text-sm text-gray-500 dark:text-gray-400 truncate">
            @{{ user.username }}
          </div>
        </div>

        <div class="shrink-0 pt-0.5">
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
        class="mt-3 text-sm whitespace-pre-wrap break-words text-gray-800 dark:text-gray-200 max-h-[4.5rem] overflow-hidden"
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

const props = defineProps<{
  user: UserPreview
}>()

const user = computed(() => props.user)

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

