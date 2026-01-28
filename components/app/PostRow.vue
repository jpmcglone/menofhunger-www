<template>
  <div class="border-b border-gray-200/60 px-3 py-4 hover:bg-gray-50 dark:border-zinc-800/60 dark:hover:bg-white/5 dark:hover:shadow-[0_0_0_1px_rgba(255,255,255,0.06)] transition-colors">
    <div class="flex gap-3">
      <NuxtLink
        v-if="authorProfilePath"
        :to="authorProfilePath"
        class="group h-10 w-10 shrink-0 overflow-hidden rounded-full bg-gray-200 dark:bg-zinc-800"
        :aria-label="`View @${post.author.username} profile`"
      >
        <img
          v-if="authorAvatarUrl"
          :src="authorAvatarUrl"
          alt=""
          class="h-full w-full object-cover transition-opacity duration-200 group-hover:opacity-80"
          loading="lazy"
          decoding="async"
        >
        <div v-else class="h-full w-full" aria-hidden="true" />
      </NuxtLink>
      <div v-else class="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-gray-200 dark:bg-zinc-800" aria-hidden="true" />

      <div class="min-w-0 flex-1">
        <div class="relative">
          <div class="min-w-0 pr-10">
            <!-- X-style header row: name + badge + @username + date on one line -->
            <div class="flex min-w-0 items-baseline gap-2 leading-[1.15] flex-nowrap">
              <div class="flex min-w-0 items-baseline gap-1.5 flex-nowrap">
                <NuxtLink
                  v-if="authorProfilePath"
                  :to="authorProfilePath"
                  class="min-w-0 font-bold truncate text-gray-900 dark:text-white hover:underline underline-offset-2"
                  :aria-label="`View @${post.author.username} profile`"
                >
                  {{ post.author.name || post.author.username || 'User' }}
                </NuxtLink>
                <span v-else class="min-w-0 font-bold truncate text-gray-900 dark:text-white">
                  {{ post.author.name || post.author.username || 'User' }}
                </span>

                <NuxtLink
                  v-if="authorProfilePath"
                  :to="authorProfilePath"
                  class="inline-flex shrink-0"
                  aria-label="View profile (verified badge)"
                >
                  <AppVerifiedBadge :status="post.author.verifiedStatus" :premium="post.author.premium" />
                </NuxtLink>
                <AppVerifiedBadge v-else class="shrink-0" :status="post.author.verifiedStatus" :premium="post.author.premium" />
              </div>

              <div class="flex min-w-0 items-baseline gap-1.5 flex-nowrap text-sm font-light text-gray-500 dark:text-gray-400">
                <NuxtLink
                  v-if="authorProfilePath"
                  :to="authorProfilePath"
                  class="min-w-0 truncate hover:underline underline-offset-2"
                  :aria-label="`View @${post.author.username} profile`"
                >
                  @{{ post.author.username || '—' }}
                </NuxtLink>
                <span v-else class="min-w-0 truncate">
                  @{{ post.author.username || '—' }}
                </span>

                <span class="shrink-0 text-base leading-none" aria-hidden="true">·</span>
                <NuxtLink
                  :to="postPermalink"
                  class="shrink-0 whitespace-nowrap hover:underline underline-offset-2"
                  :aria-label="`View post ${post.id}`"
                  v-tooltip.bottom="createdAtTooltip"
                >
                  {{ createdAtShort }}
                </NuxtLink>
              </div>
            </div>
          </div>

          <div class="absolute right-0 top-0 shrink-0">
            <Button
              icon="pi pi-ellipsis-h"
              text
              rounded
              severity="secondary"
              aria-label="More"
              v-tooltip.bottom="moreTooltip"
              @click="toggleMoreMenu"
            />
            <Menu ref="moreMenuRef" :model="moreMenuItems" popup />
          </div>
        </div>

        <p class="mt-0.5 whitespace-pre-wrap text-gray-900 dark:text-gray-100">
          {{ post.body }}
        </p>

        <div v-if="visibilityTag" class="mt-2">
          <span
            class="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold border cursor-default"
            :class="visibilityTagClass"
            v-tooltip.bottom="visibilityTooltip"
          >
            {{ visibilityTag }}
          </span>
        </div>

        <div class="mt-3 flex items-center justify-between text-gray-500 dark:text-gray-400">
          <div class="flex items-center gap-2">
            <button
              type="button"
              class="inline-flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-gray-100 dark:hover:bg-zinc-900 cursor-pointer"
              aria-label="Comment"
              v-tooltip.bottom="commentTooltip"
              @click="noop"
            >
              <i class="pi pi-comment text-[18px]" aria-hidden="true" />
            </button>

            <button
              type="button"
              class="inline-flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-gray-100 dark:hover:bg-zinc-900"
              :class="isAuthed ? 'cursor-pointer' : 'cursor-default opacity-60'"
              :aria-label="isBoosted ? 'Remove upvote' : 'Upvote'"
              :disabled="!isAuthed"
              v-tooltip.bottom="upvoteTooltip"
              @click="toggleBoost"
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
          </div>

          <div class="relative flex items-center justify-end">
            <button
              type="button"
              class="inline-flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-gray-100 dark:hover:bg-zinc-900 cursor-pointer"
              aria-label="Share"
              v-tooltip.bottom="shareTooltip"
              @click="toggleShareMenu"
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
            <Menu ref="shareMenuRef" :model="shareMenuItems" popup />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { FeedPost } from '~/types/api'
import { visibilityTagClasses, visibilityTagLabel } from '~/utils/post-visibility'
import type { MenuItem } from 'primevue/menuitem'
import { siteConfig } from '~/config/site'
import { tinyTooltip } from '~/utils/tiny-tooltip'
import { useToast as usePrimeToast } from 'primevue/usetoast'

const props = defineProps<{
  post: FeedPost
}>()

const post = computed(() => props.post)
const { assetUrl } = useAssets()
const { user } = useAuth()
const isAuthed = computed(() => Boolean(user.value?.id))

const upvoteTooltip = computed(() => {
  const text = isAuthed.value ? (isBoosted.value ? 'Unboost' : 'Boost') : 'Log in to boost'
  return tinyTooltip(text)
})
const shareTooltip = computed(() => tinyTooltip('Share'))
const moreTooltip = computed(() => tinyTooltip('More'))
const commentTooltip = computed(() => tinyTooltip('Comment'))

const authorProfilePath = computed(() => {
  const username = (post.value.author.username ?? '').trim()
  return username ? `/u/${encodeURIComponent(username)}` : null
})

const authorAvatarUrl = computed(() => {
  const base = assetUrl(post.value.author.avatarKey)
  if (!base) return null
  const v = post.value.author.avatarUpdatedAt || ''
  return v ? `${base}?v=${encodeURIComponent(v)}` : base
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
  return null
})

const postPermalink = computed(() => `/p/${encodeURIComponent(post.value.id)}`)
const postShareUrl = computed(() => `${siteConfig.url}${postPermalink.value}`)

function goToPost() {
  return navigateTo(postPermalink.value)
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

  if (isAuthed.value) {
    items.push({
      label: 'Report post',
      icon: 'pi pi-flag',
      command: () => {
        // no-op for now
      },
    })
  }

  return items
})

function toggleMoreMenu(event: Event) {
  // PrimeVue Menu expects the click event to position the popup.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(moreMenuRef.value as any)?.toggle(event)
}

const toast = (import.meta.client ? usePrimeToast() : null) as ReturnType<typeof usePrimeToast> | null

// Client-side "boosted" state (UI-only for now).
const boosts = useState<Record<string, boolean>>('post-boosts', () => ({}))
const isBoosted = computed(() => Boolean(boosts.value[post.value.id]))

function toggleBoost() {
  if (!isAuthed.value) return
  const id = post.value.id
  boosts.value = { ...boosts.value, [id]: !boosts.value[id] }
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
const shareMenuItems = computed<MenuItem[]>(() => [
  {
    label: 'Copy link',
    icon: 'pi pi-link',
    command: async () => {
      if (!import.meta.client) return
      try {
        await copyToClipboard(postShareUrl.value)
        toast?.add({ severity: 'success', summary: 'Link copied', life: 1400 })
      } catch {
        toast?.add({ severity: 'error', summary: 'Copy failed', life: 1600 })
      }
    },
  },
])

function toggleShareMenu(event: Event) {
  // PrimeVue Menu expects the click event to position the popup.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(shareMenuRef.value as any)?.toggle(event)
}
</script>

