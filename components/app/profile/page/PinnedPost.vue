<template>
  <!-- Pinned post -->
  <div v-if="showPinnedPost" class="mt-3 mb-4">
    <ClientOnly>
      <template #fallback>
        <div class="min-h-0" aria-hidden="true" />
      </template>
      <template v-if="pinnedPostForDisplay">
        <div class="flex flex-col gap-0">
          <div class="flex flex-wrap items-center justify-between gap-2 px-4 pt-0 pb-1">
            <NuxtLink
              v-if="pinnedReplyToUsername"
              :to="`/p/${pinnedPostForDisplay.id}`"
              class="text-sm text-gray-500 hover:underline dark:text-gray-400"
            >
              Replying to @{{ pinnedReplyToUsername }}
              <span class="ml-1 text-xs opacity-80">View thread</span>
            </NuxtLink>
            <span v-else class="flex-1" />
            <span
              :class="['rounded border px-2 py-0.5 text-[11px] font-semibold', pinnedBadgeClasses(pinnedPostForDisplay.visibility)]"
            >
              Pinned
            </span>
          </div>
          <div
            :class="['rounded-none overflow-hidden', postHighlightClasses(pinnedPostForDisplay.visibility)]"
          >
            <AppFeedPostRow :post="pinnedPostForDisplay" :show-collapsed-replies-footer="false" @deleted="onPinnedPostDeleted" @edited="onProfilePostEdited" />
          </div>
        </div>
      </template>
      <div v-else class="min-h-0" aria-hidden="true" />
    </ClientOnly>
  </div>

  <!-- Block indicator: shown when a block exists between viewer and profile user -->
  <div v-if="!isSelf && isBlockedWithProfile" class="px-4 mb-2">
    <div class="flex items-start gap-3 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3.5 text-sm text-zinc-300">
      <Icon name="tabler:ban" class="mt-0.5 shrink-0 text-zinc-400" aria-hidden="true" />
      <div class="min-w-0 flex-1">
        <template v-if="viewerHasBlockedProfile">
          <span class="font-semibold text-white">You've blocked {{ profileBlockHandle }}.</span>
          They can view your posts but can't engage with them. You can view their posts but can't engage with theirs.
        </template>
        <template v-else>
          <span class="font-semibold text-white">{{ profileBlockHandle }} has blocked you.</span>
          You can view their posts but can't engage with them.
        </template>
      </div>
      <button
        v-if="viewerHasBlockedProfile"
        type="button"
        class="shrink-0 text-xs font-semibold text-zinc-300 underline underline-offset-2 hover:text-white"
        :disabled="blockingProfile"
        @click="openBannerUnblockConfirm"
      >
        Unblock
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { postHighlightClasses } from '~/utils/post-visibility'
import { useProfilePageContext } from '~/composables/pages/profile/useProfilePage'

const {
  showPinnedPost,
  pinnedPostForDisplay,
  pinnedReplyToUsername,
  pinnedBadgeClasses,
  onPinnedPostDeleted,
  onProfilePostEdited,
  isSelf,
  isBlockedWithProfile,
  viewerHasBlockedProfile,
  profileBlockHandle,
  blockingProfile,
  openBannerUnblockConfirm,
} = useProfilePageContext()
</script>

