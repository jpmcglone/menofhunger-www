<!-- Figma: https://www.figma.com/design/YnuRSJB7p90n9jEY4mb4RN?node-id=890-4564 -->
<template>
  <article
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
          class="pointer-events-auto text-[15px] font-semibold leading-snug moh-text hover:underline break-words"
        >{{ thread.title }}</a>
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
        <span aria-hidden="true">·</span>
        <NuxtLink :to="discussionHref" class="pointer-events-auto hover:underline">{{ commentsLabel }}</NuxtLink>
        <button
          v-if="thread.viewerHidden || showHide"
          type="button"
          class="pointer-events-auto hover:underline"
          @click.stop.prevent="emit('toggle-hide', thread)"
        >{{ thread.viewerHidden ? 'unhide' : 'hide' }}</button>
      </div>
    </div>

    <NuxtLink
      v-if="!thread.viewerCanAccess"
      :to="gateTo"
      class="relative z-[2] shrink-0 self-center rounded-full border px-2.5 py-1 text-xs font-semibold"
      :style="{ color: `var(--moh-${gateTone})`, borderColor: `var(--moh-${gateTone})` }"
    >Unlock</NuxtLink>
    <img
      v-else-if="thread.image?.url"
      :src="thread.image.thumbnailUrl || thread.image.url"
      :alt="thread.image.alt || ''"
      class="relative z-[2] h-14 w-14 shrink-0 rounded-lg object-cover pointer-events-none"
      loading="lazy"
    >
  </article>
</template>

<script setup lang="ts">
import type { BoardThread } from '~/types/api'
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
const commentsLabel = computed(() => {
  const n = props.thread.commentCount
  if (n === 0) return 'discuss'
  return `${n} ${n === 1 ? 'comment' : 'comments'}`
})
const tone = computed(() => boardScopeTone(props.thread.visibility))
const scopeStyle = computed(() => (tone.value ? { boxShadow: `inset 3px 0 0 var(--moh-${tone.value})` } : undefined))
const authorColor = computed(() => (props.thread.author ? userActionColor(props.thread.author) : undefined))
const gate = computed(() => gateCopy(props.thread.visibility, props.thread.commentCount))
const gateTone = computed(() => gate.value.tone)
const gateTo = computed(() => gate.value.ctaTo)
</script>
