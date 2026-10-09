<template>
  <div
    v-if="!hiddenByBlock && !boardVariant"
    ref="rowEl"
    :data-post-id="postView.id"
    :class="[
      'relative overflow-visible moh-gutter-x moh-post-row transition-colors',
      compact ? 'pt-3 pb-2' : 'pt-4 pb-2 sm:pt-6',
      rowBorderClass,
      clickable ? 'cursor-pointer group' : '',
      highlight ? highlightClass : '',
      pendingStatus === 'posting' ? 'opacity-70' : '',
      pendingStatus === 'failed' ? 'opacity-90' : '',
    ]"
    :style="rowStyle"
    :role="clickable && postPermalink ? 'link' : undefined"
    :tabindex="clickable && postPermalink ? 0 : undefined"
    @click.capture="onRowClick"
    @auxclick.capture="onRowAuxClick"
    @keydown.enter.self.prevent="onRowKeydown"
    @keydown.space.self.prevent="onRowKeydown"
  >
    <!-- Animated background: transparent at 0, opacity up on hover (main.css), back to 0 on mouse out -->
    <div
      v-if="clickable"
      class="moh-post-row-hover-bg pointer-events-none absolute inset-0 z-0"
      :style="hoverBgStyle"
      aria-hidden="true"
    />
    <!-- Full-row background link: sits above the hover bg (z-[1]) but below all content (z-10+).
         Gives proper browser link semantics — middle-click, cmd+click, right-click → "Open in new tab". -->
    <NuxtLink
      v-if="clickable && postPermalink"
      :to="postPermalink"
      class="absolute inset-0 z-[1]"
      tabindex="-1"
      aria-hidden="true"
    />
    <!-- Overlay: line from top down to just above avatar (gap); no overextend -->
    <div
      v-if="showThreadLineAboveAvatar"
      class="pointer-events-none absolute left-[var(--moh-gutter-x)] z-10 flex w-10 justify-center"
      :style="threadLineAboveOverlayStyle"
      aria-hidden="true"
    >
      <div
        class="w-[2px] opacity-75"
        :class="threadLineTint ? '' : 'bg-[var(--moh-thread-line)]'"
        :style="threadLineAboveStyle"
      />
    </div>
    <!-- Overlay: line from just below avatar (gap) to row bottom; no overextend -->
    <div
      v-if="showThreadLineBelowAvatar"
      class="pointer-events-none absolute left-[var(--moh-gutter-x)] z-10 flex w-10 justify-center"
      :style="threadLineBelowOverlayStyle"
      aria-hidden="true"
    >
      <div
        class="w-[2px] h-full opacity-75"
        :class="threadLineTint ? '' : 'bg-[var(--moh-thread-line)]'"
        :style="threadLineBelowStyle"
      />
    </div>
    <div
      class="relative z-[2] flex gap-3"
    >
      <div class="relative z-20 shrink-0 flex flex-col w-10">
        <!-- Own post + in a space: show context menu instead of direct navigation -->
        <template v-if="showAvatarMenu">
          <button
            type="button"
            class="group shrink-0"
            aria-label="Avatar options"
            @click.stop="toggleAvatarMenu"
          >
            <div ref="avatarEl" class="flex h-10 w-10 shrink-0 leading-none">
              <AppUserAvatar
                :user="author"
                size-class="h-10 w-10"
                bg-class="moh-surface"
              />
            </div>
          </button>
          <Menu ref="avatarMenuRef" :model="avatarMenuItems" popup>
            <template #item="{ item, props: itemProps }">
              <a v-bind="itemProps.action" class="flex items-center gap-2">
                <Icon v-if="item.iconName" :name="item.iconName" aria-hidden="true" />
                <span v-bind="itemProps.label">{{ item.label }}</span>
              </a>
            </template>
          </Menu>
        </template>
        <NuxtLink
          v-else-if="authorProfilePath"
          :to="authorProfilePath"
          class="group shrink-0"
          :aria-label="`View @${author?.username} profile`"
        >
          <div ref="avatarEl" class="flex h-10 w-10 shrink-0 leading-none">
            <AppUserAvatar
              :user="author"
              size-class="h-10 w-10"
              bg-class="moh-surface"
            />
          </div>
        </NuxtLink>
        <div v-else ref="avatarEl" class="flex h-10 w-10 shrink-0 leading-none">
          <AppUserAvatar
            :user="author"
            size-class="h-10 w-10"
            bg-class="moh-surface"
          />
        </div>
      </div>

      <div class="relative z-10 min-w-0 flex-1">
        <div class="relative">
          <AppPostRowGroupTag v-if="feedGroupTagForRow" :group="feedGroupTagForRow" />
          <AppPostHeaderLine
            :display-name="author.name || author.username || 'User'"
            :username="author.username || ''"
            :verified-status="author.verifiedStatus"
            :premium="author.premium"
            :premium-plus="author.premiumPlus"
            :is-organization="author.isOrganization"
            :org-affiliations="author.orgAffiliations ?? postView.author?.orgAffiliations"
            :is-bot="postView.author?.isBot ?? false"
            :is-new-member="postView.author?.isNewMember ?? false"
            :edited-at="postView.editedAt ?? null"
            :pickax-url="postView.pickaxUrl ?? null"
            :x-url="postView.xUrl ?? null"
            :pickax-pending="Boolean(postView._crosspostPending?.pickax) && !postView.pickaxUrl && !postView.pickaxError"
            :x-pending="Boolean(postView._crosspostPending?.x) && !postView.xUrl && !postView.xError"
            :hide-edited-badge="postView.visibility === 'onlyMe'"
            :profile-path="authorProfilePath"
            :post-id="postView.id"
            :post-permalink="postPermalink"
            :created-at-short="createdAtShort"
            :created-at-tooltip="createdAtTooltip"
          />

          <!-- "Replying to" label — shown only when the prop is set (e.g. Notifications page) -->
          <AppPostRowReplyingTo v-if="showReplyingTo" :post="postView" />

          <!-- Marv "Catch me up" trigger — sits just left of the more-menu button. -->
          <div v-if="showCatchUpButton" class="absolute right-11 -top-2.5 z-30 pointer-events-auto">
            <button
              v-tooltip.bottom="tinyTooltip(catchUpResultReady ? 'Catch me up — summary ready' : 'Catch me up — M.A.R.V summarizes this thread')"
              type="button"
              class="moh-tap moh-pressable inline-flex h-11 w-11 items-center justify-center rounded-full transition-opacity hover:opacity-70"
              aria-label="Catch me up with M.A.R.V"
              @click.stop="onCatchMeUp"
            >
              <AppIconGlyph name="catchup" :size="24" :selected="catchUpResultReady" />
            </button>
          </div>

          <AppPostRowMoreMenu v-if="!isPendingRow && !preview" :items="moreMenuItems" :tooltip="moreTooltip" :on-before-open="ensureAuthorFollowLoaded" />
        </div>

        <component
          :is="postView.checkinDayKey ? NuxtLink : 'div'"
          v-if="!isDeletedPost && postView.kind === 'checkin' && postView.checkinPrompt"
          :to="postView.checkinDayKey ? `/check-ins/day/${postView.checkinDayKey}` : undefined"
          class="my-4 block w-full transition-opacity hover:opacity-80"
          @click.stop
        >
          <AppCheckinPromptContext :prompt="postView.checkinPrompt" :label="isCheckinPromptToday ? 'Check-in answer · Today' : 'Check-in answer'" compact />
        </component>

        <!-- Status post: eyebrow + bubble -->
        <template v-if="!isDeletedPost && postView.kind === 'status' && postView.body">
          <p class="mt-2 mb-1.5 text-[11px] text-zinc-400 dark:text-zinc-500 select-none">updated their status</p>
          <AppStatusBubble :text="postView.body" />
        </template>

        <div
          v-if="isDeletedPost"
          class="mt-2 rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1.5 sm:px-3 sm:py-2 text-sm font-semibold text-gray-700 dark:border-zinc-800 dark:bg-black dark:text-white"
        >
          Post deleted.
        </div>

        <!-- Gated post: show partial body (mid-word cut, faded) then gate card -->
        <template v-else-if="isGatedPost">
          <div
            v-if="postView.body"
            class="relative overflow-hidden"
            style="opacity: 0.75; mask-image: linear-gradient(to bottom, black 40%, transparent 100%); -webkit-mask-image: linear-gradient(to bottom, black 40%, transparent 100%);"
          >
            <AppPostRowBody
              :body="postView.body"
              :has-media="false"
              :mentions="[]"
              :visibility="postView.visibility"
            />
          </div>
          <button
            type="button"
            class="mt-2 flex w-full items-center gap-2.5 rounded-xl border px-3.5 py-3 text-left transition-opacity duration-150 hover:opacity-80 active:opacity-60"
            :class="postView.visibility === 'premiumOnly'
              ? 'border-orange-200 bg-orange-50 dark:border-orange-900/30 dark:bg-orange-950/20'
              : 'border-blue-200 bg-blue-50 dark:border-blue-900/30 dark:bg-blue-950/20'"
            @click.stop="onGatedBannerClick"
          >
            <Icon
              name="tabler:lock"
              class="shrink-0 text-[15px]"
              :class="postView.visibility === 'premiumOnly' ? 'text-orange-500' : 'text-blue-500'"
              aria-hidden="true"
            />
            <span
              class="flex-1 text-[13px] font-medium"
              :class="postView.visibility === 'premiumOnly' ? 'text-orange-700 dark:text-orange-400' : 'text-blue-700 dark:text-blue-400'"
            >
              {{ postView.visibility === 'premiumOnly' ? 'Become premium to read' : 'Verify to read' }}
            </span>
            <Icon
              name="tabler:arrow-right"
              class="shrink-0 text-[14px]"
              :class="postView.visibility === 'premiumOnly' ? 'text-orange-400 dark:text-orange-500' : 'text-blue-400 dark:text-blue-500'"
              aria-hidden="true"
            />
          </button>
        </template>

        <AppPostRowBody
          v-else-if="postView.kind !== 'status'"
          :body="postView.body"
          :has-media="Boolean(postView.media?.length)"
          :mentions="postView.mentions"
          :cashtags="postView.cashtags"
          :visibility="postView.visibility"
        />

        <AppConversationContext v-if="!isDeletedPost && !isGatedPost && postView.conversationContext" :post-id="postView.id" :context="postView.conversationContext" />

        <AppPostPoll
          v-if="!isDeletedPost && !isGatedPost && postView.poll"
          :post-id="postView.id"
          :poll="postView.poll"
          :post-visibility="postView.visibility"
          :viewer-is-author="isSelf"
          :viewer-can-interact="viewerCanInteract"
          @updated="onPollUpdated"
        />

        <AppPostMediaGrid v-if="!isDeletedPost && !isGatedPost && postView.media?.length" :media="postView.media" :post-id="postView.id" :row-in-view="rowInView" />

        <AppPostRowLinkPreview
          v-if="!isDeletedPost && !isGatedPost"
          :post-id="postView.id"
          :body="postView.body"
          :has-media="Boolean(postView.media?.length)"
          :row-in-view="rowInView"
          :activate-video-on-mount="activateVideoOnMount"
          :preloaded-article="postView.article ?? null"
          :quoted-post="postView.quotedPost ?? null"
          :video-embed="postView.videoEmbed ?? null"
        />

        <!-- Article share card: rendered directly from API data (no fetch needed).
             PostRowLinkPreview suppresses its own article block when preloadedArticle is set. -->
        <AppArticleShareCard
          v-if="!isDeletedPost && !isGatedPost && postView.kind === 'articleShare' && postView.article"
          :article="postView.article"
        />

        <!-- Fitness share card: rendered directly from API data (no fetch needed). -->
        <AppFitnessShareCard
          v-if="!isDeletedPost && !isGatedPost && postView.kind === 'fitnessShare' && postView.fitnessShare"
          :share="postView.fitnessShare"
        />

        <AppPostRowPendingBanner v-if="pendingStatus" :post="postView" :status="pendingStatus" />

        <!-- Author-only: Pickax refused the cross-post. The post itself is live here. -->
        <div
          v-if="pickaxError"
          class="relative z-10 mt-2 flex items-start gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2"
        >
          <img src="/images/brands/pickax.png" alt="" width="16" height="16" class="mt-0.5 h-4 w-4 rounded-[3px]">
          <p class="min-w-0 flex-1 text-xs moh-text">
            Pickax did not take this post: {{ pickaxError }}
            <NuxtLink to="/settings/integrations" class="font-semibold underline underline-offset-2" @click.stop>
              Check your connection
            </NuxtLink>
          </p>
        </div>

        <div
          v-if="xError"
          class="relative z-10 mt-2 flex items-start gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2"
        >
          <Icon name="tabler:brand-x" class="mt-0.5 h-4 w-4 shrink-0" />
          <p class="min-w-0 flex-1 text-xs moh-text">
            X did not take this post: {{ xError }}
            <NuxtLink to="/settings/integrations" class="font-semibold underline underline-offset-2" @click.stop>
              Check your connection
            </NuxtLink>
          </p>
        </div>

        <div
          v-if="!isDeletedPost && !isGatedPost && (metaTags.length || displayViewerCount > 0)"
          class="mt-3 flex flex-wrap items-center justify-between gap-3"
        >
          <div class="flex min-w-0 items-center gap-2">
            <template v-for="t in metaTags" :key="t.key">
              <NuxtLink
                v-if="t.to"
                v-tooltip.bottom="t.tooltip"
                :to="t.to"
                class="inline-flex items-center rounded-full py-0.5 text-[11px] font-semibold border cursor-pointer hover:opacity-90 moh-focus"
                :class="[t.class, t.icon ? 'pl-2 pr-2.5' : 'px-2']"
              >
                <Icon v-if="t.icon" :name="t.icon" class="mr-1 text-[10px]" aria-hidden="true" />
                {{ t.label }}
              </NuxtLink>
              <span
                v-else
                v-tooltip.bottom="t.tooltip"
                class="inline-flex items-center rounded-full py-0.5 text-[11px] font-semibold border cursor-default"
                :class="[t.class, t.icon ? 'pl-2 pr-2.5' : 'px-2']"
              >
                <Icon v-if="t.icon" :name="t.icon" class="mr-1 text-[10px]" aria-hidden="true" />
                {{ t.label }}
              </span>
            </template>
          </div>
          <AppPostRowViewerBreakdown
            v-if="displayViewerCount > 0"
            class="ml-auto shrink-0"
            :entity-id="postView.id"
            :breakdown-path="`/posts/${encodeURIComponent(postView.id)}/views/breakdown?fresh=1`"
            :viewer-count="displayViewerCount"
            :total-view-count="displayTotalViewCount"
            :has-viewed="hasViewedPost"
            @count-synced="onViewerCountSynced"
          />
        </div>

        <div
          v-if="!isDeletedPost && !isOnlyMe"
          class="mt-2 border-t moh-border-subtle moh-post-actions-divider"
        />

        <!-- Engagement: typing indicator, "+N new" pill, and the action bar -->
        <AppPostRowActionBar
          :post="postView"
          :source-post="post"
          :author="author"
          :viewer-can-interact="viewerCanInteract"
          :is-gated-post="isGatedPost"
          @bookmark-count-delta="onBookmarkCountDelta"
          @bookmark-state-changed="onBookmarkStateChanged"
          @open-reposters="repostersPostId = post.id"
        />

        <!-- Thread footer content (e.g. "View X more replies") -->
        <div v-if="$slots.threadFooter" class="mt-1">
          <slot name="threadFooter" />
        </div>
      </div>
    </div>
  </div>

  <AppPostRowBoardVariant v-else-if="!hiddenByBlock" :row="row" :post="post" :preview="preview">
    <template v-if="$slots.threadFooter" #threadFooter><slot name="threadFooter" /></template>
  </AppPostRowBoardVariant>


  <AppEditPostDialog v-if="editOpen" v-model="editOpen" :post="postView" @edited="onEdited" />

  <AppReportDialog
    v-model:visible="reportOpen"
    target-type="post"
    :subject-post-id="postView.id"
    :subject-label="`@${author.username || 'user'}`"
    @submitted="onReportSubmitted"
  />

  <AppPostRepostersModal
    v-if="repostersPostId"
    :open="Boolean(repostersPostId)"
    :post-id="repostersPostId"
    @close="repostersPostId = null"
  />
</template>

<script setup lang="ts">
import AppCheckinPromptContext from '~/components/app/dialogs/CheckinPromptContext.vue'
import type { PostRowEmits, PostRowProps } from '../../../composables/post-row/post-row-types'
import { tinyTooltip } from '~/utils/tiny-tooltip'
import { usePostRow } from '~/composables/post-row/usePostRow'

const props = withDefaults(defineProps<PostRowProps>(), {
  clickable: true,
  trackViews: true,
})

const emit = defineEmits<PostRowEmits>()

const row = usePostRow(props, emit)
const {
  postView,
  hiddenByBlock,
  feedGroupTagForRow,
  onPollUpdated,
  author,
  isDeletedPost,
  isGatedPost,
  displayViewerCount,
  displayTotalViewCount,
  hasViewedPost,
  onGatedBannerClick,
  pendingStatus,
  isPendingRow,
  clickable,
  rowBorderClass,
  highlightClass,
  hoverBgStyle,
  rowStyle,
  rowEl,
  rowInView,
  avatarEl,
  threadLineAboveOverlayStyle,
  threadLineAboveStyle,
  threadLineBelowOverlayStyle,
  threadLineBelowStyle,
  pickaxError,
  xError,
  isSelf,
  showCatchUpButton,
  catchUpResultReady,
  onCatchMeUp,
  isOnlyMe,
  viewerCanInteract,
  authorProfilePath,
  NuxtLink,
  isCheckinPromptToday,
  metaTags,
  postPermalink,
  boardVariant,
  onRowClick,
  onRowAuxClick,
  onRowKeydown,
  createdAtShort,
  createdAtTooltip,
  moreMenuItems,
  moreTooltip,
  ensureAuthorFollowLoaded,
  editOpen,
  reportOpen,
  showAvatarMenu,
  avatarMenuRef,
  avatarMenuItems,
  toggleAvatarMenu,
  onEdited,
  repostersPostId,
  onReportSubmitted,
  onBookmarkCountDelta,
  onBookmarkStateChanged,
  onViewerCountSynced,
} = row

</script>
