<template>
  <div class="-mx-4">
    <!-- Composer -->
    <div class="border-b border-gray-200 px-4 py-4 dark:border-zinc-800">
      <div v-if="canPost" class="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-x-3">
        <!-- Row 1: visibility picker (above, right-aligned) -->
        <div class="col-start-2 flex justify-end items-end mb-3 sm:mb-2">
          <div ref="composerVisibilityWrapEl" class="relative">
            <button
              type="button"
              class="inline-flex items-center rounded-full border px-2 py-1 text-[11px] font-semibold leading-none transition-colors"
              :class="composerVisibilityPillClass"
              aria-label="Select post visibility"
              @click="toggleVisibilityPopover"
            >
              {{ composerVisibilityLabel }}
              <i class="pi pi-chevron-down ml-1 text-[10px] opacity-80" aria-hidden="true" />
            </button>

            <!-- Custom visibility picker -->
            <div
              v-if="composerVisibilityPopoverOpen"
              class="absolute right-0 top-full z-30 mt-2 w-56 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg dark:border-zinc-800 dark:bg-black"
              role="menu"
              aria-label="Post visibility"
            >
              <button
                type="button"
                class="w-full text-left px-3 py-2 text-sm font-semibold transition-colors text-gray-900 hover:bg-gray-50 dark:text-gray-50 dark:hover:bg-zinc-900"
                role="menuitem"
                @click="setComposerVisibility('public')"
              >
                Public
              </button>

              <button
                type="button"
                class="w-full text-left px-3 py-2 text-sm font-semibold transition-colors text-sky-700 hover:bg-sky-600 hover:text-white dark:text-sky-300 dark:hover:bg-sky-500"
                role="menuitem"
                @click="setComposerVisibility('verifiedOnly')"
              >
                Verified only
              </button>

              <button
                type="button"
                :disabled="!isPremium"
                :class="[
                  'w-full text-left px-3 py-2 text-sm font-semibold transition-colors',
                  isPremium
                    ? 'text-amber-800 hover:bg-amber-600 hover:text-white dark:text-amber-300 dark:hover:bg-amber-500'
                    : 'text-gray-400 dark:text-zinc-600 cursor-not-allowed'
                ]"
                role="menuitem"
                @click="isPremium ? setComposerVisibility('premiumOnly') : null"
              >
                Premium only
                <span v-if="!isPremium" class="ml-2 font-mono text-[10px] opacity-80" aria-hidden="true">LOCKED</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Row 2: avatar + textarea start aligned -->
        <NuxtLink
          v-if="myProfilePath"
          :to="myProfilePath"
          class="row-start-1 sm:row-start-2 col-start-1 mb-3 sm:mb-0 group h-8 w-8 sm:h-10 sm:w-10 shrink-0 overflow-hidden rounded-full bg-gray-200 dark:bg-zinc-800 relative"
          aria-label="View your profile"
        >
          <img
            v-if="meAvatarUrl"
            :src="meAvatarUrl"
            alt=""
            class="h-full w-full object-cover transition-opacity duration-200 group-hover:opacity-80"
            loading="lazy"
            decoding="async"
          >
          <div v-else class="h-full w-full" aria-hidden="true" />
        </NuxtLink>
        <div
          v-else
          class="row-start-1 sm:row-start-2 col-start-1 mb-3 sm:mb-0 h-8 w-8 sm:h-10 sm:w-10 shrink-0 overflow-hidden rounded-full bg-gray-200 dark:bg-zinc-800"
          aria-hidden="true"
        >
          <img
            v-if="meAvatarUrl"
            :src="meAvatarUrl"
            alt=""
            class="h-full w-full object-cover"
            loading="lazy"
            decoding="async"
          >
        </div>

        <div :class="['row-start-2 col-span-2 sm:col-span-1 sm:col-start-2 min-w-0 moh-composer-tint', composerAccentClass]">
          <Textarea
            v-model="draft"
            autoResize
            rows="3"
            class="w-full"
            placeholder="What’s happening?"
            :maxlength="postMaxLen"
          />
          <div class="mt-3 flex items-center justify-between">
            <div class="flex items-center gap-2 text-gray-500 dark:text-gray-400">
              <Button icon="pi pi-image" text rounded severity="secondary" aria-label="Media" v-tooltip.bottom="tinyTooltip('Media')" />
              <Button icon="pi pi-face-smile" text rounded severity="secondary" aria-label="Emoji" v-tooltip.bottom="tinyTooltip('Emoji')" />
              <Button icon="pi pi-map-marker" text rounded severity="secondary" aria-label="Location" v-tooltip.bottom="tinyTooltip('Location')" />
            </div>
            <div class="flex items-center gap-2">
              <div class="text-xs text-gray-500 dark:text-gray-400 tabular-nums">
                {{ postCharCount }}/{{ postMaxLen }}
              </div>
              <Button
                label="Post"
                rounded
                :outlined="postButtonOutlined"
                severity="secondary"
                :class="postButtonClass"
                :disabled="submitting || !draft.trim() || postCharCount > postMaxLen"
                :loading="submitting"
                @click="submit"
              />
            </div>
          </div>
        </div>
      </div>

      <div v-else-if="isAuthed" class="rounded-xl border border-gray-200 bg-gray-50 px-4 py-4 dark:border-zinc-800 dark:bg-zinc-950/40">
        <div class="font-semibold text-gray-900 dark:text-gray-50">Verified members only</div>
        <div class="mt-1 text-sm text-gray-600 dark:text-gray-300">
          You’ll be able to post once your account is verified.
        </div>
      </div>

      <button
        v-else
        type="button"
        class="w-full text-left rounded-xl border border-gray-200 bg-gray-50 px-4 py-4 hover:bg-gray-100 dark:border-zinc-800 dark:bg-zinc-950/40 dark:hover:bg-zinc-900/40"
        @click="goLogin"
      >
        <div class="flex items-center justify-between gap-3">
          <div class="space-y-1">
            <div class="font-semibold text-gray-900 dark:text-gray-50">Log in to post</div>
            <div class="text-sm text-gray-600 dark:text-gray-300">
              Join the conversation and share updates with the brotherhood.
            </div>
          </div>
          <i class="pi pi-angle-right text-gray-500 dark:text-gray-400" aria-hidden="true" />
        </div>
      </button>
    </div>

    <!-- Posts -->
    <div>
      <div class="mt-1 border-b border-gray-200 px-4 py-3 dark:border-zinc-800">
        <div class="flex items-center justify-end gap-2">
          <button
            v-if="feedFilterTagLabel"
            type="button"
            class="inline-flex h-6 w-6 items-center justify-center rounded-full border border-gray-200 text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900 dark:border-zinc-800 dark:text-gray-300 dark:hover:bg-zinc-900 dark:hover:text-gray-50"
            aria-label="Clear filter"
            @click="setFeedFilter('all')"
          >
            <span class="text-[10px] leading-none opacity-75" aria-hidden="true">×</span>
          </button>
          <span
            v-if="feedFilterTagLabel"
            class="inline-flex items-center rounded-full border px-2 py-1 text-[11px] font-semibold leading-none"
            :class="feedFilterTagClass"
          >
            {{ feedFilterTagLabel }}
          </span>

          <div ref="feedFilterWrapEl" class="relative">
            <Button
              icon="pi pi-sliders-h"
              text
              rounded
              severity="secondary"
              aria-label="Filter"
              @click="toggleFeedFilterPopover"
            />

            <div
              v-if="feedFilterPopoverOpen"
              class="absolute right-0 top-full z-30 mt-2 w-56 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg dark:border-zinc-800 dark:bg-black"
              role="menu"
              aria-label="Feed filter"
            >
              <button
                type="button"
                class="w-full text-left px-3 py-2 text-sm font-semibold transition-colors text-gray-900 hover:bg-gray-50 dark:text-gray-50 dark:hover:bg-zinc-900"
                role="menuitem"
                @click="setFeedFilterFromPicker('all')"
              >
                All
              </button>

              <button
                type="button"
                class="w-full text-left px-3 py-2 text-sm font-semibold transition-colors text-gray-900 hover:bg-gray-50 dark:text-gray-50 dark:hover:bg-zinc-900"
                role="menuitem"
                @click="setFeedFilterFromPicker('public')"
              >
                Public
              </button>

              <button
                type="button"
                class="w-full text-left px-3 py-2 text-sm font-semibold transition-colors text-sky-700 hover:bg-sky-600 hover:text-white dark:text-sky-300 dark:hover:bg-sky-500"
                role="menuitem"
                @click="setFeedFilterFromPicker('verifiedOnly')"
              >
                Verified
                <span v-if="!viewerIsVerified" class="ml-2 font-mono text-[10px] opacity-80" aria-hidden="true">LOCKED</span>
              </button>

              <button
                type="button"
                class="w-full text-left px-3 py-2 text-sm font-semibold transition-colors text-amber-800 hover:bg-amber-600 hover:text-white dark:text-amber-300 dark:hover:bg-amber-500"
                role="menuitem"
                @click="setFeedFilterFromPicker('premiumOnly')"
              >
                Premium
                <span v-if="!viewerIsPremium" class="ml-2 font-mono text-[10px] opacity-80" aria-hidden="true">LOCKED</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div v-if="feedCtaKind === 'verify'" class="mx-4 mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-zinc-800 dark:bg-zinc-950/40">
        <div class="font-semibold text-gray-900 dark:text-gray-50">Verified members only</div>
        <div class="mt-1 text-sm text-gray-600 dark:text-gray-300">
          Verify your account to view verified-only posts.
        </div>
        <div class="mt-3">
          <Button label="Go to settings" severity="secondary" @click="navigateTo('/settings')" />
        </div>
      </div>

      <div v-else-if="feedCtaKind === 'premium'" class="mx-4 mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-zinc-800 dark:bg-zinc-950/40">
        <div class="font-semibold text-gray-900 dark:text-gray-50">Premium required</div>
        <div class="mt-1 text-sm text-gray-600 dark:text-gray-300">
          Upgrade to premium to view premium-only posts.
        </div>
        <div class="mt-3">
          <Button label="Go to settings" severity="secondary" @click="navigateTo('/settings')" />
        </div>
      </div>

      <template v-else>
        <AppInlineAlert v-if="error" class="mx-4 mt-4" severity="danger">
          {{ error }}
        </AppInlineAlert>

        <div v-else>
          <div v-for="p in posts" :key="p.id">
            <AppPostRow :post="p" />
          </div>
        </div>

        <div v-if="nextCursor" class="px-4 py-6 flex justify-center">
          <Button
            label="Load more"
            severity="secondary"
            rounded
            :loading="loading"
            :disabled="loading"
            @click="loadMore"
          />
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { PostVisibility } from '~/types/api'
import type { ProfilePostsFilter } from '~/utils/post-visibility'
import { filterPillClasses } from '~/utils/post-visibility'
import { PRIMARY_PREMIUM_ORANGE, PRIMARY_TEXT_DARK, PRIMARY_TEXT_LIGHT, PRIMARY_VERIFIED_BLUE, primaryPaletteToCssVars } from '~/utils/theme-tint'
import { tinyTooltip } from '~/utils/tiny-tooltip'

definePageMeta({
  layout: 'app',
  title: 'Home'
})

usePageSeo({
  title: 'Home',
  description: 'Your Men of Hunger feed — posts are shown in simple chronological order.'
})

const feedFilter = useCookie<ProfilePostsFilter>('moh.feed.filter.v1', {
  default: () => 'all',
  sameSite: 'lax',
  path: '/',
  maxAge: 60 * 60 * 24 * 365,
})

// Clamp cookie to allowed values (SSR-safe).
watch(
  feedFilter,
  (v) => {
    if (v === 'all' || v === 'public' || v === 'verifiedOnly' || v === 'premiumOnly') return
    feedFilter.value = 'all'
  },
  { immediate: true }
)

const { posts, nextCursor, loading, error, refresh, loadMore, addPost } = usePostsFeed({ visibility: feedFilter })
const draft = ref('')
const { user } = useAuth()
const { assetUrl } = useAssets()
const isAuthed = computed(() => Boolean(user.value?.id))
const isVerified = computed(() => user.value?.verifiedStatus && user.value.verifiedStatus !== 'none')
const canPost = computed(() => Boolean(isAuthed.value && isVerified.value))
const isPremium = computed(() => Boolean(user.value?.premium))

const viewerIsVerified = computed(() => Boolean(isVerified.value))
const viewerIsPremium = computed(() => Boolean(isPremium.value))

const feedCtaKind = computed<null | 'verify' | 'premium'>(() => {
  if (feedFilter.value === 'verifiedOnly' && !viewerIsVerified.value) return 'verify'
  if (feedFilter.value === 'premiumOnly' && !viewerIsPremium.value) return 'premium'
  return null
})

function setFeedFilter(next: ProfilePostsFilter) {
  feedFilter.value = next
  if (feedCtaKind.value) return
  void refresh()
}

const feedFilterTagLabel = computed(() => {
  if (feedFilter.value === 'public') return 'Public'
  if (feedFilter.value === 'verifiedOnly') return 'Verified'
  if (feedFilter.value === 'premiumOnly') return 'Premium'
  return null
})

const feedFilterTagClass = computed(() => {
  if (feedFilter.value === 'all') return ''
  return filterPillClasses(feedFilter.value, true)
})

const feedFilterWrapEl = ref<HTMLElement | null>(null)
const feedFilterPopoverOpen = ref(false)

function closeFeedFilterPopover() {
  feedFilterPopoverOpen.value = false
}

function toggleFeedFilterPopover() {
  feedFilterPopoverOpen.value = !feedFilterPopoverOpen.value
}

function setFeedFilterFromPicker(next: ProfilePostsFilter) {
  setFeedFilter(next)
  closeFeedFilterPopover()
}

watch(
  feedFilterPopoverOpen,
  (open) => {
    if (!import.meta.client) return

    const onPointerDown = (e: Event) => {
      const el = feedFilterWrapEl.value
      const target = e.target as Node | null
      if (!el || !target) return
      if (el.contains(target)) return
      closeFeedFilterPopover()
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeFeedFilterPopover()
    }

    if (open) {
      window.addEventListener('mousedown', onPointerDown, true)
      window.addEventListener('touchstart', onPointerDown, true)
      window.addEventListener('keydown', onKeyDown)
    }

    return () => {
      window.removeEventListener('mousedown', onPointerDown, true)
      window.removeEventListener('touchstart', onPointerDown, true)
      window.removeEventListener('keydown', onKeyDown)
    }
  },
  { flush: 'post' }
)

const myProfilePath = computed(() => {
  const username = (user.value?.username ?? '').trim()
  return username ? `/u/${encodeURIComponent(username)}` : null
})

const postMaxLen = computed(() => (isPremium.value ? 500 : 200))
const postCharCount = computed(() => draft.value.length)

const meAvatarUrl = computed(() => {
  const base = assetUrl(user.value?.avatarKey)
  if (!base) return null
  const v = user.value?.avatarUpdatedAt || ''
  return v ? `${base}?v=${encodeURIComponent(v)}` : base
})

const visibility = useCookie<PostVisibility>('moh.post.visibility.v1', {
  default: () => 'public',
  sameSite: 'lax',
  path: '/',
  maxAge: 60 * 60 * 24 * 365,
})

const colorMode = useColorMode()
const isDarkMode = computed(() => colorMode.value === 'dark')

const composerTintCss = computed(() => {
  // We need to beat the global html/html.dark `!important` theme tint overrides,
  // so we also apply `!important` and use a more specific selector.
  const baseSel = 'html .moh-composer-tint'
  const darkSel = 'html.dark .moh-composer-tint'

  if (visibility.value === 'verifiedOnly') {
    return (
      primaryPaletteToCssVars(PRIMARY_VERIFIED_BLUE, baseSel, '#ffffff') +
      primaryPaletteToCssVars(PRIMARY_VERIFIED_BLUE, darkSel, '#000000')
    )
  }
  if (visibility.value === 'premiumOnly') {
    return (
      primaryPaletteToCssVars(PRIMARY_PREMIUM_ORANGE, baseSel, '#ffffff') +
      primaryPaletteToCssVars(PRIMARY_PREMIUM_ORANGE, darkSel, '#000000')
    )
  }

  // Public: neutral (text tint) per mode.
  return (
    primaryPaletteToCssVars(PRIMARY_TEXT_LIGHT, baseSel, '#ffffff') +
    primaryPaletteToCssVars(PRIMARY_TEXT_DARK, darkSel, '#000000')
  )
})

useHead({
  style: [{ key: 'moh-composer-tint', textContent: composerTintCss }],
})

const composerAccentClass = computed(() => {
  if (visibility.value === 'verifiedOnly') return 'moh-composer-accent-verified'
  if (visibility.value === 'premiumOnly') return 'moh-composer-accent-premium'
  return 'moh-composer-accent-public'
})
const allowedComposerVisibilities = computed<PostVisibility[]>(() => {
  // Verified users can post public or verified-only. Premium-only is premium members only.
  return isPremium.value ? ['public', 'verifiedOnly', 'premiumOnly'] : ['public', 'verifiedOnly']
})

watch(
  allowedComposerVisibilities,
  (allowed) => {
    const set = new Set(allowed)
    if (!set.has(visibility.value)) visibility.value = 'public'
  },
  { immediate: true }
)

const postButtonOutlined = computed(() => visibility.value === 'public')
const postButtonClass = computed(() => {
  if (visibility.value === 'verifiedOnly') {
    return '!border-sky-600 !bg-sky-600 !text-white hover:!bg-sky-700 hover:!border-sky-700 dark:!border-sky-500 dark:!bg-sky-500 dark:!text-black dark:hover:!bg-sky-400'
  }
  if (visibility.value === 'premiumOnly') {
    return '!border-amber-600 !bg-amber-600 !text-white hover:!bg-amber-700 hover:!border-amber-700 dark:!border-amber-500 dark:!bg-amber-500 dark:!text-black dark:hover:!bg-amber-400'
  }
  // public
  return '!border-gray-300 !text-gray-900 hover:!bg-gray-50 dark:!border-zinc-700 dark:!text-gray-50 dark:hover:!bg-zinc-900'
})

const composerVisibilityLabel = computed(() => {
  if (visibility.value === 'verifiedOnly') return 'Verified'
  if (visibility.value === 'premiumOnly') return 'Premium'
  return 'Public'
})

const composerVisibilityPillClass = computed(() => {
  // Reuse the same palette system as profile/home filters.
  // (Public: neutral, Verified: blue, Premium: orange)
  return filterPillClasses(visibility.value, true)
})

const composerVisibilityWrapEl = ref<HTMLElement | null>(null)
const composerVisibilityPopoverOpen = ref(false)

function closeComposerVisibilityPopover() {
  composerVisibilityPopoverOpen.value = false
}

function toggleVisibilityPopover() {
  composerVisibilityPopoverOpen.value = !composerVisibilityPopoverOpen.value
}

function setComposerVisibility(v: PostVisibility) {
  visibility.value = v
  closeComposerVisibilityPopover()
}

watch(
  composerVisibilityPopoverOpen,
  (open) => {
    if (!import.meta.client) return

    const onPointerDown = (e: Event) => {
      const el = composerVisibilityWrapEl.value
      const target = e.target as Node | null
      if (!el || !target) return
      if (el.contains(target)) return
      closeComposerVisibilityPopover()
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeComposerVisibilityPopover()
    }

    if (open) {
      window.addEventListener('mousedown', onPointerDown, true)
      window.addEventListener('touchstart', onPointerDown, true)
      window.addEventListener('keydown', onKeyDown)
    }

    return () => {
      window.removeEventListener('mousedown', onPointerDown, true)
      window.removeEventListener('touchstart', onPointerDown, true)
      window.removeEventListener('keydown', onKeyDown)
    }
  },
  { flush: 'post' }
)

const submitting = ref(false)

if (import.meta.server) {
  await refresh()
} else {
  onMounted(() => void refresh())
}

// If auth state changes (login/logout), refresh feed so visibility rules apply immediately.
watch(
  () => user.value?.id ?? null,
  () => {
    // When logging out, previously fetched (verified/premium) posts might still be in memory.
    // Re-fetch so the feed matches the viewer's permissions.
    void refresh()
  },
  { flush: 'post' }
)


const submit = async () => {
  if (!canPost.value) return
  if (submitting.value) return
  if (postCharCount.value > postMaxLen.value) return
  submitting.value = true
  try {
    await addPost(draft.value, visibility.value)
    draft.value = ''
  } finally {
    submitting.value = false
  }
}

const goLogin = () => {
  const redirect = encodeURIComponent('/home')
  return navigateTo(`/login?redirect=${redirect}`)
}
</script>

