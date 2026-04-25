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
    <div class="flex items-center gap-1.5 px-4 pt-4 pb-0 text-xs moh-text-muted lg:pt-2">
      <Icon
        name="tabler:repeat"
        class="text-[13px] shrink-0"
        aria-hidden="true"
        :style="repostHeaderColor ? { color: repostHeaderColor } : undefined"
      />
      <NuxtLink
        v-if="reposterUsername"
        :to="`/u/${encodeURIComponent(reposterUsername)}`"
        class="font-semibold truncate hover:underline"
        :style="reposterNameColor ? { color: reposterNameColor } : undefined"
        @click.stop
        @mouseenter="onReposterEnter"
        @mousemove="onReposterMove"
        @mouseleave="onReposterLeave"
      >{{ reposterName }}</NuxtLink>
      <span v-else class="font-semibold truncate" :style="reposterNameColor ? { color: reposterNameColor } : undefined">{{ reposterName }}</span>
      <span :style="repostHeaderColor ? { color: repostHeaderColor } : undefined">reposted</span>
    </div>
    <!-- Original post content -->
    <AppPostRow
      :post="repostedPost"
      :no-padding-top="true"
      :no-border-bottom="false"
      :subtle-border-bottom="subtleBorderBottom"
      :activate-video-on-mount="activateVideoOnMount"
      :group-wall="groupWall"
      :feed-group="feedGroup"
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
      :no-padding-top="noPaddingTop"
      :no-border-bottom="false"
      :subtle-border-bottom="subtleBorderBottom"
      :activate-video-on-mount="activateVideoOnMount"
      :group-wall="groupWall"
      :feed-group="feedGroup"
      v-bind="$attrs"
      @deleted="$emit('deleted', $event)"
      @edited="$emit('edited', $event)"
      @group-pin-changed="$emit('groupPinChanged')"
    >
      <template v-if="showCollapsedFooter" #threadFooter>
        <NuxtLink
          :to="`/p/${encodeURIComponent(rootPostId!)}`"
          class="inline-flex items-center gap-2 rounded-lg px-2 py-1 text-sm font-semibold text-gray-700 transition-colors moh-surface-hover dark:text-gray-200 tabular-nums"
        >
          <Icon name="tabler:message-circle" class="text-[14px] opacity-70" aria-hidden="true" />
          {{ collapsedRepliesLabelFor(collapsedSiblingRepliesCount) }}
        </NuxtLink>
      </template>
    </AppPostRow>
  </div>

  <!-- Reply chain A -> B -> C: overlays on each row connect with no gap -->
  <div
    v-else
    :ref="(el) => captureWrapperEl(el)"
    class="flex flex-col"
    :data-post-id="post.id"
    :class="keyboardFocusClass"
    @mouseenter="onMouseEnter"
    @mouseleave="onMouseLeave"
  >
    <div
      v-for="(item, i) in chain"
      :key="item.id"
      :ref="item.id === highlightedPostId ? setHighlightedRef : undefined"
    >
      <AppPostRow
        :post="item"
        :highlight="highlightedPostId === item.id"
        :no-border-bottom="i < chain.length - 1"
        :no-padding-top="noPaddingTop || i > 0"
        :no-padding-bottom="i < chain.length - 1"
        :show-thread-line-above-avatar="i > 0"
        :show-thread-line-below-avatar="i < chain.length - 1"
        :thread-line-tint="threadLineTint"
        :activate-video-on-mount="i === chain.length - 1 ? activateVideoOnMount : undefined"
        :group-wall="i === chain.length - 1 ? groupWall : null"
        :feed-group="feedGroup"
        :subtle-border-bottom="subtleBorderBottom && i === chain.length - 1"
        v-bind="$attrs"
        @deleted="$emit('deleted', $event)"
        @edited="$emit('edited', $event)"
        @group-pin-changed="$emit('groupPinChanged')"
      >
        <!-- Suppress the "View N more replies" footer on the highlighted leaf:
             on /p/:id those replies are already rendered in the Replies section
             below, so the footer would be a misleading self-link. -->
        <template v-if="hiddenRepliesForIndex(i) > 0 && chain[i]!.id !== highlightedPostId" #threadFooter>
          <NuxtLink
            :to="`/p/${encodeURIComponent(chain[i]!.id)}`"
            class="inline-flex items-center gap-2 rounded-lg px-2 py-1 text-sm font-semibold text-gray-700 transition-colors moh-surface-hover dark:text-gray-200 tabular-nums"
          >
            <Icon name="tabler:message-circle" class="text-[14px] opacity-70" aria-hidden="true" />
            {{ collapsedRepliesLabelFor(hiddenRepliesForIndex(i)) }}
          </NuxtLink>
        </template>
      </AppPostRow>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { CommunityGroupShell, FeedPost } from '~/types/api'
import { userColorTier, userTierColorVar } from '~/utils/user-tier'
import { isPendingLocalId } from '~/composables/usePendingPostsManager'

defineEmits<{
  (e: 'deleted', id: string): void
  (e: 'edited', payload: { id: string; post: FeedPost }): void
  (e: 'groupPinChanged'): void
}>()

const props = withDefaults(
  defineProps<{
    post: FeedPost
    activateVideoOnMount?: boolean
    collapsedSiblingRepliesCount?: number
    /** Sort context for the collapsed replies footer label ("more new/trending replies"). */
    repliesSort?: 'new' | 'trending' | null
    /** When set, the post with this id is highlighted (e.g. the post being viewed on /p/:id). */
    highlightedPostId?: string | null
    /** Remove top padding from the first row (e.g. on post permalink page). */
    noPaddingTop?: boolean
    groupWall?: { groupId: string; viewerIsOwner: boolean } | null
    feedGroup?: CommunityGroupShell | null
    /** Softer bottom border between rows (e.g. combined groups feed). */
    subtleBorderBottom?: boolean
    /** Hide the extra thread footer when the surrounding feed already shows comment counts. */
    showCollapsedRepliesFooter?: boolean
  }>(),
  {
    highlightedPostId: null,
    noPaddingTop: false,
    collapsedSiblingRepliesCount: 0,
    repliesSort: null,
    groupWall: null,
    feedGroup: null,
    subtleBorderBottom: false,
    showCollapsedRepliesFooter: true,
  },
)

const { user: authUser } = useAuth()
const postCache = usePostCache()
const { getCommentCountBump } = usePostCountBumps()

// ── Flat repost detection ────────────────────────────────────────────────────
const isFlatRepost = computed(() => props.post.kind === 'repost' && Boolean(props.post.repostedPost))
const repostedPost = computed(() => props.post.repostedPost ?? null)

const reposterUsername = computed(() => props.post.author?.username ?? null)
const reposterIsMe = computed(() => Boolean(authUser.value?.id && authUser.value.id === props.post.author?.id))
const reposterName = computed(() => {
  if (reposterIsMe.value) return 'You'
  return (props.post.author?.name || props.post.author?.username) ?? 'Someone'
})
const reposterNameColor = computed(() => {
  const author = reposterIsMe.value ? authUser.value : props.post.author
  return userTierColorVar(userColorTier(author ?? null))
})
const repostHeaderColor = computed(() => {
  const v = repostedPost.value?.visibility ?? props.post.visibility
  if (v === 'verifiedOnly') return 'var(--moh-verified)'
  if (v === 'premiumOnly') return 'var(--moh-premium)'
  if (v === 'onlyMe') return 'var(--moh-onlyme)'
  return undefined
})
const { onEnter: onReposterEnter, onMove: onReposterMove, onLeave: onReposterLeave } = useUserPreviewTrigger({
  username: reposterUsername,
})

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

function liveCommentCountFor(post: FeedPost): number {
  return Math.max(0, Math.floor(post.commentCount ?? 0)) + getCommentCountBump(post.id)
}

const collapsedSiblingRepliesCount = computed(() => {
  const rawCollapsed = Math.max(0, Math.floor(props.collapsedSiblingRepliesCount ?? 0))
  const root = chain.value[0]
  if (!root) return rawCollapsed
  return Math.max(rawCollapsed, liveCommentCountFor(root))
})
const rootPostId = computed(() => chain.value[0]?.id ?? null)
const showCollapsedFooter = computed(() => Boolean(props.showCollapsedRepliesFooter && collapsedSiblingRepliesCount.value > 0 && rootPostId.value))

function collapsedRepliesLabelFor(n: number, omitSortQualifier = false) {
  const noun = n === 1 ? 'reply' : 'replies'
  if (omitSortQualifier) return `View ${n} more ${noun}`
  const qualifier = props.repliesSort === 'trending' ? 'trending' : (props.repliesSort === 'new' ? 'new' : null)
  return `View ${n} more${qualifier ? ` ${qualifier}` : ''} ${noun}`
}

// Back-compat with older render/hot-reload output: some clients may still reference
// `collapsedRepliesLabel` during HMR. Keep it defined to avoid runtime warnings.
const collapsedRepliesLabel = computed(() => collapsedRepliesLabelFor(collapsedSiblingRepliesCount.value))

function hiddenRepliesForIndex(i: number): number {
  const node = chain.value[i]
  if (!node?.id) return 0
  const total = liveCommentCountFor(node)
  const hasVisibleChild = i < chain.value.length - 1
  const hiddenDirectReplies = Math.max(0, total - (hasVisibleChild ? 1 : 0))
  return Math.max(node.threadCollapsedCount ?? 0, hiddenDirectReplies)
}

/** Root post visibility (primary post in the thread) for tier-based styling. */
const rootVisibility = computed(() => chain.value[0]?.visibility)

/** Thread line color tint based on root visibility. */
const threadLineTint = computed(() => {
  const v = rootVisibility.value
  if (v === 'verifiedOnly') return 'verified'
  return null
})

/** Ref to the DOM element of the highlighted row (exposed for scroll-into-view on /p/:id). */
const highlightedRowRef = ref<HTMLElement | null>(null)
function setHighlightedRef(el: unknown) {
  highlightedRowRef.value = Array.isArray(el) ? (el?.[0] as HTMLElement | null) ?? null : (el as HTMLElement | null) ?? null
}
defineExpose({ highlightedRowRef, getHighlightedEl: () => highlightedRowRef.value })

// Post view tracking: observe this row for 50% visibility for 1s
const { observe } = usePostViewTracker()
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

onMounted(() => {
  registerPost(props.post)
  // Observe the wrapper: when ≥50% visible for ≥1s, mark accessible chain posts as viewed.
  // Gated posts (viewerCanAccess === false) are excluded — viewer hasn't read the content.
  if (wrapperEl.value) {
    const postIds = chain.value
      .filter((p) => p.viewerCanAccess !== false && !isPendingLocalId(p.id))
      .map((p) => p.id)
      .filter(Boolean)
    if (postIds.length) stopObserve = observe(postIds, wrapperEl.value)
  }
})

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
