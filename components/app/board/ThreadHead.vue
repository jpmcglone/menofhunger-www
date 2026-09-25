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
          <a v-if="externalUrl" :href="externalUrl" target="_blank" rel="noopener noreferrer nofollow ugc" class="hover:underline">{{ thread.title }}</a>
          <NuxtLink v-else-if="thread.articleId && thread.viewerCanAccess" :to="`/a/${thread.articleId}`" class="hover:underline">{{ thread.title }}</NuxtLink>
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
        <AppUserAvatar :user="thread.author" size-class="h-5 w-5" :show-status="false" />
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
        <span>@{{ thread.author.username }}</span>
        <span aria-hidden="true">·</span>
      </template>
      <AppBoardScopeChip :visibility="thread.visibility" />
      <AppBoardTagChip v-for="tag in thread.tags" :key="tag" :tag="tag" />
      <span :title="createdTitle">{{ age }}</span>
      <span v-if="thread.editedAt">· edited</span>
    </div>

    <template v-if="thread.viewerCanAccess">
      <p v-if="thread.body" class="mt-2.5 whitespace-pre-wrap break-words text-[15px] leading-relaxed moh-text">{{ thread.body }}</p>
      <img
        v-if="thread.image?.url"
        :src="thread.image.url"
        :alt="thread.image.alt || ''"
        class="mt-3 max-h-[480px] w-full rounded-xl border moh-border object-cover"
        loading="lazy"
      >

      <div class="mt-2 flex flex-wrap items-center gap-x-4 text-xs moh-text-muted">
        <span class="inline-flex items-center gap-1" :aria-label="`${thread.commentCount} comments`">
          <AppIconGlyph name="reply" :size="16" />
          <span class="tabular-nums">{{ thread.commentCount }}</span>
        </span>
        <AppPostRowBookmarkButton
          :post-id="thread.id"
          :viewer-can-interact="isVerifiedMember"
          :initial-has-bookmarked="thread.viewerHasBookmarked"
          :initial-collection-ids="[]"
        />
        <button type="button" class="moh-tap moh-focus inline-flex min-h-9 items-center hover:text-[var(--moh-text)]" aria-label="Copy link" @click="copyLink">
          <AppIconGlyph name="share" :size="16" />
        </button>
        <button v-if="thread.viewerCanEdit" type="button" class="moh-tap min-h-9 hover:underline" @click="editing = !editing">edit</button>
        <button v-if="isOwn" type="button" class="moh-tap min-h-9 hover:text-red-500" @click="onDelete">delete</button>
        <template v-else-if="isAuthed">
          <button type="button" class="moh-tap min-h-9 hover:underline" @click="toggleHide">{{ hidden ? 'unhide' : 'hide' }}</button>
          <button type="button" class="moh-tap min-h-9 hover:underline" @click="reportOpen = true">flag</button>
        </template>
        <span class="ml-auto tabular-nums moh-text-soft">{{ viewsLabel }}</span>
      </div>

      <form v-if="editing" class="mt-4 space-y-3 rounded-xl border moh-border p-3" @submit.prevent="saveEdit">
        <input v-model="editTitle" maxlength="80" class="w-full rounded-lg border moh-border bg-transparent px-3 py-2 text-sm moh-text outline-none" aria-label="Title">
        <input v-if="!thread.articleId" v-model="editUrl" type="url" placeholder="https://… (optional)" class="w-full rounded-lg border moh-border bg-transparent px-3 py-2 text-sm moh-text outline-none" aria-label="Link">
        <textarea v-model="editBody" rows="4" class="w-full rounded-lg border moh-border bg-transparent px-3 py-2 text-sm moh-text outline-none" aria-label="Text" />
        <AppBoardTagPicker v-model="editTags" />
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
import type { BoardThread } from '~/types/api'
import { formatListTime, formatDateTime } from '~/utils/time-format'
import { getApiErrorMessage } from '~/utils/api-error'
import { useCopyToClipboard } from '~/composables/useCopyToClipboard'

const props = defineProps<{ thread: BoardThread }>()
const emit = defineEmits<{ updated: [thread: BoardThread]; deleted: [] }>()

const api = useBoardApi()
const toast = useAppToast()
const { user, isAuthed, isVerifiedMember } = useAuth()
const { gateCopy } = useBoardAccess()
const { copyText } = useCopyToClipboard()
const preview = useUserPreviewTrigger({ username: computed(() => props.thread.author?.username ?? '') })

const reportOpen = ref(false)
const hidden = ref(props.thread.viewerHidden)
const isOwn = computed(() => Boolean(user.value?.id && props.thread.author?.id === user.value.id))
const externalUrl = computed(() => (props.thread.viewerCanAccess && props.thread.url && !props.thread.articleId ? props.thread.url : null))
const displayUrl = computed(() => (props.thread.url ?? '').replace(/^https?:\/\/(www\.)?/, ''))
const age = computed(() => formatListTime(props.thread.createdAt))
const createdTitle = computed(() => formatDateTime(props.thread.createdAt))
const viewsLabel = computed(() => `${props.thread.viewerCount.toLocaleString()} ${props.thread.viewerCount === 1 ? 'view' : 'views'}`)
const tone = computed(() => boardScopeTone(props.thread.visibility))
const scopeStyle = computed(() => (tone.value ? { boxShadow: `inset 3px 0 0 var(--moh-${tone.value})` } : undefined))
const gate = computed(() => gateCopy(props.thread.visibility, props.thread.commentCount))

async function copyLink() {
  try {
    await copyText(`${window.location.origin}${boardThreadHref(props.thread)}`)
    toast.push({ title: 'Link copied', tone: 'success', durationMs: 1400 })
  } catch {
    toast.push({ title: 'Copy failed', tone: 'error', durationMs: 1800 })
  }
}

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
  if (!confirm('Delete this thread? Comments go with it.')) return
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
const editTags = ref<string[]>([...props.thread.tags])

async function saveEdit() {
  saving.value = true
  editError.value = null
  try {
    const next = await api.updateThread(props.thread.id, {
      title: editTitle.value,
      ...(props.thread.articleId ? {} : { url: editUrl.value.trim() || null }),
      tags: editTags.value,
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
