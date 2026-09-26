<!-- Figma: https://www.figma.com/design/YnuRSJB7p90n9jEY4mb4RN?node-id=904-399 -->
<template>
  <div
    ref="rowEl"
    class="relative flex gap-2.5 pt-3 pr-2.5 pb-1 pl-4 transition-colors"
    :class="clickable ? 'cursor-pointer hover:bg-[var(--moh-surface-hover)]' : ''"
    :role="clickable ? 'link' : undefined"
    :tabindex="clickable ? 0 : undefined"
    data-board-feed-row="comment"
    @click="onRowClick"
    @auxclick="onRowAuxClick"
    @keydown.enter.self.prevent="goToComment"
    @keydown.space.self.prevent="goToComment"
  >
    <NuxtLink
      v-if="clickable"
      :to="href"
      class="absolute inset-0 z-[1]"
      tabindex="-1"
      aria-hidden="true"
    />

    <component
      :is="profilePath ? NuxtLink : 'div'"
      :to="profilePath ?? undefined"
      class="relative z-10 h-8 w-8 shrink-0"
      :aria-label="profilePath ? `View @${author.username} profile` : undefined"
    >
      <AppUserAvatar :user="author" size-class="h-8 w-8" bg-class="moh-surface" :show-status="false" />
    </component>

    <div class="relative z-[2] min-w-0 flex-1">
      <div class="flex min-w-0 items-center gap-1.5">
        <component
          :is="profilePath ? NuxtLink : 'span'"
          :to="profilePath ?? undefined"
          class="relative z-10 truncate text-sm font-semibold moh-text"
          :class="profilePath ? 'hover:underline' : ''"
          @mouseenter="preview.onEnter"
          @mousemove="preview.onMove"
          @mouseleave="preview.onLeave"
        >{{ author.name || author.username || 'User' }}</component>
        <AppVerifiedBadge
          :status="author.verifiedStatus"
          :premium="author.premium"
          :premium-plus="author.premiumPlus"
          :is-organization="author.isOrganization"
        />
        <span class="shrink-0 whitespace-nowrap text-[13px] moh-text-soft">
          <template v-if="author.username">@{{ author.username }} · </template><span v-tooltip.bottom="ageTooltip">{{ age }}</span>
        </span>
      </div>

      <NuxtLink
        :to="href"
        class="relative z-10 mt-0.5 flex min-w-0 items-center gap-1 text-[13px] hover:underline"
        style="color: var(--moh-verified)"
        data-board-comment-context
      >
        <Icon name="tabler:layout-list" class="shrink-0 text-[13px]" aria-hidden="true" />
        <span class="truncate">{{ contextVerb }}<template v-if="parentHandle"> <span class="font-medium">@{{ parentHandle }}</span> on</template> <span :class="threadTitle ? 'font-medium' : ''">{{ threadTitle || 'a Board post' }}</span></span>
      </NuxtLink>

      <template v-if="locked">
        <NuxtLink
          :to="gate.ctaTo"
          class="relative z-10 mt-1.5 inline-flex min-h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold"
          :style="{ color: `var(--moh-${gate.tone})`, borderColor: `var(--moh-${gate.tone})` }"
          data-board-gate
        >
          <Icon name="tabler:lock" class="text-[13px]" aria-hidden="true" />
          {{ gate.ctaLabel }}
        </NuxtLink>
      </template>
      <template v-else>
        <p v-if="body" class="mt-1 whitespace-pre-wrap break-words text-[15px] leading-snug moh-text">{{ body }}</p>
        <AppPostRowLinkPreview
          v-if="hasLink"
          class="relative z-10"
          :post-id="post.id"
          :body="body"
          :has-media="false"
          :row-in-view="rowInView"
        />
      </template>

      <div class="relative z-10 mt-1">
        <slot name="actions" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { FeedPost, PostAuthor } from '~/types/api'
import { useInViewOnce } from '~/composables/useInViewOnce'
import { useMiddleScroller } from '~/composables/useMiddleScroller'

/** Layout for a Board comment in post feeds; PostRow supplies the action row through a slot. */
const props = withDefaults(defineProps<{
  post: FeedPost
  author: PostAuthor
  profilePath: string | null
  /** Comment permalink (/b/:threadId/c/:commentId). */
  href: string
  age: string
  // PrimeVue tooltip binding accepts objects.
  ageTooltip?: any
  clickable?: boolean
}>(), { clickable: true, ageTooltip: undefined })

const NuxtLink = resolveComponent('NuxtLink')
const { gateCopy } = useBoardAccess()
const preview = useUserPreviewTrigger({
  username: computed(() => props.author.username ?? ''),
  enabled: computed(() => Boolean(props.profilePath)),
})

const locked = computed(() => props.post.viewerCanAccess === false)
const body = computed(() => (props.post.body ?? '').trim())
const hasLink = computed(() => /https?:\/\/|\bwww\./i.test(body.value))

const threadId = computed(() => props.post.boardRootId || null)
/** A reply to another comment, rather than directly to the thread. */
const isReplyToComment = computed(() => Boolean(props.post.parentId && threadId.value && props.post.parentId !== threadId.value))
const parentHandle = computed(() => (isReplyToComment.value ? (props.post.parent?.author?.username ?? '').trim() || null : null))
const contextVerb = computed(() => {
  if (!isReplyToComment.value) return 'commented on'
  return parentHandle.value ? 'replied to' : 'replied on'
})
/** Comments carry `boardThreadTitle`; older payloads fall back to the parent chain. */
const threadTitle = computed(() => {
  const direct = props.post.boardThreadTitle?.trim()
  if (direct) return direct
  let p: FeedPost | undefined = props.post.parent
  while (p) {
    if (p.board?.title) return p.board.title
    p = p.parent
  }
  return null
})

const gate = computed(() => gateCopy(props.post.visibility as Parameters<typeof gateCopy>[0]))

const rowEl = ref<HTMLElement | null>(null)
const middleScrollerEl = useMiddleScroller()
const { inView: rowInView } = useInViewOnce(rowEl, { root: middleScrollerEl, rootMargin: '250px 0px', threshold: 0.01 })

function isInteractiveTarget(target: EventTarget | null): boolean {
  const raw = target as Node | null
  const el = raw instanceof Element ? raw : raw?.parentElement ?? null
  if (!el) return false
  return Boolean(el.closest([
    'a', 'button', 'iframe', 'video', 'audio', 'input', 'textarea', 'select',
    '[role="button"]', '[role="menu"]', '[role="menuitem"]', '[data-post-row-interactive]', '[data-pc-section]',
  ].join(',')))
}

function goToComment() {
  if (!props.clickable) return
  void navigateTo(props.href)
}

function onRowClick(e: MouseEvent) {
  if (!props.clickable || isInteractiveTarget(e.target)) return
  if (e.metaKey || e.ctrlKey) {
    window.open(props.href, '_blank')
    return
  }
  goToComment()
}

function onRowAuxClick(e: MouseEvent) {
  if (!props.clickable || e.button !== 1 || isInteractiveTarget(e.target)) return
  e.preventDefault()
  window.open(props.href, '_blank')
}
</script>
