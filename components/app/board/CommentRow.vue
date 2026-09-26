<template>
  <div :id="`c-${comment.id}`" class="relative">
    <div
      class="flex gap-3 py-2.5 transition-colors duration-700"
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
            <NuxtLink :to="profileHref" class="shrink-0" :aria-label="`View @${comment.author.username} profile`">
              <AppUserAvatar :user="comment.author" size-class="h-7 w-7" :show-status="false" />
            </NuxtLink>
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
            <span v-if="showHandle" class="moh-text-soft">@{{ comment.author.username }}</span>
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
          <AppNewBadge v-if="isNewSinceVisit" small label="NEW" />
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
          <AppPostRowLinkPreview
            v-if="hasLink"
            :post-id="comment.id"
            :body="comment.body"
            :has-media="false"
            :row-in-view="true"
          />
          <div v-if="!comment.deleted" class="mt-1 flex items-center gap-3 text-xs">
            <AppBoardBoostButton :post-id="comment.id" :points="comment.points" :viewer-has-boosted="comment.viewerHasBoosted" />
            <button
              v-if="ctx?.canReply.value"
              type="button"
              class="moh-tap moh-focus min-h-9 font-medium moh-text-muted hover:text-[var(--moh-text)]"
              @click="onReplyClick"
            >Reply</button>
            <button
              type="button"
              class="moh-tap moh-focus inline-flex size-9 items-center justify-center rounded-full moh-text-soft hover:bg-[var(--moh-surface-hover)] hover:text-[var(--moh-text)]"
              aria-label="More"
              aria-haspopup="true"
              @click.stop="toggleMenu($event)"
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
          <AppTypingIndicator
            v-if="replyingUsers.length"
            :users="replyingUsers"
            verb="replying"
            size="compact"
            class="mt-0.5"
          />
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
import type { MenuItem } from 'primevue/menuitem'
import type { BoardComment } from '~/types/api'
import { formatListTime, formatDateTime } from '~/utils/time-format'
import { userActionColor } from '~/utils/user-tier'
import { getApiErrorMessage } from '~/utils/api-error'
import { useAutoToggleMenu } from '~/composables/useAutoToggleMenu'
import { useCopyToClipboard } from '~/composables/useCopyToClipboard'

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
const isHighlighted = computed(() => ctx?.highlightId.value === props.comment.id || Boolean(ctx?.freshIds?.value.has(props.comment.id)))
const isNewSinceVisit = computed(() => Boolean(ctx?.newSinceVisitIds?.value.has(props.comment.id)))
const hasLink = computed(() => !props.comment.deleted && /https?:\/\/|\bwww\./i.test(props.comment.body))
const replyingUsers = computed(() => ctx?.typingFor?.(props.comment.id) ?? [])
const permalink = computed(() => boardCommentHref(props.comment.threadId, props.comment.id))
const profileHref = computed(() => `/u/${encodeURIComponent(props.comment.author.username ?? '')}`)
const showHandle = computed(() => authorHasDistinctName(props.comment.author))
const age = computed(() => formatListTime(props.comment.createdAt))
const createdTitle = computed(() => formatDateTime(props.comment.createdAt))
const authorColor = computed(() => userActionColor(props.comment.author))

const { confirm } = useAppConfirm()
const { copyText } = useCopyToClipboard()
const { mounted: menuMounted, menuRef, toggle: toggleMenu } = useAutoToggleMenu()
type BoardMenuItem = MenuItem & { iconName?: string }
const menuItems = computed<BoardMenuItem[]>(() => {
  const items: BoardMenuItem[] = [{ label: 'Copy link', iconName: 'tabler:link', command: () => void copyLink() }]
  if (isOwn.value) {
    items.push({
      label: 'Delete comment',
      iconName: 'tabler:trash',
      class: 'text-red-600 dark:text-red-400',
      command: () => void onDelete(),
    })
  }
  return items
})

async function copyLink() {
  try {
    await copyText(`${window.location.origin}${permalink.value}`)
    toast.push({ title: 'Link copied', tone: 'success', durationMs: 1400 })
  } catch {
    toast.push({ title: 'Copy failed', tone: 'error', durationMs: 1800 })
  }
}

function onReplyClick() {
  if (!requireMember('comment')) return
  replying.value = !replying.value
}

function onReplied(created: BoardComment) {
  replying.value = false
  ctx?.add(created)
}

async function onDelete() {
  const ok = await confirm({
    header: 'Delete comment?',
    message: props.comment.replies.length ? 'Replies stay under a [deleted] placeholder.' : 'This can’t be undone.',
    confirmLabel: 'Delete',
    confirmSeverity: 'danger',
  })
  if (!ok) return
  try {
    await api.deleteComment(props.comment.id)
    ctx?.remove(props.comment.id)
  } catch (e) {
    toast.push({ title: getApiErrorMessage(e) || 'Couldn’t delete the comment.', tone: 'error', durationMs: 2200 })
  }
}
</script>
