<template>
  <div :id="`c-${comment.id}`" class="relative">
    <div
      class="flex gap-3 py-2.5 transition-colors"
      :class="isHighlighted ? 'bg-[var(--moh-surface-hover)]' : ''"
      :style="{ paddingLeft: `${16 + visualDepth * 14}px`, paddingRight: '16px' }"
    >
      <span
        v-for="guide in visualDepth"
        :key="guide"
        class="absolute top-0 bottom-0 w-px bg-[var(--moh-border-subtle)]"
        :style="{ left: `${16 + (guide - 1) * 14 + 4}px` }"
        aria-hidden="true"
      />
      <div class="min-w-0 flex-1">
        <div class="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs">
          <template v-if="comment.deleted">
            <span class="moh-text-soft">[deleted]</span>
          </template>
          <template v-else-if="isTopLevel">
            <AppUserAvatar :user="comment.author" size-class="h-7 w-7" :show-status="false" />
            <NuxtLink
              :to="profileHref"
              class="text-sm font-semibold moh-text hover:underline"
              @mouseenter="preview.onEnter"
              @mousemove="preview.onMove"
              @mouseleave="preview.onLeave"
            >{{ comment.author.name || comment.author.username }}</NuxtLink>
            <AppVerifiedBadge
              :status="comment.author.verifiedStatus"
              :premium="comment.author.premium"
              :premium-plus="comment.author.premiumPlus"
              :is-organization="comment.author.isOrganization"
            />
            <span class="moh-text-soft">@{{ comment.author.username }}</span>
          </template>
          <NuxtLink
            v-else
            :to="profileHref"
            class="font-semibold hover:underline"
            :style="{ color: authorColor }"
            @mouseenter="preview.onEnter"
            @mousemove="preview.onMove"
            @mouseleave="preview.onLeave"
          >{{ comment.author.username }}</NuxtLink>
          <span class="moh-text-soft" aria-hidden="true">·</span>
          <NuxtLink :to="permalink" class="moh-text-soft hover:underline" :title="createdTitle">{{ age }}</NuxtLink>
          <button
            type="button"
            class="moh-focus rounded px-0.5 moh-text-soft hover:text-[var(--moh-text)]"
            :aria-expanded="!collapsed"
            :aria-label="collapsed ? 'Expand comment' : 'Collapse comment'"
            @click="collapsed = !collapsed"
          >{{ collapsed ? `[+${hiddenCount}]` : '[–]' }}</button>
        </div>

        <template v-if="!collapsed">
          <p v-if="!comment.deleted" class="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed moh-text">{{ comment.body }}</p>
          <div v-if="!comment.deleted" class="mt-1 flex items-center gap-3 text-xs">
            <AppBoardBoostButton :post-id="comment.id" :points="comment.points" :viewer-has-boosted="comment.viewerHasBoosted" />
            <button
              v-if="ctx?.canReply.value"
              type="button"
              class="moh-tap moh-focus min-h-9 font-medium moh-text-muted hover:text-[var(--moh-text)]"
              @click="onReplyClick"
            >Reply</button>
            <button
              v-if="isOwn"
              type="button"
              class="moh-tap moh-focus min-h-9 moh-text-soft hover:text-red-500"
              @click="onDelete"
            >Delete</button>
          </div>
          <AppBoardCommentComposer
            v-if="replying && ctx"
            class="mt-2"
            :thread-id="ctx.threadId.value"
            :parent-id="comment.id"
            :placeholder="`Reply to ${comment.author.username ?? 'this comment'}…`"
            submit-label="Reply"
            :show-avatar="false"
            autofocus
            cancellable
            @created="onReplied"
            @cancel="replying = false"
          />
        </template>
      </div>
    </div>

    <template v-if="!collapsed && comment.replies.length">
      <NuxtLink
        v-if="atDepthCap"
        :to="permalink"
        class="block py-2 text-xs font-medium hover:underline"
        :style="{ paddingLeft: `${16 + (visualDepth + 1) * 14}px`, color: 'var(--moh-verified)' }"
      >Continue thread ({{ hiddenCount }}) →</NuxtLink>
      <template v-else>
        <AppBoardCommentRow
          v-for="reply in comment.replies"
          :key="reply.id"
          :comment="reply"
          :depth="depth + 1"
        />
      </template>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { BoardComment } from '~/types/api'
import { formatListTime, formatDateTime } from '~/utils/time-format'
import { userActionColor } from '~/utils/user-tier'
import { getApiErrorMessage } from '~/utils/api-error'

const props = defineProps<{ comment: BoardComment; depth: number }>()

const ctx = inject(BOARD_COMMENT_TREE_KEY, null)
const { user } = useAuth()
const { requireMember } = useBoardAccess()
const api = useBoardApi()
const toast = useAppToast()
const preview = useUserPreviewTrigger({ username: computed(() => props.comment.author.username ?? '') })

const collapsed = ref(false)
const replying = ref(false)
const isTopLevel = computed(() => props.depth === 0)
const maxDepth = computed(() => ctx?.maxDepth ?? 8)
const visualDepth = computed(() => Math.min(props.depth, maxDepth.value))
const atDepthCap = computed(() => props.depth + 1 >= maxDepth.value)
const hiddenCount = computed(() => countBoardReplies(props.comment))
const isOwn = computed(() => Boolean(user.value?.id && user.value.id === props.comment.author.id))
const isHighlighted = computed(() => ctx?.highlightId.value === props.comment.id)
const permalink = computed(() => boardCommentHref(props.comment.threadId, props.comment.id))
const profileHref = computed(() => `/u/${encodeURIComponent(props.comment.author.username ?? '')}`)
const age = computed(() => formatListTime(props.comment.createdAt))
const createdTitle = computed(() => formatDateTime(props.comment.createdAt))
const authorColor = computed(() => userActionColor(props.comment.author))

function onReplyClick() {
  if (!requireMember('comment')) return
  replying.value = !replying.value
}

function onReplied(created: BoardComment) {
  replying.value = false
  ctx?.add(created)
}

async function onDelete() {
  if (!confirm('Delete this comment?')) return
  try {
    await api.deleteComment(props.comment.id)
    ctx?.remove(props.comment.id)
  } catch (e) {
    toast.push({ title: getApiErrorMessage(e) || 'Couldn’t delete the comment.', tone: 'error', durationMs: 2200 })
  }
}
</script>
