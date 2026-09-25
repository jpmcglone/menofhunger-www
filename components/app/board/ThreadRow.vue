<!-- Figma: https://www.figma.com/design/YnuRSJB7p90n9jEY4mb4RN?node-id=890-4564 -->
<template>
  <article
    ref="rowEl"
    class="relative flex items-start gap-2.5 py-3 pl-3 pr-4 transition-colors hover:bg-[var(--moh-surface-hover)]"
    :style="scopeStyle"
  >
    <NuxtLink :to="threadHref" class="absolute inset-0 z-[1]" tabindex="-1" aria-hidden="true" />

    <AppBoardBoostButton
      :post-id="thread.id"
      :points="thread.points"
      :viewer-has-boosted="thread.viewerHasBoosted"
      :disabled="!thread.viewerCanAccess"
      vertical
    />

    <div class="relative z-[2] min-w-0 flex-1 pointer-events-none">
      <div class="flex items-start gap-1.5">
        <Icon v-if="!thread.viewerCanAccess" name="tabler:lock" class="mt-0.5 shrink-0 text-[15px] moh-text-muted" aria-hidden="true" />
        <a
          v-if="externalUrl"
          :href="externalUrl"
          target="_blank"
          rel="noopener noreferrer nofollow ugc"
          class="group/title pointer-events-auto text-[15px] font-semibold leading-snug moh-text hover:underline break-words"
        >{{ thread.title }}<Icon
          name="tabler:arrow-up-right"
          class="ml-0.5 inline-block align-[-0.1em] text-[0.95em] moh-text-soft transition-transform group-hover/title:-translate-y-px group-hover/title:translate-x-px group-hover/title:text-[var(--moh-text)]"
          aria-hidden="true"
        /><span class="sr-only"> (opens {{ thread.domain || 'link' }} in a new tab)</span></a>
        <NuxtLink
          v-else
          :to="threadHref"
          class="pointer-events-auto text-[15px] font-semibold leading-snug break-words hover:underline"
          :class="thread.viewerCanAccess ? 'moh-text' : 'moh-text-muted'"
        >{{ thread.title }}</NuxtLink>
      </div>

      <div class="mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs moh-text-soft">
        <NuxtLink
          v-if="thread.domain && thread.viewerCanAccess"
          :to="{ path: '/b', query: { domain: thread.domain } }"
          class="pointer-events-auto hover:underline"
        >{{ thread.domain }}</NuxtLink>
        <AppBoardScopeChip :visibility="thread.visibility" />
        <AppBoardTagChip v-for="tag in thread.tags" :key="tag" :tag="tag" class="pointer-events-auto" />
        <template v-if="thread.author">
          <NuxtLink
            :to="`/u/${encodeURIComponent(thread.author.username ?? '')}`"
            class="pointer-events-auto inline-flex items-center gap-1 hover:underline"
            :style="{ color: authorColor }"
            @mouseenter="(e: MouseEvent) => preview.onEnter(thread.author?.username, e)"
            @mousemove="preview.onMove"
            @mouseleave="preview.onLeave"
          >
            <AppUserAvatar :user="thread.author" size-class="h-5 w-5" :enable-preview="false" :show-presence="false" :show-status="false" />
            {{ thread.author.username }}
          </NuxtLink>
        </template>
        <span :title="createdTitle">{{ age }}</span>
        <template v-if="commentsLabel">
          <span aria-hidden="true">·</span>
          <span>{{ commentsLabel }}</span>
        </template>
        <AppTypingIndicator
          v-if="typingUsers.length && thread.viewerCanAccess"
          :users="typingUsers"
          verb="replying"
          size="compact"
          :hover-preview="false"
          class="pointer-events-auto"
        />
      </div>
    </div>

    <div class="relative z-[2] flex shrink-0 items-center gap-3 self-center">
      <NuxtLink
        v-if="!thread.viewerCanAccess"
        :to="gateTo"
        class="rounded-full border px-2.5 py-1 text-xs font-semibold"
        :style="{ color: `var(--moh-${gateTone})`, borderColor: `var(--moh-${gateTone})` }"
      >Unlock</NuxtLink>
      <img
        v-else-if="thread.image?.url"
        :src="thread.image.thumbnailUrl || thread.image.url"
        :alt="thread.image.alt || ''"
        class="h-14 w-14 rounded-lg object-cover pointer-events-none"
        loading="lazy"
      >
      <AppPostRowViewerBreakdown
        v-if="thread.viewerCanAccess"
        :entity-id="thread.id"
        :breakdown-path="`/posts/${encodeURIComponent(thread.id)}/views/breakdown`"
        :viewer-count="liveViews.viewerCount"
        :total-view-count="liveViews.totalViewCount"
        :has-viewed="liveViews.hasViewed"
        @count-synced="onViewCountSynced"
      />
    </div>

    <div class="relative z-[2] -my-1 -mr-2 shrink-0">
      <button
        type="button"
        class="moh-tap moh-focus inline-flex size-9 items-center justify-center rounded-full moh-text-soft hover:bg-[var(--moh-surface-hover)] hover:text-[var(--moh-text)]"
        aria-label="More"
        aria-haspopup="true"
        @click.stop.prevent="toggleMenu($event)"
      >
        <Icon name="tabler:dots" class="text-[16px]" aria-hidden="true" />
      </button>
      <Menu v-if="menuMounted" ref="menuRef" :model="menuItems" popup>
        <template #item="{ item, props: itemProps }">
          <a v-bind="itemProps.action" class="flex items-center gap-2">
            <Icon v-if="item.iconName" :name="item.iconName" aria-hidden="true" />
            <span v-bind="itemProps.label">{{ item.label }}</span>
          </a>
        </template>
      </Menu>
    </div>
  </article>
</template>

<script setup lang="ts">
import type { MenuItem } from 'primevue/menuitem'
import type { BoardThread } from '~/types/api'
import { useAutoToggleMenu } from '~/composables/useAutoToggleMenu'
import { formatListTime, formatDateTime } from '~/utils/time-format'
import { userActionColor } from '~/utils/user-tier'

const props = withDefaults(defineProps<{ thread: BoardThread; showHide?: boolean }>(), { showHide: false })
const emit = defineEmits<{ 'toggle-hide': [thread: BoardThread] }>()

const preview = useUserPreviewMultiTrigger()
const { gateCopy } = useBoardAccess()

const threadHref = computed(() => boardThreadHref(props.thread))
const discussionHref = computed(() => boardDiscussionHref(props.thread))
const externalUrl = computed(() => (props.thread.viewerCanAccess && props.thread.url && !props.thread.articleId ? props.thread.url : null))
const age = computed(() => formatListTime(props.thread.createdAt))
const createdTitle = computed(() => formatDateTime(props.thread.createdAt))
// Subscribes this row to its thread room: live counts land in the post cache, typing here.
const { typingUsers } = usePostTyping(computed(() => props.thread.id))
const postCache = usePostCache()
const liveCommentCount = computed(() => postCache.cache.value[props.thread.id]?.commentCount ?? props.thread.commentCount)

// Views work exactly like feed posts: a row that stays on screen counts an impression, and the
// chip shows people · total views with the same hover breakdown.
const rowEl = ref<HTMLElement | null>(null)
const { observe: observeView, hasViewedLocally } = usePostViewTracker()
const liveViews = computed(() => {
  const delta = postCache.cache.value[props.thread.id]
  const viewerCount = Math.max(props.thread.viewerCount, delta?.viewerCount ?? 0)
  const totalViewCount = Math.max(viewerCount, props.thread.totalViewCount, delta?.totalViewCount ?? 0)
  const hasViewed = Boolean(props.thread.viewerHasViewed || delta?.viewerHasViewed || hasViewedLocally(props.thread.id))
  return { viewerCount, totalViewCount, hasViewed }
})
function onViewCountSynced(payload: { viewerCount: number, totalViewCount: number }) {
  postCache.patch(props.thread.id, {
    viewerCount: Math.max(liveViews.value.viewerCount, payload.viewerCount),
    totalViewCount: Math.max(liveViews.value.totalViewCount, payload.totalViewCount),
  })
}
let stopObserve: (() => void) | null = null
watch(
  [rowEl, () => props.thread.id, () => props.thread.viewerCanAccess],
  ([el, id, canAccess]) => {
    stopObserve?.()
    stopObserve = el && canAccess ? observeView(id, el) : null
  },
  { flush: 'post' },
)
onBeforeUnmount(() => {
  stopObserve?.()
  stopObserve = null
})
const commentsLabel = computed(() => {
  const n = liveCommentCount.value
  if (n === 0) return null
  return `${n} ${n === 1 ? 'comment' : 'comments'}`
})

const { mounted: menuMounted, menuRef, toggle: toggleMenu } = useAutoToggleMenu()
type BoardMenuItem = MenuItem & { iconName?: string }
const menuItems = computed<BoardMenuItem[]>(() => {
  const items: BoardMenuItem[] = [
    { label: 'Discuss', iconName: 'tabler:message-circle', command: () => void navigateTo(discussionHref.value) },
  ]
  if (props.thread.viewerHidden || props.showHide) {
    items.push({
      label: props.thread.viewerHidden ? 'Unhide' : 'Hide',
      iconName: props.thread.viewerHidden ? 'tabler:eye' : 'tabler:eye-off',
      command: () => emit('toggle-hide', props.thread),
    })
  }
  return items
})
const tone = computed(() => boardScopeTone(props.thread.visibility))
const scopeStyle = computed(() => (tone.value ? { boxShadow: `inset 3px 0 0 var(--moh-${tone.value})` } : undefined))
const authorColor = computed(() => (props.thread.author ? userActionColor(props.thread.author) : undefined))
const gate = computed(() => gateCopy(props.thread.visibility, props.thread.commentCount))
const gateTone = computed(() => gate.value.tone)
const gateTo = computed(() => gate.value.ctaTo)
</script>
