<template>
  <section class="moh-gutter-x pb-2 pt-1" :style="scopeStyle">
    <div class="flex items-start gap-2.5">
      <AppBoardBoostButton
        :post-id="thread.id"
        :points="thread.points"
        :viewer-has-boosted="thread.viewerHasBoosted"
        :disabled="!thread.viewerCanAccess"
        vertical
      />
      <div class="min-w-0 flex-1 pt-1">
        <h1 class="flex items-start gap-1.5 text-xl font-bold leading-snug moh-text break-words">
          <Icon v-if="!thread.viewerCanAccess" name="tabler:lock" class="mt-1 shrink-0 text-lg moh-text-muted" aria-hidden="true" />
          <a v-if="externalUrl" :href="externalUrl" target="_blank" rel="noopener noreferrer nofollow ugc" class="group/title hover:underline">{{ thread.title }}<Icon
            name="tabler:arrow-up-right"
            class="ml-1 inline-block align-[-0.1em] text-[0.8em] moh-text-soft transition-transform group-hover/title:-translate-y-px group-hover/title:translate-x-px group-hover/title:text-[var(--moh-text)]"
            aria-hidden="true"
          /><span class="sr-only"> (opens {{ thread.domain || 'link' }} in a new tab)</span></a>
          <NuxtLink v-else-if="thread.articleId && thread.viewerCanAccess" :to="`/a/${thread.articleId}`" class="hover:underline">{{ thread.title }}<Icon
            name="tabler:article"
            class="ml-1 inline-block align-[-0.1em] text-[0.8em] moh-text-soft"
            aria-hidden="true"
          /><span class="sr-only"> (read the article)</span></NuxtLink>
          <span v-else>{{ thread.title }}</span>
        </h1>
        <a
          v-if="externalUrl"
          :href="externalUrl"
          target="_blank"
          rel="noopener noreferrer nofollow ugc"
          class="mt-0.5 inline-block text-xs moh-text-soft hover:underline break-all"
        >{{ displayUrl }}</a>
      </div>
    </div>

    <div class="mt-2 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs moh-text-soft">
      <template v-if="thread.author">
        <NuxtLink
          :to="`/u/${encodeURIComponent(thread.author.username ?? '')}`"
          class="shrink-0"
          :aria-label="`View @${thread.author.username} profile`"
        >
          <AppUserAvatar :user="thread.author" size-class="h-5 w-5" :show-status="false" />
        </NuxtLink>
        <NuxtLink
          :to="`/u/${encodeURIComponent(thread.author.username ?? '')}`"
          class="font-semibold moh-text hover:underline"
          @mouseenter="preview.onEnter"
          @mousemove="preview.onMove"
          @mouseleave="preview.onLeave"
        >{{ thread.author.name || thread.author.username }}</NuxtLink>
        <AppVerifiedBadge
          :status="thread.author.verifiedStatus"
          :premium="thread.author.premium"
          :premium-plus="thread.author.premiumPlus"
          :is-organization="thread.author.isOrganization"
        />
        <span v-if="showHandle">@{{ thread.author.username }}</span>
        <span aria-hidden="true">·</span>
      </template>
      <AppBoardScopeChip :visibility="thread.visibility" />
      <AppBoardTagChip v-for="tag in thread.tags" :key="tag" :tag="tag" />
      <span :title="createdTitle">{{ age }}</span>
      <span v-if="thread.editedAt">· edited</span>
    </div>

    <template v-if="thread.viewerCanAccess">
      <p v-if="thread.body" class="mt-2.5 whitespace-pre-wrap break-words text-[15px] leading-relaxed moh-text">{{ thread.body }}</p>
      <AppPostMediaGrid v-if="thread.image?.url && !thread.articleId" :media="[thread.image]" :post-id="thread.id" />
      <!-- Same embeds as post rows (Spotify, YouTube, X, sites…); the post's link wins over body links. -->
      <AppPostRowLinkPreview
        v-if="previewBody"
        :post-id="thread.id"
        :body="previewBody"
        :has-media="Boolean(thread.image?.url)"
        :row-in-view="true"
      />

      <div class="mt-2 flex flex-wrap items-center gap-x-4 text-xs moh-text-muted">
        <span class="inline-flex items-center gap-1" :aria-label="`${liveCommentCount} comments`">
          <AppIconGlyph name="reply" :size="16" />
          <AppAnimatedCount :value="liveCommentCount" :format="formatShortCount" blank-zero :min-ch="2" />
        </span>
        <AppPostRowBookmarkButton
          :post-id="thread.id"
          :viewer-can-interact="isVerifiedMember"
          :initial-has-bookmarked="thread.viewerHasBookmarked"
          :initial-collection-ids="[]"
        />
        <AppPostRowShareMenu :can-share="true" :tooltip="shareTooltip" :items="shareItems" />
        <AppBoardCatchUpButton :post-id="thread.id" />
        <AppPostRowViewerBreakdown
          class="ml-auto"
          :entity-id="thread.id"
          :breakdown-path="`/posts/${encodeURIComponent(thread.id)}/views/breakdown`"
          :viewer-count="liveViews.viewerCount"
          :total-view-count="liveViews.totalViewCount"
          :has-viewed="liveViews.hasViewed"
          @count-synced="onViewCountSynced"
        />
        <template v-if="menuItems.length">
          <button
            type="button"
            class="moh-tap moh-focus -mr-2 inline-flex size-9 items-center justify-center rounded-full hover:bg-[var(--moh-surface-hover)] hover:text-[var(--moh-text)]"
            aria-label="More"
            aria-haspopup="true"
            @click.stop="toggleMenu($event)"
          >
            <Icon name="tabler:dots" class="text-[18px]" aria-hidden="true" />
          </button>
          <Menu v-if="menuMounted" ref="menuRef" :model="menuItems" popup>
            <template #item="{ item, props: itemProps }">
              <a v-bind="itemProps.action" class="flex items-center gap-2">
                <Icon v-if="item.iconName" :name="item.iconName" aria-hidden="true" />
                <span v-bind="itemProps.label">{{ item.label }}</span>
              </a>
            </template>
          </Menu>
        </template>
      </div>

      <form v-if="editing" class="mt-4 space-y-3 rounded-xl border moh-border p-3" @submit.prevent="saveEdit">
        <input v-model="editTitle" maxlength="80" class="w-full rounded-lg border moh-border bg-transparent px-3 py-2 text-sm moh-text outline-none" aria-label="Title">
        <input v-if="!thread.articleId" v-model="editUrl" type="url" placeholder="https://… (optional)" class="w-full rounded-lg border moh-border bg-transparent px-3 py-2 text-sm moh-text outline-none" aria-label="Link">
        <textarea v-model="editBody" rows="4" class="w-full rounded-lg border moh-border bg-transparent px-3 py-2 text-sm moh-text outline-none" aria-label="Text" />
        <p v-if="editError" class="text-xs text-red-500">{{ editError }}</p>
        <div class="flex justify-end gap-2">
          <button type="button" class="moh-tap px-3 text-sm moh-text-muted" @click="editing = false">Cancel</button>
          <AppActionButton label="Save" kind="brand" type="submit" :loading="saving" />
        </div>
      </form>
    </template>

    <div
      v-else
      class="mt-4 flex flex-col items-center gap-2 rounded-xl border px-5 py-6 text-center moh-surface-2"
      :style="{ borderColor: `var(--moh-${gate.tone})` }"
    >
      <Icon name="tabler:lock" class="text-xl moh-text-muted" aria-hidden="true" />
      <p class="text-sm font-semibold moh-text">{{ gate.title }}</p>
      <p class="max-w-sm text-sm moh-text-muted">{{ gate.body }}</p>
      <Button as="NuxtLink" :to="gate.ctaTo" :label="gate.ctaLabel" rounded size="small" class="mt-1" />
    </div>

    <AppReportDialog
      v-model:visible="reportOpen"
      target-type="post"
      :subject-post-id="thread.id"
      :subject-label="`@${thread.author?.username || 'user'}`"
    />
  </section>
</template>

<script setup lang="ts">
import type { MenuItem } from 'primevue/menuitem'
import type { BoardThread } from '~/types/api'
import { formatListTime, formatDateTime } from '~/utils/time-format'
import { formatShortCount } from '~/utils/text'
import { getApiErrorMessage } from '~/utils/api-error'
import { useCopyToClipboard } from '~/composables/useCopyToClipboard'
import { useAutoToggleMenu } from '~/composables/useAutoToggleMenu'
import { appendShareParams } from '~/utils/acquisition-share'
import { siteConfig } from '~/config/site'
import { tinyTooltip } from '~/utils/tiny-tooltip'

const props = defineProps<{ thread: BoardThread }>()
const emit = defineEmits<{ updated: [thread: BoardThread]; deleted: [] }>()

const api = useBoardApi()
const toast = useAppToast()
const { user, isAuthed, isVerifiedMember, isPremium } = useAuth()
const { gateCopy } = useBoardAccess()
const { copyText } = useCopyToClipboard()
const { confirm } = useAppConfirm()
const { mounted: menuMounted, menuRef, toggle: toggleMenu } = useAutoToggleMenu()
const preview = useUserPreviewTrigger({ username: computed(() => props.thread.author?.username ?? '') })

const showHandle = computed(() => authorHasDistinctName(props.thread.author))
const reportOpen = ref(false)
const hidden = ref(props.thread.viewerHidden)
const isOwn = computed(() => Boolean(user.value?.id && props.thread.author?.id === user.value.id))
const externalUrl = computed(() => (props.thread.viewerCanAccess && props.thread.url && !props.thread.articleId ? props.thread.url : null))
const previewBody = computed(() => (props.thread.articleId ? '' : [props.thread.body, props.thread.url].filter(Boolean).join('\n')))
const displayUrl = computed(() => (props.thread.url ?? '').replace(/^https?:\/\/(www\.)?/, ''))
const age = computed(() => formatListTime(props.thread.createdAt))
const createdTitle = computed(() => formatDateTime(props.thread.createdAt))
// Same people · impressions chip (and hover breakdown) as posts and articles; the thread is a post.
const postCache = usePostCache()
const liveCommentCount = computed(() => postCache.cache.value[props.thread.id]?.commentCount ?? props.thread.commentCount)
const { hasViewedLocally } = usePostViewTracker()
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
const tone = computed(() => boardScopeTone(props.thread.visibility))
const scopeStyle = computed(() => (tone.value ? { boxShadow: `inset 3px 0 0 var(--moh-${tone.value})` } : undefined))
const gate = computed(() => gateCopy(props.thread.visibility, props.thread.commentCount))

type BoardMenuItem = MenuItem & { iconName?: string }
const menuItems = computed<BoardMenuItem[]>(() => {
  const items: BoardMenuItem[] = []
  if (!isAuthed.value || !props.thread.viewerCanAccess) return items
  if (!isOwn.value) {
    items.push({
      label: hidden.value ? 'Show on my Board' : 'Hide from my Board',
      iconName: hidden.value ? 'tabler:eye' : 'tabler:eye-off',
      command: () => void toggleHide(),
    })
    items.push({ label: 'Report post', iconName: 'tabler:flag', command: () => { reportOpen.value = true } })
  }
  if (props.thread.viewerCanEdit) {
    items.push({ label: 'Edit post', iconName: 'tabler:edit', command: () => { editing.value = true } })
  }
  if (isOwn.value) {
    items.push({
      label: 'Delete post',
      iconName: 'tabler:trash',
      class: 'text-red-600 dark:text-red-400',
      command: () => void onDelete(),
    })
  }
  return items
})

const shareTooltip = tinyTooltip('Share')
const { referralCode, ensureReferralCode } = useEnsureReferralCode()
const { isSupported: nativeShareSupported } = useWebShare()
const sendViaChat = useSendViaChat()

async function shareUrl(): Promise<string> {
  await ensureReferralCode()
  return appendShareParams(`${siteConfig.url.replace(/\/$/, '')}${boardThreadHref(props.thread)}`, {
    ref: referralCode.value ?? null,
  })
}

const shareItems = computed<BoardMenuItem[]>(() => {
  const items: BoardMenuItem[] = []
  if (isAuthed.value && (isVerifiedMember.value || isPremium.value)) {
    items.push({
      label: 'Send via chat',
      iconName: 'tabler:send',
      command: async () => sendViaChat.openShare({ body: await shareUrl() }),
    })
  }
  items.push({
    label: 'Copy link',
    iconName: 'tabler:link',
    command: async () => {
      try {
        await copyText(await shareUrl())
        toast.push({ title: 'Post link copied', tone: 'success', durationMs: 1400 })
      } catch {
        toast.push({ title: 'Copy failed', tone: 'error', durationMs: 1800 })
      }
    },
  })
  if (nativeShareSupported.value) {
    items.push({
      label: 'Share via…',
      iconName: 'tabler:share-2',
      command: async () => {
        if (!import.meta.client || !navigator.share) return
        const url = await shareUrl()
        await nextTick()
        navigator.share({ title: props.thread.title, url }).catch(() => {})
      },
    })
  }
  return items
})

async function toggleHide() {
  const next = !hidden.value
  hidden.value = next
  try {
    await api.setHidden(props.thread.id, next)
    toast.push({ title: next ? 'Hidden from your Board' : 'Back on your Board', tone: 'success', durationMs: 1400 })
  } catch (e) {
    hidden.value = !next
    toast.push({ title: getApiErrorMessage(e) || 'Couldn’t update.', tone: 'error', durationMs: 2000 })
  }
}

async function onDelete() {
  const ok = await confirm({
    header: 'Delete post?',
    message: 'Its comments are deleted with it. This can’t be undone.',
    confirmLabel: 'Delete',
    confirmSeverity: 'danger',
  })
  if (!ok) return
  try {
    await api.deleteThread(props.thread.id)
    emit('deleted')
  } catch (e) {
    toast.push({ title: getApiErrorMessage(e) || 'Couldn’t delete the thread.', tone: 'error', durationMs: 2200 })
  }
}

const editing = ref(false)
const saving = ref(false)
const editError = ref<string | null>(null)
const editTitle = ref(props.thread.title)
const editUrl = ref(props.thread.url ?? '')
const editBody = ref(props.thread.body ?? '')

async function saveEdit() {
  saving.value = true
  editError.value = null
  try {
    const next = await api.updateThread(props.thread.id, {
      title: editTitle.value,
      ...(props.thread.articleId ? {} : { url: editUrl.value.trim() || null }),
      ...(editBody.value.trim() ? { body: editBody.value } : {}),
    })
    editing.value = false
    emit('updated', next)
  } catch (e) {
    editError.value = getApiErrorMessage(e) || 'Couldn’t save.'
  } finally {
    saving.value = false
  }
}
</script>
