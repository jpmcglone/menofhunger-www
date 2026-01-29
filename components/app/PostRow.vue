<template>
  <div
    :class="[
      'border-b px-4 py-4 transition-colors moh-border',
      clickable ? 'cursor-pointer moh-surface-hover dark:hover:shadow-[0_0_0_1px_rgba(255,255,255,0.06)]' : ''
    ]"
    @click="onRowClick"
  >
    <div class="flex gap-3">
      <NuxtLink
        v-if="authorProfilePath"
        :to="authorProfilePath"
        class="group shrink-0"
        :aria-label="`View @${post.author.username} profile`"
      >
        <AppAvatarCircle
          :src="authorAvatarUrl"
          :name="post.author.name"
          :username="post.author.username"
          size-class="h-10 w-10"
          bg-class="moh-surface"
        />
      </NuxtLink>
      <AppAvatarCircle
        v-else
        :src="authorAvatarUrl"
        :name="post.author.name"
        :username="post.author.username"
        size-class="h-10 w-10"
        bg-class="moh-surface"
      />

      <div class="min-w-0 flex-1">
        <div class="relative">
          <div class="min-w-0 pr-10">
            <AppPostHeaderLine
              :display-name="post.author.name || post.author.username || 'User'"
              :username="post.author.username || ''"
              :verified-status="post.author.verifiedStatus"
              :premium="post.author.premium"
              :profile-path="authorProfilePath"
              :post-id="post.id"
              :post-permalink="postPermalink"
              :created-at-short="createdAtShort"
              :created-at-tooltip="createdAtTooltip"
            />
          </div>

          <div class="absolute -right-0.5 -top-0.5 shrink-0">
            <Button
              icon="pi pi-ellipsis-v"
              text
              rounded
              severity="secondary"
              aria-label="More"
              v-tooltip.bottom="moreTooltip"
              @click="toggleMoreMenu"
            />
            <Menu v-if="moreMenuMounted" ref="moreMenuRef" :model="moreMenuItems" popup />
          </div>
        </div>

        <p class="mt-0.5 whitespace-pre-wrap moh-text pr-12">
          {{ post.body }}
        </p>

        <div v-if="visibilityTag" class="mt-2">
          <span
            class="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold border cursor-default"
            :class="visibilityTagClass"
            v-tooltip.bottom="visibilityTooltip"
          >
            <i v-if="post.visibility === 'onlyMe'" class="pi pi-eye-slash mr-1 text-[10px]" aria-hidden="true" />
            {{ visibilityTag }}
          </span>
        </div>

        <div class="mt-3 flex items-center justify-between moh-text-muted">
          <div class="flex items-center gap-2">
            <button
              type="button"
              class="inline-flex h-9 w-9 items-center justify-center rounded-full transition-colors moh-surface-hover"
              :class="commentClickable ? 'cursor-pointer' : 'cursor-default opacity-60'"
              aria-label="Comment"
              v-tooltip.bottom="commentTooltip"
              @click.stop="onCommentClick"
            >
              <i class="pi pi-comment text-[18px]" aria-hidden="true" />
            </button>

            <div v-if="!isOnlyMe" class="inline-flex items-center">
              <button
                type="button"
                class="inline-flex h-9 w-9 items-center justify-center rounded-full transition-colors moh-surface-hover"
                :class="boostClickable ? 'cursor-pointer' : 'cursor-default opacity-60'"
                :aria-label="isBoosted ? 'Remove upvote' : 'Upvote'"
                v-tooltip.bottom="upvoteTooltip"
                @click.stop="onBoostClick"
              >
                <svg
                  viewBox="0 0 24 24"
                  class="h-5 w-5"
                  aria-hidden="true"
                  :style="isBoosted ? { color: 'var(--p-primary-color)' } : undefined"
                >
                  <!-- Imgur-ish upvote: arrowhead + stem -->
                  <path
                    v-if="isBoosted"
                    fill="currentColor"
                    d="M12 4.5L3.75 12.25h5.25V20h6V12.25h5.25L12 4.5z"
                  />
                  <path
                    v-else
                    d="M12 4.5L3.75 12.25h5.25V20h6V12.25h5.25L12 4.5z"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.9"
                    stroke-linejoin="round"
                  />
                </svg>
              </button>
              <span
                v-if="boostCountLabel"
                class="ml-1 select-none text-xs tabular-nums moh-text-muted"
                aria-hidden="true"
              >
                {{ boostCountLabel }}
              </span>
            </div>
          </div>

          <div v-if="!isOnlyMe" class="relative flex items-center justify-end">
            <button
              type="button"
              class="inline-flex h-9 w-9 items-center justify-center rounded-full transition-colors moh-surface-hover"
              :class="canShare ? 'cursor-pointer' : 'cursor-default opacity-60'"
              aria-label="Share"
              v-tooltip.bottom="shareTooltip"
              @click="canShare ? toggleShareMenu($event) : null"
            >
              <svg viewBox="0 0 24 24" class="h-5 w-5" aria-hidden="true">
                <!-- Twitter-ish share: arrow up out of tray -->
                <path
                  d="M12 3v10"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.9"
                  stroke-linecap="round"
                />
                <path
                  d="M7.5 7.5L12 3l4.5 4.5"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.9"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
                <path
                  d="M5 11.5v7a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 19 18.5v-7"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.9"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </button>
            <Menu v-if="shareMenuMounted" ref="shareMenuRef" :model="shareMenuItems" popup />
          </div>
        </div>
      </div>
    </div>
  </div>

  <Dialog
    v-if="deleteConfirmOpen"
    v-model:visible="deleteConfirmOpen"
    modal
    header="Delete post?"
    :draggable="false"
    class="w-[min(28rem,calc(100vw-2rem))]"
  >
    <div class="text-sm moh-text-muted">
      This won’t show up anywhere once deleted.
    </div>
    <template #footer>
      <Button label="Cancel" severity="secondary" text :disabled="deleting" @click="deleteConfirmOpen = false" />
      <Button
        label="Delete"
        icon="pi pi-trash"
        severity="danger"
        :loading="deleting"
        :disabled="deleting"
        @click="deletePost"
      />
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import type { FeedPost } from '~/types/api'
import { visibilityTagClasses, visibilityTagLabel } from '~/utils/post-visibility'
import type { MenuItem } from 'primevue/menuitem'
import { siteConfig } from '~/config/site'
import { tinyTooltip } from '~/utils/tiny-tooltip'
import { getApiErrorMessage } from '~/utils/api-error'

const props = defineProps<{
  post: FeedPost
  clickable?: boolean
}>()
const emit = defineEmits<{
  (e: 'deleted', id: string): void
}>()

const post = computed(() => props.post)
const clickable = computed(() => props.clickable !== false)
const { user } = useAuth()
const isAuthed = computed(() => Boolean(user.value?.id))
const viewerHasUsername = computed(() => Boolean(user.value?.usernameIsSet))
const viewerIsVerified = computed(() => Boolean(user.value?.verifiedStatus && user.value.verifiedStatus !== 'none'))
const isSelf = computed(() => Boolean(user.value?.id && user.value.id === post.value.author.id))
const { apiFetchData } = useApiClient()
const { show: showAuthActionModal } = useAuthActionModal()
const boostState = useBoostState()
const isOnlyMe = computed(() => post.value.visibility === 'onlyMe')
const viewerIsAdmin = computed(() => Boolean(user.value?.siteAdmin))
const viewerCanInteract = computed(() => {
  // Admin viewing someone else's Only-me post should be read-only.
  if (isOnlyMe.value && viewerIsAdmin.value && !isSelf.value) return false
  return true
})
const canBoost = computed(() => {
  // Only-me posts don't need boosts.
  if (isOnlyMe.value) return false
  return viewerCanInteract.value && isAuthed.value && viewerHasUsername.value
})
const canComment = computed(() => viewerCanInteract.value && isAuthed.value && viewerIsVerified.value)
const canShare = computed(() => {
  // Sharing private posts is confusing; keep it read-only.
  if (isOnlyMe.value) return false
  return viewerCanInteract.value
})

const upvoteTooltip = computed(() => {
  if (isOnlyMe.value) return tinyTooltip('Boosts are not available for Only me posts')
  if (!viewerCanInteract.value) return tinyTooltip('Boost')
  if (!isAuthed.value) return tinyTooltip('Log in to boost')
  if (!viewerHasUsername.value) return tinyTooltip('Set a username to boost')
  const text = isBoosted.value ? 'Unboost' : 'Boost'
  return tinyTooltip(text)
})
const shareTooltip = computed(() => tinyTooltip('Share'))
const moreTooltip = computed(() => tinyTooltip('More'))
const commentTooltip = computed(() => {
  if (!viewerCanInteract.value) return tinyTooltip('Comment')
  if (!isAuthed.value) return tinyTooltip('Log in to comment')
  if (!viewerIsVerified.value) return tinyTooltip('Verify to comment')
  return tinyTooltip('Comment')
})

const boostClickable = computed(() => {
  return viewerCanInteract.value && (!isAuthed.value || viewerHasUsername.value)
})
const commentClickable = computed(() => viewerCanInteract.value)

const authorProfilePath = computed(() => {
  const username = (post.value.author.username ?? '').trim()
  return username ? `/u/${encodeURIComponent(username)}` : null
})

const authorAvatarUrl = computed(() => {
  return post.value.author.avatarUrl ?? null
})

const visibilityTag = computed(() => {
  return visibilityTagLabel(post.value.visibility)
})

const visibilityTagClass = computed(() => {
  return visibilityTagClasses(post.value.visibility)
})

const visibilityTooltip = computed(() => {
  if (post.value.visibility === 'verifiedOnly') return tinyTooltip('Visible to verified members')
  if (post.value.visibility === 'premiumOnly') return tinyTooltip('Visible to premium members')
  if (post.value.visibility === 'onlyMe') return tinyTooltip('Visible only to you')
  return null
})

const postPermalink = computed(() => `/p/${encodeURIComponent(post.value.id)}`)
const postShareUrl = computed(() => `${siteConfig.url}${postPermalink.value}`)

function goToPost() {
  return navigateTo(postPermalink.value)
}

function isInteractiveTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null
  if (!el) return false
  // Ignore clicks on any interactive element inside the row.
  return Boolean(
    el.closest(
      [
        'a',
        'button',
        'input',
        'textarea',
        'select',
        '[role="menu"]',
        '[role="menuitem"]',
        '[data-pc-section]',
      ].join(','),
    ),
  )
}

function onRowClick(e: MouseEvent) {
  if (!clickable.value) return
  if (isInteractiveTarget(e.target)) return
  void goToPost()
}

function noop() {
  // no-op for now (comments not implemented yet)
}

const createdAtDate = computed(() => new Date(post.value.createdAt))
const createdAtShort = computed(() => formatShortDate(createdAtDate.value))
const createdAtTooltip = computed(() => tinyTooltip(createdAtDate.value.toLocaleString()))

function formatShortDate(d: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  if (diffSec < 60) return 'now'
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h`
  const diffDay = Math.floor(diffHr / 24)
  if (diffDay < 7) return `${diffDay}d`

  const sameYear = now.getFullYear() === d.getFullYear()
  const month = d.toLocaleString(undefined, { month: 'short' })
  const day = d.getDate()
  return sameYear ? `${month} ${day}` : `${month} ${day}, ${d.getFullYear()}`
}

const moreMenuRef = ref()
const moreMenuMounted = ref(false)
const moreMenuItems = computed<MenuItem[]>(() => {
  const items: MenuItem[] = [
    {
      label: post.value.author.username ? `View @${post.value.author.username}` : 'View profile',
      icon: 'pi pi-user',
      command: () => {
        if (!authorProfilePath.value) return
        return navigateTo(authorProfilePath.value)
      },
    },
  ]

  if (viewerIsAdmin.value) {
    items.push({ separator: true })
    items.push({
      label: `Boost score: ${adminBoostScoreLabel.value ?? '—'}`,
      icon: 'pi pi-chart-line',
      disabled: true
    })
  }

  if (isAuthed.value && !isSelf.value) {
    items.push({
      label: 'Report post',
      icon: 'pi pi-flag',
      command: () => {
        // no-op for now
      },
    })
  }

  if (isSelf.value) {
    items.push({ separator: true })
    items.push({
      label: 'Delete post',
      icon: 'pi pi-trash',
      class: 'text-red-600 dark:text-red-400',
      command: () => {
        deleteConfirmOpen.value = true
      },
    })
  }

  return items
})

async function toggleMoreMenu(event: Event) {
  moreMenuMounted.value = true
  await nextTick()
  // PrimeVue Menu expects the click event to position the popup.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(moreMenuRef.value as any)?.toggle(event)
}

const toast = useAppToast()
const deleteConfirmOpen = ref(false)
const deleting = ref(false)

async function deletePost() {
  if (deleting.value) return
  deleting.value = true
  try {
    await apiFetchData<{ success: true }>('/posts/' + encodeURIComponent(post.value.id), { method: 'DELETE' })
    emit('deleted', post.value.id)
    toast.push({ title: 'Post deleted', tone: 'success', durationMs: 1400 })
  } catch (e: unknown) {
    toast.push({ title: getApiErrorMessage(e) || 'Failed to delete post.', tone: 'error', durationMs: 2200 })
  } finally {
    deleting.value = false
    deleteConfirmOpen.value = false
  }
}

const boostEntry = computed(() => boostState.get(post.value))
const isBoosted = computed(() => boostEntry.value.viewerHasBoosted)
const boostCount = computed(() => boostEntry.value.boostCount)
const boostCountLabel = computed(() => {
  const n = boostCount.value
  if (!n) return null
  return String(n)
})
const adminBoostScoreLabel = computed(() => {
  if (!viewerIsAdmin.value) return null
  const score = post.value.internal?.boostScore
  if (typeof score !== 'number') return '—'
  return score.toFixed(2)
})

async function onBoostClick() {
  if (!viewerCanInteract.value) return
  if (!isAuthed.value) {
    showAuthActionModal({ kind: 'login', action: 'boost' })
    return
  }
  if (!viewerHasUsername.value) {
    showAuthActionModal({ kind: 'setUsername', action: 'boost' })
    return
  }
  try {
    await boostState.toggleBoost(post.value)
  } catch (e: unknown) {
    toast.push({ title: getApiErrorMessage(e) || 'Failed to boost.', tone: 'error', durationMs: 2200 })
  }
}

async function onCommentClick() {
  if (!viewerCanInteract.value) return
  if (!isAuthed.value) {
    showAuthActionModal({ kind: 'login', action: 'comment' })
    return
  }
  if (!viewerIsVerified.value) {
    showAuthActionModal({ kind: 'verify', action: 'comment' })
    return
  }

  // Comments aren't implemented yet; bring them to the post page as the next best action.
  await navigateTo(postPermalink.value)
}

async function copyToClipboard(text: string) {
  if (navigator?.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }
  // Fallback
  const ta = document.createElement('textarea')
  ta.value = text
  ta.setAttribute('readonly', 'true')
  ta.style.position = 'fixed'
  ta.style.opacity = '0'
  document.body.appendChild(ta)
  ta.select()
  document.execCommand('copy')
  document.body.removeChild(ta)
}

const shareMenuRef = ref()
const shareMenuMounted = ref(false)
const shareMenuItems = computed<MenuItem[]>(() => [
  {
    label: 'Copy link',
    icon: 'pi pi-link',
    command: async () => {
      if (!import.meta.client) return
      try {
        await copyToClipboard(postShareUrl.value)
        toast.push({ title: 'Link copied', tone: 'success', durationMs: 1400 })
      } catch {
        toast.push({ title: 'Copy failed', tone: 'error', durationMs: 1800 })
      }
    },
  },
])

async function toggleShareMenu(event: Event) {
  shareMenuMounted.value = true
  await nextTick()
  // PrimeVue Menu expects the click event to position the popup.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(shareMenuRef.value as any)?.toggle(event)
}
</script>

