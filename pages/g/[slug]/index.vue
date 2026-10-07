<template>
  <AppPageContent bottom="standard">
    <div class="w-full">
      <AppInlineAlert v-if="shellError" class="moh-gutter-x mt-3" severity="danger">
        {{ shellError }}
      </AppInlineAlert>

      <div v-if="shellLoading" class="flex justify-center py-16">
        <AppLogoLoader />
      </div>

      <template v-else-if="shell">
        <AppGroupProfileHeader
          :shell="shell"
          :is-member="isMember"
          :is-owner="isOwner"
          :can-edit="canEditGroup"
          :can-leave="canLeave"
          :cover-url="shell.coverImageUrl"
          :avatar-url="shell.avatarImageUrl"
          :join-busy="joinBusy"
          :leave-busy="leaveBusy"
          :cancel-busy="cancelBusy"
          :show-settings-link="false"
          :hide-banner-thumb="hideBannerThumb"
          :hide-avatar-thumb="hideAvatarThumb"
          :hide-avatar-during-banner="hideAvatarDuringBanner"
          :viewer-is-logged-in="isAuthed"
          :viewer-is-verified="isVerified"
          :focused="focusedNewActivity"
          @post="openGroupComposer"
          @join="doJoin"
          @leave="doLeave"
          @cancel-request="doCancelRequest"
          @edit="editOpen = true"
          @invite="inviteOpen = true"
          @open-image="onOpenGroupImage"
        />

        <AppGroupsEditGroupDialog
          v-model="editOpen"
          :shell="shell"
          :is-owner="isOwner"
          :is-admin-override="isAdminOverride"
          @updated="onGroupShellUpdated"
        />

        <AppGroupsInviteToGroupDialog
          v-if="isMod"
          v-model="inviteOpen"
          :shell="shell"
        />

        <!-- Soft attribution from personalized invite links (?from=username) -->
        <ClientOnly>
          <div
            v-if="invitedByUsername"
            class="moh-gutter-x py-3 border-b moh-border text-sm moh-text-muted"
          >
            Invited by
            <NuxtLink
              :to="`/u/${encodeURIComponent(invitedByUsername)}`"
              class="font-semibold moh-text hover:underline underline-offset-2"
            >
              @{{ invitedByUsername }}
            </NuxtLink>
          </div>
        </ClientOnly>

        <!-- Logged-out CTA -->
        <div v-if="!isAuthed" class="px-4 py-6 border-b moh-border">
          <div class="rounded-xl border moh-border bg-[var(--moh-surface-2)] px-5 py-6 text-center max-w-lg mx-auto">
            <p class="text-sm font-medium moh-text mb-3">
              Join <span class="font-bold">{{ shell.name }}</span> — signup takes a minute, then verify to get in.
            </p>
            <div class="flex justify-center gap-2 flex-wrap">
              <NuxtLink
                :to="`/login?redirect=${encodeURIComponent(route.fullPath)}`"
                class="inline-flex items-center gap-1.5 rounded-full bg-[color:var(--moh-group)] px-5 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90 transition-opacity"
              >
                Log in
              </NuxtLink>
              <NuxtLink
                :to="`/login?tab=signup&redirect=${encodeURIComponent(route.fullPath)}`"
                class="inline-flex items-center gap-1.5 rounded-full border moh-border px-5 py-2 text-sm font-semibold moh-text hover:bg-[var(--moh-surface-2)] transition-colors"
              >
                Sign up
              </NuxtLink>
            </div>
          </div>
        </div>

        <!-- Logged-in but not verified CTA -->
        <div v-else-if="!isVerified && !isMember" class="px-4 py-6 border-b moh-border">
          <div class="rounded-xl border moh-border bg-[var(--moh-surface-2)] px-5 py-6 text-center max-w-lg mx-auto">
            <p class="text-sm font-medium moh-text mb-1">
              Verify to join — takes a minute
            </p>
            <p class="text-xs moh-text-muted mb-3">
              <template v-if="isOpenGroup">
                Then you’re in <span class="font-semibold">{{ shell.name }}</span>.
              </template>
              <template v-else>
                Then you can request to join <span class="font-semibold">{{ shell.name }}</span>.
              </template>
            </p>
            <NuxtLink
              :to="verificationJoinTo"
              class="inline-flex items-center gap-1.5 rounded-full bg-[color:var(--moh-group)] px-5 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90 transition-opacity"
              @click="rememberJoinIntent"
            >
              Get verified
            </NuxtLink>
          </div>
        </div>

        <!--
          Open-group reader CTA: verified, signed-in non-members can read the
          feed but cannot post until they join. Keep the bar compact so the
          feed below still leads.
        -->
        <div
          v-if="!isMember && canReadFeed"
          class="flex items-center justify-between gap-3 border-b moh-border px-4 py-3"
        >
          <p class="text-sm moh-text-muted">
            Join to post in this group.
          </p>
          <Button
            label="Join group"
            rounded
            size="small"
            :loading="joinBusy"
            @click="doJoin"
          />
        </div>
        <div
          v-else-if="isPendingApproval"
          class="px-4 py-6 border-b moh-border"
        >
          <div class="rounded-xl border moh-border bg-[var(--moh-surface-2)] px-5 py-6 text-center max-w-lg mx-auto">
            <p class="text-sm font-medium moh-text mb-1">
              Request sent
            </p>
            <p class="text-xs moh-text-muted">
              You’ll see posts in <span class="font-semibold">{{ shell.name }}</span> once a moderator approves.
            </p>
          </div>
        </div>

        <template v-if="canReadFeed">
          <NuxtLink v-if="pinnedGroupPost && !focusedNewActivity" :to="`/p/${pinnedGroupPost.id}`" class="moh-focus moh-surface-hover moh-gutter-x flex min-h-14 items-center gap-3 border-b moh-border">
            <Icon name="tabler:pin" class="shrink-0 moh-text-muted" /><span class="min-w-0"><span class="block text-xs moh-text-muted">Pinned in this group</span><span class="block truncate text-sm">{{ pinnedGroupPost.body || 'View pinned post' }}</span></span><Icon name="tabler:chevron-right" class="ml-auto shrink-0" />
          </NuxtLink>
          <!-- Filter bar (sort only, no visibility) -->
          <div class="flex items-center justify-between px-3 py-1 border-b border-gray-200 dark:border-zinc-800">
            <NuxtLink
              v-if="isMod && shell.joinPolicy === 'approval'"
              to="?dialog=pending"
              class="text-xs font-medium hover:underline moh-text"
            >
              Pending requests
            </NuxtLink>
            <div v-else class="flex-1" />
            <AppFeedFiltersBar
              :sort="groupSort"
              :filter="'all'"
              :viewer-is-verified="false"
              :viewer-is-premium="false"
              :show-visibility-filter="false"
              @update:sort="onGroupSortChange"
            />
          </div>

          <!-- Animated tab bar -->
          <div ref="groupTabBarEl" class="sticky top-[var(--moh-title-bar-height,0px)] z-10 moh-surface flex gap-0 border-b border-gray-200 dark:border-zinc-800">
            <button
              v-for="tab in groupTabs"
              :key="tab.key"
              :ref="(el) => setGroupTabButtonRef(tab.key, el as HTMLElement | null)"
              type="button"
              class="relative cursor-pointer px-5 py-3 text-sm font-semibold transition-colors"
              :class="activeGroupTab === tab.key
                ? 'text-gray-900 dark:text-gray-100'
                : 'text-gray-400 dark:text-zinc-500 hover:text-gray-600 dark:hover:text-zinc-300'"
              @click="setGroupTab(tab.key)"
            >
              {{ tab.label }}
            </button>
            <!-- Animated sliding underline -->
            <span
              class="absolute bottom-0 h-[2px] rounded-full"
              :style="{
                left: `${groupUnderlineLeft}px`,
                width: `${groupUnderlineWidth}px`,
                backgroundColor: 'var(--moh-group)',
                transition: groupUnderlineReady ? 'left 220ms ease-in-out, width 220ms ease-in-out' : 'none',
              }"
              aria-hidden="true"
            />
          </div>
          <div ref="groupFeedContentEl" class="h-0 overflow-hidden" aria-hidden="true" />

        <div v-if="isMember" ref="newActivityAnchor" class="scroll-mt-20">
          <div v-if="groupActivity?.newPostCount && !focusedNewActivity" class="moh-gutter-x flex min-h-[68px] items-center justify-between gap-3 bg-[var(--moh-surface-1)]">
            <span class="text-sm font-semibold">{{ groupActivity.newPostCount }} new {{ groupActivity.newPostCount === 1 ? 'post' : 'posts' }}</span><Button label="View new" text severity="secondary" @click="viewNewActivity" />
          </div>

          <p v-if="groupActivity && !groupActivity.newPostCount" class="moh-gutter-x py-3 moh-meta">You’re up to date</p>
          <div v-if="activityError" class="moh-gutter-x py-3" role="alert"><span class="moh-meta">{{ activityError }}</span><Button label="Try again" text @click="loadGroupActivity" /></div>
        </div>

          <!-- ─── Posts tab (top-level only) ─────────────────────────────── -->
          <div v-if="tabActivated.posts" v-show="activeGroupTab === 'posts'" class="min-h-[75vh]">
            <AppInlineAlert v-if="postsFeedError" class="moh-gutter-x mt-3" severity="danger">
              {{ postsFeedError }}
            </AppInlineAlert>
            <AppSubtleSectionLoader :loading="postsFeedInitialLoading" :refreshing="postsFeedLoading && !postsFeedInitialLoading" min-height-class="min-h-[200px]">
              <div v-if="!postsFeedPosts.length" class="px-3 py-6 text-sm moh-text-muted sm:px-4">
                No posts yet.
                <Button v-if="isMember" label="Start a conversation" text @click="openGroupComposer" />
              </div>
              <div v-else class="relative mt-3">
                <template v-for="item in postsFeedDisplayItems" :key="item.kind === 'ad' ? item.key : (item.post._localId ?? item.post.id)">
                  <AppFeedFakeAdRow v-if="item.kind === 'ad'" />
                  <p v-if="item.kind !== 'ad' && focusedNewActivity && item.post.id === firstNewPostId" ref="firstNewPostAnchor" class="moh-gutter-x py-3 text-xs font-semibold uppercase moh-text-muted">New since your last visit</p>
                  <AppFeedPostRow
                    v-if="item.kind !== 'ad'"
                    :post="item.post"
                    collapse-ancestors
                    :group-wall="shell && isOwner ? { groupId: shell.id, viewerIsOwner: true } : null"
                    :show-collapsed-replies-footer="groupSort === 'trending'"
                    :collapsed-sibling-replies-count="postsFeedCollapsedSiblingReplyCountFor(item.post)"
                    :replies-sort="groupSort"
                    @deleted="postsFeedRemovePost"
                    @edited="onPostsTabEdited"
                    @group-pin-changed="onGroupPinChanged"
                  />
                </template>
              </div>
            </AppSubtleSectionLoader>
            <div v-if="postsFeedNextCursor" class="relative flex justify-center items-center py-6 min-h-12">
              <div ref="postsLoadMoreSentinelEl" class="absolute bottom-0 left-0 right-0 h-px" aria-hidden="true" />
              <div
                class="transition-opacity duration-150"
                :class="postsFeedLoadingMore ? 'opacity-100' : 'opacity-0 pointer-events-none'"
                :aria-hidden="!postsFeedLoadingMore"
              >
                <AppLogoLoader compact />
              </div>
            </div>
          </div>

          <!-- ─── Replies tab (all posts including replies) ─────────────── -->
          <div v-if="tabActivated.replies" v-show="activeGroupTab === 'replies'" class="min-h-[75vh]">
            <AppInlineAlert v-if="repliesFeedError" class="moh-gutter-x mt-3" severity="danger">
              {{ repliesFeedError }}
            </AppInlineAlert>
            <AppSubtleSectionLoader :loading="repliesFeedInitialLoading" :refreshing="repliesFeedLoading && !repliesFeedInitialLoading" min-height-class="min-h-[200px]">
              <div v-if="!repliesFeedPosts.length" class="px-3 py-6 text-sm moh-text-muted sm:px-4">
                No posts yet.
              </div>
              <div v-else class="relative mt-3">
                <template v-for="item in repliesFeedDisplayItems" :key="item.kind === 'ad' ? item.key : (item.post._localId ?? item.post.id)">
                  <AppFeedFakeAdRow v-if="item.kind === 'ad'" />
                  <AppFeedPostRow
                    v-else
                    :post="item.post"
                    collapse-ancestors
                    :group-wall="shell && isOwner ? { groupId: shell.id, viewerIsOwner: true } : null"
                    :show-collapsed-replies-footer="groupSort === 'trending'"
                    :collapsed-sibling-replies-count="repliesFeedCollapsedSiblingReplyCountFor(item.post)"
                    :replies-sort="groupSort"
                    @deleted="repliesFeedRemovePost"
                    @edited="onRepliesTabEdited"
                    @group-pin-changed="onGroupPinChanged"
                  />
                </template>
              </div>
            </AppSubtleSectionLoader>
            <div v-if="repliesFeedNextCursor" class="relative flex justify-center items-center py-6 min-h-12">
              <div ref="repliesLoadMoreSentinelEl" class="absolute bottom-0 left-0 right-0 h-px" aria-hidden="true" />
              <div
                class="transition-opacity duration-150"
                :class="repliesFeedLoadingMore ? 'opacity-100' : 'opacity-0 pointer-events-none'"
                :aria-hidden="!repliesFeedLoadingMore"
              >
                <AppLogoLoader compact />
              </div>
            </div>
          </div>

          <!-- ─── Media tab ──────────────────────────────────────────────── -->
          <div v-if="tabActivated.media" v-show="activeGroupTab === 'media'" class="min-h-[75vh]">
            <AppSubtleSectionLoader :loading="!mediaFeed.hasLoadedOnce.value && !mediaFeed.error.value && !mediaFeed.items.value.length" :refreshing="mediaFeed.loading.value && mediaFeed.hasLoadedOnce.value" min-height-class="min-h-[200px]">
              <div v-if="mediaFeed.error.value" class="px-3 py-6 text-sm text-red-700 dark:text-red-300 sm:px-4">
                {{ mediaFeed.error.value }}
              </div>
              <div v-else class="relative mt-3">
                <TransitionGroup
                  name="media-grid"
                  tag="div"
                  class="grid gap-0.5 bg-gray-200 dark:bg-zinc-800"
                  style="grid-template-columns: repeat(auto-fill, minmax(min(120px, 100%), 1fr))"
                >
                  <NuxtLink
                    v-for="item in mediaFeed.items.value"
                    :key="item.id"
                    :to="`/p/${item.postId}`"
                    class="relative aspect-square overflow-hidden bg-gray-100 dark:bg-zinc-900 hover:opacity-90 transition-opacity"
                  >
                    <img
                      :src="item.kind === 'video' ? (item.thumbnailUrl ?? item.url ?? '') : (item.url ?? '')"
                      :alt="item.kind === 'video' ? 'Video' : 'Photo'"
                      class="absolute inset-0 h-full w-full object-cover moh-img-outline"
                      loading="lazy"
                    >
                    <div v-if="item.kind === 'video'" class="absolute inset-0 flex items-center justify-center">
                      <div class="rounded-full bg-black/50 p-2">
                        <Icon name="tabler:player-play-filled" class="text-white text-lg" aria-hidden="true" />
                      </div>
                    </div>
                  </NuxtLink>
                </TransitionGroup>
                <div v-if="mediaFeed.nextCursor.value" class="relative flex justify-center items-center py-6 min-h-12">
                  <div ref="mediaLoadMoreSentinelEl" class="absolute bottom-0 left-0 right-0 h-px" aria-hidden="true" />
                  <div
                    class="transition-opacity duration-150"
                    :class="mediaFeed.loadingMore.value ? 'opacity-100' : 'opacity-0 pointer-events-none'"
                    :aria-hidden="!mediaFeed.loadingMore.value"
                  >
                    <AppLogoLoader compact />
                  </div>
                </div>
                <p v-if="mediaFeed.hasLoadedOnce.value && mediaFeed.items.value.length === 0" class="py-12 text-center text-sm text-gray-400 dark:text-zinc-500">
                  No photos or videos yet.
                </p>
              </div>
            </AppSubtleSectionLoader>
          </div>
        </template>
      </template>
    </div>
  </AppPageContent>
</template>

<script setup lang="ts">
import AppGroupProfileHeader from '~/components/app/groups/AppGroupProfileHeader.vue'
import type { CommunityGroupShell } from '~/types/api'
import { useGroupPageRoute, useGroupPage } from '~/composables/pages/group/useGroupPage'

definePageMeta({
  layout: 'app',
  title: 'Group',
  hideTopBar: false,
  alias: ['/g/:slug/posts', '/g/:slug/replies', '/g/:slug/media'],
})

const routeState = useGroupPageRoute()
const shellData = await useAsyncData<CommunityGroupShell | null>(
  () => `group-shell-${routeState.slug.value}`,
  async () => {
    if (!routeState.slug.value) return null
    return await routeState.apiFetchData<CommunityGroupShell>(`/groups/by-slug/${encodeURIComponent(routeState.slug.value)}`)
  },
)
const {
  route,
  isAuthed,
  isVerified,
  invitedByUsername,
  verificationJoinTo,
  rememberJoinIntent,
  shell,
  shellLoading,
  shellError,
  openGroupComposer,
  joinBusy,
  leaveBusy,
  cancelBusy,
  isMember,
  isPendingApproval,
  isOpenGroup,
  canReadFeed,
  isMod,
  isOwner,
  canEditGroup,
  isAdminOverride,
  canLeave,
  groupSort,
  onGroupSortChange,
  activeGroupTab,
  tabActivated,
  groupTabs,
  groupTabBarEl,
  groupFeedContentEl,
  groupUnderlineLeft,
  groupUnderlineWidth,
  groupUnderlineReady,
  setGroupTabButtonRef,
  setGroupTab,
  postsFeedPosts,
  postsFeedDisplayItems,
  postsFeedCollapsedSiblingReplyCountFor,
  postsFeedNextCursor,
  postsFeedLoading,
  postsFeedInitialLoading,
  postsFeedLoadingMore,
  postsFeedError,
  postsFeedRemovePost,
  repliesFeedPosts,
  repliesFeedDisplayItems,
  repliesFeedCollapsedSiblingReplyCountFor,
  repliesFeedNextCursor,
  repliesFeedLoading,
  repliesFeedInitialLoading,
  repliesFeedLoadingMore,
  repliesFeedError,
  repliesFeedRemovePost,
  mediaFeed,
  hideBannerThumb,
  hideAvatarThumb,
  hideAvatarDuringBanner,
  editOpen,
  inviteOpen,
  onOpenGroupImage,
  onGroupShellUpdated,
  doJoin,
  doLeave,
  doCancelRequest,
  onPostsTabEdited,
  onRepliesTabEdited,
  onGroupPinChanged,
  postsLoadMoreSentinelEl,
  repliesLoadMoreSentinelEl,
  mediaLoadMoreSentinelEl,
  groupActivity,
  activityError,
  focusedNewActivity,
  newActivityAnchor,
  firstNewPostAnchor,
  pinnedGroupPost,
  firstNewPostId,
  loadGroupActivity,
  viewNewActivity,
} = useGroupPage(routeState, shellData)
</script>

<style scoped>
.media-grid-enter-active,
.media-grid-leave-active {
  transition: opacity 0.2s ease;
}

.media-grid-enter-from,
.media-grid-leave-to {
  opacity: 0;
}

.media-grid-move {
  transition: transform 0.25s ease;
}
</style>
