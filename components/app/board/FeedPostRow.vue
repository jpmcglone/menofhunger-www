<!-- Figma: https://www.figma.com/design/YnuRSJB7p90n9jEY4mb4RN?node-id=903-403 -->
<template>
  <div
    ref="rowEl"
    class="relative flex gap-2 pt-2 pr-4 pb-1 pl-1 transition-colors"
    :class="clickable ? 'cursor-pointer hover:bg-[var(--moh-surface-hover)]' : ''"
    :style="scopeStyle"
    :role="clickable ? 'link' : undefined"
    :tabindex="clickable ? 0 : undefined"
    data-board-feed-row="post"
    @click="onRowClick"
    @auxclick="onRowAuxClick"
    @keydown.enter.self.prevent="goToThread"
    @keydown.space.self.prevent="goToThread"
  >
    <NuxtLink
      v-if="clickable"
      :to="href"
      class="absolute inset-0 z-[1]"
      tabindex="-1"
      aria-hidden="true"
    />

    <div class="relative z-10 flex w-11 shrink-0 justify-center">
      <AppBoardBoostButton
        :post-id="post.id"
        :points="post.boostCount"
        :viewer-has-boosted="Boolean(post.viewerHasBoosted)"
        :disabled="locked"
        vertical
      />
    </div>

    <div class="relative z-[2] flex min-w-0 flex-1 flex-col gap-1.5">
      <div class="flex min-h-5 items-center gap-1.5 text-xs">
        <div class="flex min-w-0 flex-1 flex-wrap items-center gap-x-1.5 gap-y-0.5">
          <Icon name="tabler:layout-list" class="shrink-0 text-[14px] moh-text-soft" aria-hidden="true" />
          <span class="font-medium moh-text-muted">Board</span>
          <template v-if="articleLabel">
            <span class="moh-text-soft" aria-hidden="true">·</span>
            <span class="font-medium moh-text-muted">{{ articleLabel }}</span>
          </template>
          <AppBoardScopeChip :visibility="post.visibility" />
          <span v-for="tag in tags" :key="tag" class="moh-text-soft">#{{ tag }}</span>
        </div>
        <div class="relative z-20 -my-2 flex shrink-0 items-center" data-post-row-interactive>
          <slot name="menu" />
        </div>
      </div>

      <p class="flex items-start gap-1.5 text-base font-semibold leading-snug break-words">
        <Icon v-if="locked" name="tabler:lock" class="mt-1 shrink-0 text-[15px] moh-text-muted" aria-hidden="true" />
        <span class="min-w-0">
          <NuxtLink
            :to="titleHref"
            class="relative z-10 hover:underline"
            :class="locked ? 'moh-text-muted' : 'moh-text'"
          >{{ title }}</NuxtLink>
          <span v-if="domain" class="ml-1.5 text-[13px] font-normal moh-text-soft">{{ domain }}</span>
        </span>
      </p>

      <p v-if="locked" class="text-[13px] moh-text-soft">
        {{ age }}<template v-if="commentCount > 0"> · {{ commentCount }} {{ commentCount === 1 ? 'comment' : 'comments' }}</template>
      </p>
      <div v-else class="flex min-w-0 items-center gap-1.5 text-[13px]">
        <component
          :is="profilePath ? NuxtLink : 'span'"
          :to="profilePath ?? undefined"
          class="relative z-10 inline-flex min-w-0 items-center gap-1.5"
          :class="profilePath ? 'hover:underline' : ''"
          :aria-label="profilePath ? `View @${author.username} profile` : undefined"
          @mouseenter="preview.onEnter"
          @mousemove="preview.onMove"
          @mouseleave="preview.onLeave"
        >
          <AppUserAvatar :user="author" size-class="h-5 w-5" :enable-preview="false" :show-presence="false" :show-status="false" />
          <span class="truncate font-medium moh-text">{{ author.name || author.username || 'User' }}</span>
        </component>
        <AppVerifiedBadge
          :status="author.verifiedStatus"
          :premium="author.premium"
          :premium-plus="author.premiumPlus"
          :is-organization="author.isOrganization"
        />
        <span class="shrink-0 whitespace-nowrap moh-text-soft">
          <template v-if="author.username">@{{ author.username }} · </template><span v-tooltip.bottom="ageTooltip">{{ age }}</span>
        </span>
      </div>

      <p v-if="!locked && excerpt" class="line-clamp-3 whitespace-pre-wrap break-words text-sm moh-text-muted">{{ excerpt }}</p>

      <template v-if="!locked">
        <AppPostMediaGrid v-if="post.media?.length" class="relative z-10" :media="post.media" :post-id="post.id" :row-in-view="rowInView" />
        <AppPostRowLinkPreview
          v-else-if="linkUrl"
          class="relative z-10"
          :post-id="post.id"
          :body="linkUrl"
          :has-media="false"
          :row-in-view="rowInView"
          :video-embed="post.videoEmbed ?? null"
        />
      </template>

      <div v-if="locked" class="relative z-10 flex items-center gap-2">
        <NuxtLink
          :to="gate.ctaTo"
          class="inline-flex min-h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold"
          :style="{ color: `var(--moh-${gate.tone})`, borderColor: `var(--moh-${gate.tone})` }"
          data-board-gate
        >
          <Icon name="tabler:lock" class="text-[13px]" aria-hidden="true" />
          {{ gate.ctaLabel }}
        </NuxtLink>
        <div class="ml-auto">
          <slot name="actions" />
        </div>
      </div>
      <div v-else class="relative z-10">
        <slot name="actions" />
      </div>

      <div v-if="$slots.footer" class="relative z-10">
        <slot name="footer" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { FeedPost, PostAuthor } from '~/types/api'
import { useInViewOnce } from '~/composables/useInViewOnce'
import { useMiddleScroller } from '~/composables/useMiddleScroller'

/** Layout for a Board thread in post feeds; PostRow supplies menus and actions through slots. */
const props = withDefaults(defineProps<{
  post: FeedPost
  author: PostAuthor
  profilePath: string | null
  /** Board thread permalink (/b/:id). */
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
const board = computed(() => props.post.board ?? null)
const article = computed(() => props.post.article ?? null)
const title = computed(() => board.value?.title || article.value?.title || 'Board post')
const tags = computed(() => board.value?.tags ?? [])
const articleLabel = computed(() => (article.value ? 'Article' : null))
const titleHref = computed(() =>
  article.value && !locked.value ? `/a/${encodeURIComponent(article.value.id)}` : props.href,
)
const domain = computed(() => (locked.value || article.value ? null : board.value?.domain ?? null))
const linkUrl = computed(() => (article.value ? null : board.value?.url ?? null))
const excerpt = computed(() => (props.post.body ?? '').trim() || (article.value?.excerpt ?? '').trim())
const commentCount = computed(() => Math.max(0, Math.floor(Number(props.post.commentCount ?? 0))))
const gate = computed(() => gateCopy(props.post.visibility as Parameters<typeof gateCopy>[0], commentCount.value))

const tone = computed(() => boardScopeTone(props.post.visibility))
const scopeStyle = computed(() => (tone.value ? { boxShadow: `inset 3px 0 0 var(--moh-${tone.value})` } : undefined))

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

function goToThread() {
  if (!props.clickable) return
  void navigateTo(props.href)
}

function onRowClick(e: MouseEvent) {
  if (!props.clickable || isInteractiveTarget(e.target)) return
  if (e.metaKey || e.ctrlKey) {
    window.open(props.href, '_blank')
    return
  }
  goToThread()
}

function onRowAuxClick(e: MouseEvent) {
  if (!props.clickable || e.button !== 1 || isInteractiveTarget(e.target)) return
  e.preventDefault()
  window.open(props.href, '_blank')
}
</script>
