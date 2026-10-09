<template>
  <AppBoardFeedPostRow
    v-if="boardVariant === 'post'"
    :ref="captureBoardRow"
    :data-post-id="postView.id"
    :class="rowBorderClass"
    :post="postView"
    :author="author"
    :profile-path="authorProfilePath"
    :href="postPermalink"
    :age="createdAtShort"
    :age-tooltip="createdAtTooltip"
    :clickable="clickable"
  >
    <template #boost>
      <AppBoardBoostButton
        :post-id="postView.id"
        :points="postView.boostCount"
        :viewer-has-boosted="Boolean(postView.viewerHasBoosted)"
        :disabled="isGatedPost"
        vertical
      />
    </template>
    <template #menu>
      <button
        v-if="showCatchUpButton && !isGatedPost"
        v-tooltip.bottom="tinyTooltip(catchUpResultReady ? 'Catch me up — summary ready' : 'Catch me up — M.A.R.V summarizes this thread')"
        type="button"
        class="moh-tap moh-pressable inline-flex h-9 w-9 items-center justify-center rounded-full transition-opacity hover:opacity-70"
        aria-label="Catch me up with M.A.R.V"
        @click.stop="onCatchMeUp"
      >
        <AppIconGlyph name="catchup" :size="20" :selected="catchUpResultReady" />
      </button>
      <div v-if="!preview" class="relative h-5 w-10">
        <AppPostRowMoreMenu :items="moreMenuItems" :tooltip="moreTooltip" :on-before-open="ensureAuthorFollowLoaded" />
      </div>
    </template>
    <template #actions>
      <AppPostRowActionBar
        :variant="isGatedPost ? 'boardLocked' : 'board'"
        :post="postView"
        :source-post="post"
        :author="author"
        :viewer-can-interact="viewerCanInteract"
        :is-gated-post="isGatedPost"
        @bookmark-count-delta="onBookmarkCountDelta"
        @bookmark-state-changed="onBookmarkStateChanged"
        @open-reposters="repostersPostId = post.id"
      >
        <template v-if="!isGatedPost && displayViewerCount > 0" #end>
          <AppPostRowViewerBreakdown
            class="ml-auto shrink-0"
            :entity-id="postView.id"
            :breakdown-path="`/posts/${encodeURIComponent(postView.id)}/views/breakdown?fresh=1`"
            :viewer-count="displayViewerCount"
            :total-view-count="displayTotalViewCount"
            :has-viewed="hasViewedPost"
            @count-synced="onViewerCountSynced"
          />
        </template>
      </AppPostRowActionBar>
    </template>
    <template v-if="$slots.threadFooter" #footer>
      <slot name="threadFooter" />
    </template>
  </AppBoardFeedPostRow>

  <AppBoardFeedCommentRow
    v-else
    :ref="captureBoardRow"
    :data-post-id="postView.id"
    :class="rowBorderClass"
    :post="postView"
    :author="author"
    :profile-path="authorProfilePath"
    :href="postPermalink"
    :age="createdAtShort"
    :age-tooltip="createdAtTooltip"
    :clickable="clickable"
  >
    <template #actions>
      <AppPostRowActionBar
        :variant="isGatedPost ? 'boardLocked' : 'boardComment'"
        :post="postView"
        :source-post="post"
        :author="author"
        :viewer-can-interact="viewerCanInteract"
        :is-gated-post="isGatedPost"
        @bookmark-count-delta="onBookmarkCountDelta"
        @bookmark-state-changed="onBookmarkStateChanged"
      >
        <template #start>
          <div class="inline-flex items-center">
            <AppBoardBoostButton
              :post-id="postView.id"
              :points="postView.boostCount"
              :viewer-has-boosted="Boolean(postView.viewerHasBoosted)"
              :disabled="isGatedPost"
            />
          </div>
          <div v-if="!isGatedPost" class="inline-flex items-center">
            <NuxtLink
              :to="postPermalink"
              class="moh-tap moh-focus inline-flex min-h-9 items-center gap-1 rounded-lg px-2 text-[13px] font-medium moh-text-muted transition-colors hover:text-[var(--moh-text)]"
            >
              <AppIconGlyph name="reply" :size="16" />
              Reply
            </NuxtLink>
          </div>
        </template>
        <template #end>
          <div class="relative ml-auto h-5 w-10 self-center">
            <AppPostRowMoreMenu :items="moreMenuItems" :tooltip="moreTooltip" :on-before-open="ensureAuthorFollowLoaded" />
          </div>
        </template>
      </AppPostRowActionBar>
    </template>
  </AppBoardFeedCommentRow>
</template>

<script setup lang="ts">
import { tinyTooltip } from '~/utils/tiny-tooltip'
import type { PostRowProps } from '~/composables/post-row/post-row-types'
import type { usePostRow } from '~/composables/post-row/usePostRow'

/** Board-style rendering of a post row (thread or comment); shares all state with `AppPostRow`. */
const props = defineProps<{
  row: ReturnType<typeof usePostRow>
  post: PostRowProps['post']
  preview?: PostRowProps['preview']
}>()

const {
  author,
  authorProfilePath,
  boardVariant,
  captureBoardRow,
  catchUpResultReady,
  clickable,
  createdAtShort,
  createdAtTooltip,
  displayTotalViewCount,
  displayViewerCount,
  ensureAuthorFollowLoaded,
  hasViewedPost,
  isGatedPost,
  moreMenuItems,
  moreTooltip,
  onBookmarkCountDelta,
  onBookmarkStateChanged,
  onCatchMeUp,
  onViewerCountSynced,
  postPermalink,
  postView,
  repostersPostId,
  rowBorderClass,
  showCatchUpButton,
  viewerCanInteract,
} = props.row
</script>
