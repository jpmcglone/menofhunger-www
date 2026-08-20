<template>
  <!-- Flat repost (kind=repost): show reposter header + render original post -->
  <div
    v-if="isFlatRepost && repostedPost"
    :ref="(el) => { captureWrapperEl(el); if (highlightedPostId === post.id) setHighlightedRef(el) }"
    :data-post-id="post.id"
    :class="keyboardFocusClass"
    @mouseenter="onMouseEnter"
    @mouseleave="onMouseLeave"
  >
    <!-- "X reposted" header -->
    <AppPostRepostHeader :post="post" />
    <!-- Original post content -->
    <AppPostRow
      :post="repostedPost"
      :no-border-bottom="false"
      :subtle-border-bottom="subtleBorderBottom"
      :activate-video-on-mount="activateVideoOnMount"
      :group-wall="groupWall"
      :feed-group="feedGroup"
      :track-views="false"
      v-bind="$attrs"
      @deleted="$emit('deleted', $event)"
      @edited="$emit('edited', $event)"
      @group-pin-changed="$emit('groupPinChanged')"
    />
  </div>

  <!-- Single post (no parent): render one row -->
  <div
    v-else-if="chain.length === 1"
    :ref="(el) => { captureWrapperEl(el); if (highlightedPostId === post.id) setHighlightedRef(el) }"
    :data-post-id="post.id"
    :class="keyboardFocusClass"
    @mouseenter="onMouseEnter"
    @mouseleave="onMouseLeave"
  >
    <AppPostRow
      :post="post"
      :highlight="highlightedPostId === post.id"
      :no-border-bottom="false"
      :subtle-border-bottom="subtleBorderBottom"
      :activate-video-on-mount="activateVideoOnMount"
      :group-wall="groupWall"
      :feed-group="feedGroup"
      :track-views="false"
      v-bind="$attrs"
      @deleted="$emit('deleted', $event)"
      @edited="$emit('edited', $event)"
      @group-pin-changed="$emit('groupPinChanged')"
    >
      <template v-if="showCollapsedFooter && !hideReplyFooters" #threadFooter>
        <NuxtLink
          :to="`/p/${encodeURIComponent(rootPostId!)}`"
          class="inline-flex items-center gap-2 rounded-lg px-2 py-1 text-sm font-semibold text-gray-700 transition-colors moh-surface-hover dark:text-gray-200 tabular-nums"
        >
          <AppAvatarFacepile
            v-if="collapsedReplyAuthors.length"
            :authors="collapsedReplyAuthors"
          />
          <Icon name="tabler:message-circle" class="text-[14px] opacity-70" aria-hidden="true" />
          {{ collapsedRepliesLabelFor(collapsedSiblingRepliesCount) }}
        </NuxtLink>
      </template>
    </AppPostRow>
  </div>

  <!-- Reply chain A -> B -> C: overlays on each row connect with no gap. When
       `collapseAncestors` hides a run of ancestors, a dashed dot connector stands
       in for them instead (see `displayChain` / `buildThreadDisplayChain`). -->
  <div
    v-else
    :ref="(el) => captureWrapperEl(el)"
    class="flex flex-col"
    :data-post-id="post.id"
    :class="keyboardFocusClass"
    @mouseenter="onMouseEnter"
    @mouseleave="onMouseLeave"
  >
    <template v-for="(entry, displayIndex) in displayChain" :key="entry.kind === 'post' ? entry.item.id : entry.key">
      <!-- Collapsed run of hidden ancestors: one dot per hidden post, inset between thread lines. -->
      <div
        v-if="entry.kind === 'gap'"
        class="relative moh-gutter-x flex cursor-pointer items-center gap-2.5 py-1 transition-colors moh-surface-hover sm:gap-3"
        role="link"
        tabindex="0"
        :aria-label="hiddenThreadGapLabel(entry.hiddenCount)"
        @click="onGapRowClick(displayIndex, $event)"
        @auxclick="onGapRowAuxClick(displayIndex, $event)"
        @keydown.enter.prevent="onGapRowKeydown(displayIndex)"
        @keydown.space.prevent="onGapRowKeydown(displayIndex)"
      >
        <NuxtLink
          v-if="gapPermalink(displayIndex)"
          :to="gapPermalink(displayIndex)!"
          class="absolute inset-0 z-[1]"
          tabindex="-1"
          aria-hidden="true"
        />
        <div class="relative z-[2] flex w-10 shrink-0 flex-col items-center justify-center gap-[3px]" aria-hidden="true">
          <span
            v-for="n in entry.hiddenCount"
            :key="n"
            class="h-[3px] w-[3px] shrink-0 rounded-full"
            :class="gapDotBgClass"
            :style="gapDotStyle"
          />
        </div>
        <p class="relative z-[2] flex items-center gap-2 text-xs font-medium">
          <AppAvatarFacepile
            v-if="gapReplyAuthors(entry).length"
            :authors="gapReplyAuthors(entry)"
          />
          <span :class="gapLabelClass" :style="gapLabelStyle">
            {{ hiddenThreadGapLabel(entry.hiddenCount) }}
          </span>
        </p>
      </div>
      <div
        v-else
        :ref="entry.item.id === highlightedPostId ? setHighlightedRef : undefined"
      >
        <AppPostRow
          :post="entry.item"
          :highlight="highlightedPostId === entry.item.id"
          :no-border-bottom="displayIndex < displayChain.length - 1"
          :show-thread-line-above-avatar="displayIndex > 0"
          :show-thread-line-below-avatar="displayIndex < displayChain.length - 1"
          :thread-line-tint="threadLineTint"
          :activate-video-on-mount="entry.index === chain.length - 1 ? activateVideoOnMount : undefined"
          :group-wall="entry.index === chain.length - 1 ? groupWall : null"
          :feed-group="feedGroup"
          :subtle-border-bottom="subtleBorderBottom && entry.index === chain.length - 1"
          :track-views="false"
          v-bind="$attrs"
          @deleted="$emit('deleted', $event)"
          @edited="$emit('edited', $event)"
          @group-pin-changed="$emit('groupPinChanged')"
        >
          <!-- Deduped sibling footer: root row only, when this feed surface opts in. -->
          <template
            v-if="!hideReplyFooters && showCollapsedFooter && isFirstPostAtDisplayIndex(displayIndex)"
            #threadFooter
          >
            <NuxtLink
              :to="`/p/${encodeURIComponent(rootPostId!)}`"
              class="inline-flex items-center gap-2 rounded-lg px-2 py-1 text-sm font-semibold text-gray-700 transition-colors moh-surface-hover dark:text-gray-200 tabular-nums"
            >
              <AppAvatarFacepile
                v-if="collapsedReplyAuthors.length"
                :authors="collapsedReplyAuthors"
              />
              <Icon name="tabler:message-circle" class="text-[14px] opacity-70" aria-hidden="true" />
              {{ collapsedRepliesLabelFor(collapsedSiblingRepliesCount) }}
            </NuxtLink>
          </template>
        </AppPostRow>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { CommunityGroupShell, FeedPost } from '~/types/api'
import type { FeedThreadDisplayPost } from '~/utils/merge-feed-threads-for-display'
import { buildThreadDisplayChain, hiddenThreadGapLabel, postAfterGapInDisplayChain } from '~/utils/feed-thread-display-chain'
import { replyAuthorsFromFeedPost, uniqueReplyAuthorsFromPosts } from '~/utils/thread-reply-authors'
import { isPendingLocalId } from '~/composables/usePendingPostsManager'

defineEmits<{
  (e: 'deleted', id: string): void
  (e: 'edited', payload: { id: string; post: FeedPost }): void
  (e: 'groupPinChanged'): void
}>()

const props = withDefaults(
  defineProps<{
    post: FeedThreadDisplayPost
    activateVideoOnMount?: boolean
    collapsedSiblingRepliesCount?: number
    /** Sort context for the collapsed replies footer label ("more new/trending replies"). */
    repliesSort?: 'new' | 'trending' | null
    /** When set, the post with this id is highlighted (e.g. the post being viewed on /p/:id). */
    highlightedPostId?: string | null
    groupWall?: { groupId: string; viewerIsOwner: boolean } | null
    feedGroup?: CommunityGroupShell | null
    /** Softer bottom border between rows (e.g. combined groups feed). */
    subtleBorderBottom?: boolean
    /** Hide the extra thread footer when the surrounding feed already shows comment counts. */
    showCollapsedRepliesFooter?: boolean
    /** Suppress all "View N more replies" footers (e.g. on day-specific check-in feeds). */
    hideReplyFooters?: boolean
    /**
     * Feed surfaces only (never post detail): compact long ancestor chains to
     * root + immediate parent + leaf, collapsing the rest behind a dotted
     * connector. `post.pinnedAncestorIds` (set by `mergeFeedThreadsForDisplay`)
     * always stays visible even when collapsing.
     */
    collapseAncestors?: boolean
    /**
     * For You only: also roll up still-warm seen middles (`viewerLastSeenAt`)
     * using the 24h / 48h windows. Following / All omit this.
     */
    seenAwareCollapse?: boolean
  }>(),
  {
    highlightedPostId: null,
    collapsedSiblingRepliesCount: 0,
    repliesSort: null,
    groupWall: null,
    feedGroup: null,
    subtleBorderBottom: false,
    showCollapsedRepliesFooter: false,
    collapseAncestors: false,
    seenAwareCollapse: false,
  },
)

const postCache = usePostCache()

// ── Flat repost detection ────────────────────────────────────────────────────
const isFlatRepost = computed(() => props.post.kind === 'repost' && Boolean(props.post.repostedPost))
const repostedPost = computed(() => props.post.repostedPost ?? null)


/** Ordered chain [root, ..., post] by walking parent up. */
const chain = computed(() => {
  const out: FeedPost[] = []
  let p: FeedPost | undefined = postCache.get(props.post)
  while (p) {
    out.unshift(p)
    p = p.parent
  }
  return out
})

const collapsedSiblingRepliesCount = computed(() =>
  Math.max(0, Math.floor(props.collapsedSiblingRepliesCount ?? 0)),
)
const collapsedReplyAuthors = computed(() => replyAuthorsFromFeedPost(props.post))

function gapReplyAuthors(entry: Extract<typeof displayChain.value[number], { kind: 'gap' }>) {
  return uniqueReplyAuthorsFromPosts(entry.hiddenItems ?? [])
}
const rootPostId = computed(() => chain.value[0]?.id ?? null)
const showCollapsedFooter = computed(() =>
  Boolean(props.showCollapsedRepliesFooter && collapsedSiblingRepliesCount.value > 0 && rootPostId.value),
)

function isFirstPostAtDisplayIndex(displayIndex: number): boolean {
  for (let i = 0; i <= displayIndex; i++) {
    if (displayChain.value[i]?.kind === 'post') return i === displayIndex
  }
  return false
}

function collapsedRepliesLabelFor(n: number, omitSortQualifier = false) {
  const noun = n === 1 ? 'reply' : 'replies'
  if (omitSortQualifier) return `View ${n} more ${noun}`
  const qualifier = props.repliesSort === 'trending' ? 'trending' : (props.repliesSort === 'new' ? 'new' : null)
  return `View ${n} more${qualifier ? ` ${qualifier}` : ''} ${noun}`
}

// Back-compat with older render/hot-reload output: some clients may still reference
// `collapsedRepliesLabel` during HMR. Keep it defined to avoid runtime warnings.
const collapsedRepliesLabel = computed(() => collapsedRepliesLabelFor(collapsedSiblingRepliesCount.value))

/** Root post visibility (primary post in the thread) for tier-based styling. */
const rootVisibility = computed(() => chain.value[0]?.visibility)

/** Thread line color tint based on root visibility (matches PostRow thread lines). */
const threadLineTint = computed(() => {
  const v = rootVisibility.value
  if (v === 'verifiedOnly') return 'verified'
  if (v === 'premiumOnly') return 'premium'
  return null
})

/** Compacted `chain` for rendering: root + immediate parent + leaf + pins, gaps collapsed. */
const displayChain = computed(() =>
  buildThreadDisplayChain(
    chain.value,
    props.post.pinnedAncestorIds,
    props.collapseAncestors,
    props.seenAwareCollapse ? { enabled: true } : undefined,
  ),
)

const gapTintColor = computed(() => {
  const tint = threadLineTint.value
  if (tint === 'verified') return 'var(--moh-verified)'
  if (tint === 'premium') return 'var(--moh-premium)'
  return null
})

const gapDotStyle = computed(() => {
  const color = gapTintColor.value
  return color ? { backgroundColor: color } : undefined
})

const gapDotBgClass = computed(() =>
  gapTintColor.value ? '' : 'bg-[var(--moh-thread-line)]',
)

const gapLabelStyle = computed(() => {
  const color = gapTintColor.value
  return color ? { color } : undefined
})

const gapLabelClass = computed(() =>
  gapTintColor.value ? '' : 'text-gray-500 dark:text-zinc-400',
)

function gapPermalink(displayIndex: number): string | null {
  const post = postAfterGapInDisplayChain(displayChain.value, displayIndex)
  return post ? `/p/${encodeURIComponent(post.id)}` : null
}

function isInteractiveTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null
  if (!el) return false
  return Boolean(
    el.closest(
      ['a', 'button', 'iframe', 'input', 'textarea', 'select', '[role="menu"]', '[role="menuitem"]', '[data-pc-section]'].join(','),
    ),
  )
}

function onGapRowClick(displayIndex: number, e: MouseEvent) {
  const href = gapPermalink(displayIndex)
  if (!href || isInteractiveTarget(e.target)) return
  if (e.metaKey || e.ctrlKey) {
    window.open(href, '_blank')
    return
  }
  void navigateTo(href)
}

function onGapRowAuxClick(displayIndex: number, e: MouseEvent) {
  const href = gapPermalink(displayIndex)
  if (!href || e.button !== 1 || isInteractiveTarget(e.target)) return
  e.preventDefault()
  window.open(href, '_blank')
}

function onGapRowKeydown(displayIndex: number) {
  const href = gapPermalink(displayIndex)
  if (href) void navigateTo(href)
}

/** Ref to the DOM element of the highlighted row (exposed for scroll-into-view on /p/:id). */
const highlightedRowRef = ref<HTMLElement | null>(null)
function setHighlightedRef(el: unknown) {
  highlightedRowRef.value = Array.isArray(el) ? (el?.[0] as HTMLElement | null) ?? null : (el as HTMLElement | null) ?? null
}
defineExpose({ highlightedRowRef, getHighlightedEl: () => highlightedRowRef.value })

// Post view tracking: observe this row for 50% visibility for 1s
const { observe, noteAlreadyViewed } = usePostViewTracker()
const middleScrollerEl = useMiddleScroller()
const wrapperEl = ref<HTMLElement | null>(null)
let stopObserve: (() => void) | null = null

function captureWrapperEl(el: unknown) {
  wrapperEl.value = Array.isArray(el) ? (el?.[0] as HTMLElement | null) ?? null : (el as HTMLElement | null) ?? null
}

// Keyboard shortcut focus tracking
const { focusedPostId, focusSource, registerPost, unregisterPost, setFocusedPost, clearFocus } = useKeyboardShortcutsFocusedPost()

const isKeyboardFocused = computed(
  () => focusedPostId.value === props.post.id && focusSource.value === 'keyboard',
)
const keyboardFocusClass = computed(() =>
  isKeyboardFocused.value
    ? 'outline outline-1 outline-[var(--moh-focus-ring)] outline-offset-[-1px]'
    : '',
)

function onMouseEnter() {
  setFocusedPost(props.post.id, 'mouse')
}

function onMouseLeave() {
  if (focusedPostId.value === props.post.id && focusSource.value === 'mouse') {
    clearFocus()
  }
}

function bindFeedViewObserve() {
  stopObserve?.()
  stopObserve = null
  if (!import.meta.client || !wrapperEl.value) return
  const accessible = chain.value.filter((p) => p.viewerCanAccess !== false && !isPendingLocalId(p.id))
  const alreadyViewed = accessible.filter((p) => p.viewerHasViewed === true).map((p) => p.id).filter(Boolean)
  if (alreadyViewed.length) noteAlreadyViewed(alreadyViewed)
  const postIds = accessible.map((p) => p.id).filter(Boolean)
  const groupIdByPostId: Record<string, string> = {}
  for (const p of accessible) {
    // Unread badge already cleared for previously viewed group posts.
    if (p.viewerHasViewed === true) continue
    const gid = (p.communityGroupId ?? '').trim()
    if (gid && p.id) groupIdByPostId[p.id] = gid
  }
  if (postIds.length) {
    stopObserve = observe(postIds, wrapperEl.value, {
      groupIdByPostId: Object.keys(groupIdByPostId).length ? groupIdByPostId : undefined,
      root: middleScrollerEl.value ?? null,
    })
  }
}

onMounted(() => {
  registerPost(props.post)
  bindFeedViewObserve()
})

watch(
  [wrapperEl, middleScrollerEl, () => chain.value.map((p) => p.id).join(',')],
  () => { bindFeedViewObserve() },
  { flush: 'post' },
)

// When an optimistic post is replaced by the real server post in place (same component
// instance kept via stable :key), the post id changes. Re-register so keyboard focus
// tracking stays in sync with the real id.
watch(() => props.post.id, (newId, oldId) => {
  if (oldId && oldId !== newId) unregisterPost(oldId)
  registerPost(props.post)
})

onBeforeUnmount(() => {
  unregisterPost(props.post.id)
  stopObserve?.()
  stopObserve = null
})
</script>
