<template>
  <AppPageContent bottom="standard">
  <AppJoinBanner />
  <div class="w-full">
    <div v-if="errorText" class="px-4 mt-4">
      <AppPostPermalinkErrorState />
    </div>

    <div v-else-if="post">
      <NuxtLink
        v-if="postGroupShell && !isGatedPost"
        :to="`/g/${encodeURIComponent(postGroupShell.slug)}`"
        class="group flex items-center gap-2.5 border-b moh-border moh-gutter-x py-2 transition-colors hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
        :aria-label="`Back to ${postGroupShell.name}`"
      >
        <Icon
          name="tabler:chevron-left"
          class="text-base shrink-0 moh-text-muted transition-transform group-hover:-translate-x-0.5"
          aria-hidden="true"
        />
        <div
          class="h-6 w-6 shrink-0 overflow-hidden bg-gray-200 dark:bg-zinc-700 moh-img-outline"
          :class="postGroupAvatarRoundClass"
        >
          <img
            v-if="postGroupShell.avatarImageUrl"
            :src="postGroupShell.avatarImageUrl"
            alt=""
            class="h-full w-full object-cover"
            loading="lazy"
          >
          <div
            v-else
            class="flex h-full w-full items-center justify-center text-[9px] font-bold text-gray-500 dark:text-zinc-400"
          >
            {{ postGroupInitials }}
          </div>
        </div>
        <span class="min-w-0 flex-1 truncate text-sm font-semibold moh-text">
          {{ postGroupShell.name }}
        </span>
      </NuxtLink>
      <div v-if="isGatedPost && post.groupPreview" class="px-4 pt-4 pb-2">
        <AppGroupPreviewCard
          :preview="post.groupPreview"
          :show-join="isAuthed"
          :join-busy="groupJoinBusy"
          @join="joinGroupFromPreview"
        />
      </div>
      <div ref="highlightedPostRef">
        <AppFeedPostRow
          v-if="post.parent"
          ref="feedPostRowRef"
          :post="post"
          :highlighted-post-id="post.id"
          :clickable="false"
          activate-video-on-mount
          @deleted="onDeleted"
        />
        <AppPostRow
          v-else
          :post="post"
          :highlight="true"
          :clickable="false"
          @deleted="onDeleted"
        />
      </div>

      <AppXPublishing v-if="canReviewXPublication" :key="`publish-x-${post.id}`" :post-id="post.id" />
      <AppXAuthorMetrics v-if="post.author.id === user?.id && post.xUrl && !post.deletedAt" :key="`x-${post.id}`" :post-id="post.id" />
      <AppConversationInsights v-if="post.author.id === user?.id && !post.parentId && !isOnlyMe && !post.deletedAt && post.kind !== 'repost'" :key="post.id" :post-id="post.id" />
      <AppPostContribution :key="`contribution-${post.id}`" :post="post" />
      <template v-if="!isOnlyMe && !isGatedPost">
        <div v-if="showReplyComposer" class="border-b border-gray-200 dark:border-zinc-800">
          <AppPostComposer
            v-if="replyContext"
            ref="permalinkComposerRef"
            :reply-to="replyContext"
            :create-post="createComment"
            auto-focus
            :show-divider="false"
            @posted="onPermalinkReplyPosted"
          >
            <template #above-textarea>
              <span v-if="replyingToDisplay.length">
                Replying to
                <template v-for="(p, i) in replyingToDisplay" :key="p.id">
                  <RouterLink
                    :to="`/u/${encodeURIComponent(p.username)}`"
                    class="font-semibold hover:underline underline-offset-2 moh-text"
                    :class="participantLinkClass(p)"
                    :aria-label="`View @${p.username} profile`"
                  >
                    @{{ p.username }}
                  </RouterLink>
                  <span v-if="i < replyingToDisplay.length - 1" class="moh-text-muted">, </span>
                </template>
              </span>
            </template>
          </AppPostComposer>
        </div>

        <!-- Catch me up pill: show on busy threads (≥8 replies) to premium users who haven't dismissed it this visit -->
        <div
          v-if="isMounted && showCatchMeUpPill && post"
          class="flex items-center justify-between gap-3 border-b moh-border px-4 py-2"
        >
          <button
            v-tooltip.bottom="'Catch me up'"
            type="button"
            class="inline-flex h-11 w-11 items-center justify-center rounded-full transition-opacity hover:opacity-70"
            aria-label="Catch me up"
            @click="onCatchMeUpPill"
          >
            <!-- Same mark as the post-row trigger: one feature should not have two glyphs. -->
            <AppMarvMark :size="24" />
          </button>
          <button
            type="button"
            class="inline-flex h-6 w-6 items-center justify-center rounded-full text-gray-400 transition-opacity hover:opacity-70"
            aria-label="Dismiss"
            @click="dismissCatchMeUpPill"
          >
            <Icon name="tabler:x" class="text-[12px]" aria-hidden="true" />
          </button>
        </div>

        <!-- Quotes section: lazy-loaded when the post has quoteCount > 0 -->
        <AppPostPermalinkQuotes />

        <AppPostPermalinkReplies />

        <!-- Discover more: lazy-loaded near end of thread (client-only; not part of SSR). -->
        <AppPostPermalinkDiscover />
      </template>

      <div class="min-h-[80dvh] shrink-0" aria-hidden="true" />
    </div>
  </div>
  </AppPageContent>

  <AppSharePostDialog
    v-if="post"
    v-model:open="shareDialogOpen"
    :post="post"
  />
</template>

<script setup lang="ts">
import AppGroupPreviewCard from '~/components/app/groups/AppGroupPreviewCard.vue'
import { usePostPermalink } from '~/composables/usePostPermalink'
import { usePostPageRoute, usePostPagePost, usePostPage } from '~/composables/pages/post/usePostPage'

definePageMeta({
  layout: 'app',
  title: 'Post',
})

const routeState = usePostPageRoute()
const permalink = await usePostPermalink(routeState.postId)
const postState = usePostPagePost(routeState, permalink)
if (postState.boardRedirect) {
  await navigateTo(postState.boardRedirect, { replace: true, redirectCode: 301 })
}
const {
  highlightedPostRef,
  user,
  isAuthed,
  post,
  errorText,
  isOnlyMe,
  canReviewXPublication,
  onDeleted,
  showReplyComposer,
  shareDialogOpen,
  replyingToDisplay,
  replyContext,
  participantLinkClass,
  createComment,
  permalinkComposerRef,
  onPermalinkReplyPosted,
  isGatedPost,
  postGroupShell,
  postGroupAvatarRoundClass,
  postGroupInitials,
  groupJoinBusy,
  joinGroupFromPreview,
  isMounted,
  showCatchMeUpPill,
  onCatchMeUpPill,
  dismissCatchMeUpPill,
  feedPostRowRef,
} = usePostPage(routeState, postState)

</script>
