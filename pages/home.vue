<template>
  <div>
    <!-- Composer -->
    <div class="border-b border-gray-200 px-4 py-4 dark:border-zinc-800">
      <div v-if="isAuthed" class="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-x-3">
        <!-- Row 1: visibility picker (above, right-aligned) -->
        <div class="col-start-2 flex justify-end items-end mb-3 sm:mb-2">
          <div ref="composerVisibilityWrapEl" class="relative">
            <button
              type="button"
              class="inline-flex items-center rounded-full border px-2 py-1 text-[11px] font-semibold leading-none transition-colors"
              :class="composerVisibilityPillClass"
              aria-label="Select post visibility"
              :disabled="!viewerIsVerified"
              @click="viewerIsVerified ? toggleVisibilityPopover() : null"
            >
              <i v-if="visibility === 'public'" class="pi pi-globe mr-1 text-[10px] opacity-80" aria-hidden="true" />
              <AppVerifiedBadge
                v-else-if="visibility === 'verifiedOnly'"
                class="mr-1"
                status="identity"
                :premium="false"
                :show-tooltip="false"
              />
              <AppVerifiedBadge
                v-else-if="visibility === 'premiumOnly'"
                class="mr-1"
                status="identity"
                :premium="true"
                :show-tooltip="false"
              />
              <i v-else-if="visibility === 'onlyMe'" class="pi pi-eye-slash mr-1 text-[10px] opacity-80" aria-hidden="true" />
              {{ composerVisibilityLabel }}
              <i v-if="viewerIsVerified" class="pi pi-chevron-down ml-1 text-[9px] opacity-80" aria-hidden="true" />
            </button>

            <!-- Custom visibility picker -->
            <div
              v-if="composerVisibilityPopoverOpen"
              class="absolute right-0 top-full z-30 mt-2 w-56 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg dark:border-zinc-800 dark:bg-black"
              role="menu"
              aria-label="Post visibility"
            >
              <button
                v-if="allowedComposerVisibilities.includes('public')"
                type="button"
                class="w-full text-left px-3 py-2 text-sm font-semibold transition-colors text-gray-900 hover:bg-gray-50 dark:text-gray-50 dark:hover:bg-zinc-900"
                role="menuitem"
                @click="setComposerVisibility('public')"
              >
                <span class="inline-flex items-center gap-2">
                  <i class="pi pi-globe text-[12px] opacity-80" aria-hidden="true" />
                  <span>Public</span>
                </span>
              </button>

              <button
                v-if="allowedComposerVisibilities.includes('verifiedOnly')"
                type="button"
                class="w-full text-left px-3 py-2 text-sm font-semibold transition-colors text-sky-700 hover:bg-sky-600 hover:text-white dark:text-sky-300 dark:hover:bg-sky-500"
                role="menuitem"
                @click="setComposerVisibility('verifiedOnly')"
              >
                <span class="inline-flex items-center gap-2">
                  <AppVerifiedBadge status="identity" :premium="false" :show-tooltip="false" />
                  <span>Verified only</span>
                </span>
              </button>

              <button
                v-if="allowedComposerVisibilities.includes('premiumOnly')"
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
                <span class="inline-flex items-center gap-2">
                  <AppVerifiedBadge status="identity" :premium="true" :show-tooltip="false" />
                  <span>Premium only</span>
                </span>
                <span v-if="!isPremium" class="ml-2 font-mono text-[10px] opacity-80" aria-hidden="true">LOCKED</span>
              </button>

              <button
                v-if="allowedComposerVisibilities.includes('onlyMe')"
                type="button"
                class="w-full text-left px-3 py-2 text-sm font-semibold transition-colors text-violet-800 hover:bg-violet-600 hover:text-white dark:text-violet-300 dark:hover:bg-violet-500"
                role="menuitem"
                @click="setComposerVisibility('onlyMe')"
              >
                <span class="inline-flex items-center gap-2">
                  <i class="pi pi-eye-slash text-[12px]" aria-hidden="true" />
                  <span>Only me</span>
                </span>
              </button>
            </div>
          </div>
        </div>

        <!-- Row 2: avatar + textarea start aligned -->
        <NuxtLink
          v-if="myProfilePath"
          :to="myProfilePath"
          class="row-start-1 sm:row-start-2 col-start-1 mb-3 sm:mb-0 group shrink-0"
          aria-label="View your profile"
        >
          <div class="transition-opacity duration-200 group-hover:opacity-80">
            <AppAvatarCircle
              :src="meAvatarUrl"
              :name="user?.name ?? null"
              :username="user?.username ?? null"
              size-class="h-8 w-8 sm:h-10 sm:w-10"
            />
          </div>
        </NuxtLink>
        <div v-else class="row-start-1 sm:row-start-2 col-start-1 mb-3 sm:mb-0 shrink-0" aria-hidden="true">
          <AppAvatarCircle
            :src="meAvatarUrl"
            :name="user?.name ?? null"
            :username="user?.username ?? null"
            size-class="h-8 w-8 sm:h-10 sm:w-10"
          />
        </div>

        <div class="row-start-2 col-span-2 sm:col-span-1 sm:col-start-2 min-w-0 moh-composer-tint">
          <input
            ref="mediaFileInputEl"
            type="file"
            accept="image/*"
            class="hidden"
            multiple
            @change="onMediaFilesSelected"
          />

          <textarea
            ref="composerTextareaEl"
            v-model="draft"
            rows="3"
            class="moh-composer-textarea w-full resize-none overflow-hidden rounded-xl border border-gray-300 bg-transparent px-3 py-2 text-[15px] leading-6 text-gray-900 placeholder:text-gray-500 focus:outline-none dark:border-zinc-700 dark:text-gray-50 dark:placeholder:text-zinc-500"
            :style="composerTextareaVars"
            placeholder="What’s happening?"
            :maxlength="postMaxLen"
            @keydown="onComposerKeydown"
          />
          <AppInlineAlert v-if="submitError" class="mt-3" severity="danger">
            {{ submitError }}
          </AppInlineAlert>

          <div v-if="composerMedia.length" class="mt-3 flex flex-wrap gap-2">
            <div v-for="m in composerMedia" :key="m.localId" class="relative">
              <img
                :src="m.previewUrl"
                class="h-20 w-20 rounded-lg border moh-border object-cover bg-black/5 dark:bg-white/5"
                alt=""
                loading="lazy"
              />
              <button
                type="button"
                class="absolute -right-2 -top-2 inline-flex h-6 w-6 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 shadow-sm transition-colors hover:bg-gray-50 dark:border-zinc-800 dark:bg-black dark:text-gray-200 dark:hover:bg-zinc-900"
                aria-label="Remove media"
                @click="removeComposerMedia(m.localId)"
              >
                <span class="text-[12px] leading-none" aria-hidden="true">×</span>
              </button>
              <div
                v-if="m.uploading"
                class="absolute inset-0 flex items-center justify-center rounded-lg bg-black/35 text-white"
                aria-label="Uploading"
              >
                <i class="pi pi-spin pi-spinner text-[16px]" aria-hidden="true" />
              </div>
            </div>
          </div>

          <div class="mt-3 flex items-center justify-between">
            <div class="flex items-center gap-2 text-gray-500 dark:text-gray-400">
              <Button
                icon="pi pi-image"
                text
                rounded
                severity="secondary"
                aria-label="Add media"
                :disabled="!canAddMoreMedia"
                v-tooltip.bottom="tinyTooltip(canAddMoreMedia ? 'Add image/GIF' : 'Max 4 attachments')"
                @click="openMediaPicker"
              />
              <Button
                text
                rounded
                severity="secondary"
                aria-label="Add GIF"
                :disabled="!canAddMoreMedia"
                v-tooltip.bottom="tinyTooltip(canAddMoreMedia ? 'Add GIF (Giphy)' : 'Max 4 attachments')"
                @click="openGiphyPicker"
              >
                <template #icon>
                  <span
                    class="inline-flex items-center justify-center rounded-md border border-current/25 bg-transparent px-1.5 py-1 text-[10px] font-extrabold leading-none tracking-wide"
                    aria-hidden="true"
                  >
                    GIF
                  </span>
                </template>
              </Button>
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
                :disabled="submitting || !canPost || !draft.trim() || postCharCount > postMaxLen || composerUploading"
                :loading="submitting"
                @click="submit"
              />
            </div>
          </div>
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
      <div class="sticky top-0 z-20 mt-1 border-b border-gray-200 bg-white/90 px-4 py-3 backdrop-blur dark:border-zinc-800 dark:bg-black/80">
        <div class="flex items-center justify-end gap-2">
          <button
            v-if="feedScope !== 'all' || feedFilter !== 'all' || feedSort !== 'new'"
            type="button"
            class="inline-flex h-6 w-6 items-center justify-center rounded-full border border-gray-200 text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900 dark:border-zinc-800 dark:text-gray-300 dark:hover:bg-zinc-900 dark:hover:text-gray-50"
            aria-label="Reset feed to defaults"
            @click="
              () => {
                feedScope = 'all'
                setFeedFilter('all')
                setFeedSort('new')
              }
            "
          >
            <span class="text-[10px] leading-none opacity-75" aria-hidden="true">×</span>
          </button>

          <!-- Scope dropdown pill -->
          <div ref="feedScopeWrapEl" class="relative">
            <button
              type="button"
              class="inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[11px] font-semibold leading-none transition-colors"
              :class="feedScopePillClass"
              aria-label="Change feed scope"
              @click="toggleFeedScopePopover"
            >
              <i class="pi pi-users text-[10px] opacity-80" aria-hidden="true" />
              <span>{{ feedScopeChipLabel }}</span>
              <i class="pi pi-chevron-down text-[10px] opacity-70" aria-hidden="true" />
            </button>

            <div
              v-if="feedScopePopoverOpen"
              class="absolute right-0 top-full z-30 mt-2 w-56 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg dark:border-zinc-800 dark:bg-black"
              role="menu"
              aria-label="Feed scope"
            >
              <div class="px-3 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Scope
              </div>
              <button
                type="button"
                class="w-full text-left px-3 py-2 text-sm font-semibold transition-colors text-gray-900 hover:bg-gray-50 dark:text-gray-50 dark:hover:bg-zinc-900"
                role="menuitem"
                @click="
                  () => {
                    feedScope = 'all'
                    closeFeedScopePopover()
                  }
                "
              >
                <span class="inline-flex items-center justify-between w-full">
                  <span>All</span>
                  <i v-if="feedScope === 'all'" class="pi pi-check text-[12px] opacity-70" aria-hidden="true" />
                </span>
              </button>

              <button
                type="button"
                class="w-full text-left px-3 py-2 text-sm font-semibold transition-colors text-gray-900 hover:bg-gray-50 dark:text-gray-50 dark:hover:bg-zinc-900"
                role="menuitem"
                :disabled="!isAuthed"
                :class="!isAuthed ? 'opacity-60 cursor-not-allowed' : ''"
                @click="
                  () => {
                    if (!isAuthed) return
                    feedScope = 'following'
                    closeFeedScopePopover()
                  }
                "
              >
                <span class="inline-flex items-center justify-between w-full">
                  <span>
                    Following
                    <span v-if="!isAuthed" class="ml-2 font-mono text-[10px] opacity-80" aria-hidden="true">LOGIN</span>
                  </span>
                  <i v-if="feedScope === 'following'" class="pi pi-check text-[12px] opacity-70" aria-hidden="true" />
                </span>
              </button>
            </div>
          </div>

          <!-- Sort dropdown pill -->
          <div ref="feedSortWrapEl" class="relative">
            <button
              type="button"
              class="inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[11px] font-semibold leading-none transition-colors"
              :class="feedSortPillClass"
              aria-label="Change feed sort order"
              @click="toggleFeedSortPopover"
            >
              <i :class="feedSortIconClass" class="text-[10px] opacity-80" aria-hidden="true" />
              <span>{{ feedSortTagLabel }}</span>
              <i class="pi pi-chevron-down text-[10px] opacity-70" aria-hidden="true" />
            </button>

            <div
              v-if="feedSortPopoverOpen"
              class="absolute right-0 top-full z-30 mt-2 w-56 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg dark:border-zinc-800 dark:bg-black"
              role="menu"
              aria-label="Feed sort"
            >
              <div class="px-3 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Order
              </div>
              <button
                type="button"
                class="w-full text-left px-3 py-2 text-sm font-semibold transition-colors text-gray-900 hover:bg-gray-50 dark:text-gray-50 dark:hover:bg-zinc-900"
                role="menuitem"
                @click="setFeedSortFromPicker('new')"
              >
                <span class="inline-flex items-center justify-between w-full">
                  <span>Newest</span>
                  <i v-if="feedSort === 'new'" class="pi pi-check text-[12px] opacity-70" aria-hidden="true" />
                </span>
              </button>

              <button
                type="button"
                class="w-full text-left px-3 py-2 text-sm font-semibold transition-colors text-gray-900 hover:bg-gray-50 dark:text-gray-50 dark:hover:bg-zinc-900"
                role="menuitem"
                @click="setFeedSortFromPicker('trending')"
              >
                <span class="inline-flex items-center justify-between w-full">
                  <span>Trending</span>
                  <i v-if="feedSort === 'trending'" class="pi pi-check text-[12px] opacity-70" aria-hidden="true" />
                </span>
              </button>

              <div class="my-1 border-t border-gray-200 dark:border-zinc-800" />
              <div class="px-3 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Visibility
              </div>
              <button
                type="button"
                class="w-full text-left px-3 py-2 text-sm font-semibold transition-colors text-gray-900 hover:bg-gray-50 dark:text-gray-50 dark:hover:bg-zinc-900"
                role="menuitem"
                @click="setFeedFilterFromSortPicker('all')"
              >
                <span class="inline-flex items-center justify-between w-full">
                  <span>All</span>
                  <i v-if="feedFilter === 'all'" class="pi pi-check text-[12px] opacity-70" aria-hidden="true" />
                </span>
              </button>

              <button
                type="button"
                class="w-full text-left px-3 py-2 text-sm font-semibold transition-colors text-gray-900 hover:bg-gray-50 dark:text-gray-50 dark:hover:bg-zinc-900"
                role="menuitem"
                @click="setFeedFilterFromSortPicker('public')"
              >
                <span class="inline-flex items-center justify-between w-full">
                  <span>Public</span>
                  <i v-if="feedFilter === 'public'" class="pi pi-check text-[12px] opacity-70" aria-hidden="true" />
                </span>
              </button>

              <button
                type="button"
                class="w-full text-left px-3 py-2 text-sm font-semibold transition-colors text-sky-700 hover:bg-sky-600 hover:text-white dark:text-sky-300 dark:hover:bg-sky-500"
                role="menuitem"
                @click="setFeedFilterFromSortPicker('verifiedOnly')"
              >
                <span class="inline-flex items-center justify-between w-full">
                  <span>
                    Verified
                    <span v-if="!viewerIsVerified" class="ml-2 font-mono text-[10px] opacity-80" aria-hidden="true">LOCKED</span>
                  </span>
                  <i v-if="feedFilter === 'verifiedOnly'" class="pi pi-check text-[12px] opacity-70" aria-hidden="true" />
                </span>
              </button>

              <button
                type="button"
                class="w-full text-left px-3 py-2 text-sm font-semibold transition-colors text-amber-800 hover:bg-amber-600 hover:text-white dark:text-amber-300 dark:hover:bg-amber-500"
                role="menuitem"
                @click="setFeedFilterFromSortPicker('premiumOnly')"
              >
                <span class="inline-flex items-center justify-between w-full">
                  <span>
                    Premium
                    <span v-if="!viewerIsPremium" class="ml-2 font-mono text-[10px] opacity-80" aria-hidden="true">LOCKED</span>
                  </span>
                  <i v-if="feedFilter === 'premiumOnly'" class="pi pi-check text-[12px] opacity-70" aria-hidden="true" />
                </span>
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
          <div
            v-if="showFollowingEmptyState"
            class="mx-4 mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-zinc-800 dark:bg-zinc-950/40"
          >
            <div class="font-semibold text-gray-900 dark:text-gray-50">Nothing here yet</div>
            <div class="mt-1 text-sm text-gray-600 dark:text-gray-300">
              <template v-if="followingCount === 0">
                Your Following feed shows posts from people you follow (plus you). Follow a few people to see posts here.
              </template>
              <template v-else-if="followingCount !== null">
                You’re following people, but none of them have posted yet. Follow some more active accounts to fill your feed.
              </template>
              <template v-else>
                Your Following feed shows posts from people you follow (plus you). Follow a few people to see posts here.
              </template>
            </div>
            <div class="mt-3">
              <Button label="Find people" severity="secondary" @click="navigateTo('/explore')" />
            </div>
          </div>

          <div class="relative">
            <div v-for="p in posts" :key="p.id">
              <AppPostRow :post="p" @deleted="removePost" />
            </div>
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

  <Dialog
    v-if="giphyOpen"
    v-model:visible="giphyOpen"
    modal
    header="Add a GIF"
    :draggable="false"
    class="w-[min(44rem,calc(100vw-2rem))]"
  >
    <div class="flex items-center gap-2">
      <InputText
        ref="giphyInputRef"
        v-model="giphyQuery"
        class="w-full"
        placeholder="Search Giphy…"
        aria-label="Search Giphy"
        @keydown.enter.prevent="searchGiphy"
      />
      <Button label="Search" severity="secondary" :loading="giphyLoading" :disabled="giphyLoading" @click="searchGiphy" />
    </div>

    <div v-if="giphyError" class="mt-3 text-sm text-red-600 dark:text-red-400">
      {{ giphyError }}
    </div>

    <div class="mt-4 grid grid-cols-3 sm:grid-cols-4 gap-2">
      <button
        v-for="gif in giphyItems"
        :key="gif.id"
        type="button"
        class="overflow-hidden rounded-lg border moh-border bg-black/5 dark:bg-white/5 hover:opacity-90 transition-opacity"
        :disabled="!canAddMoreMedia"
        :aria-label="`Add GIF ${gif.title || ''}`"
        @click="selectGiphyGif(gif)"
      >
        <img :src="gif.url" class="h-24 w-full object-cover" alt="" loading="lazy" />
      </button>
    </div>
  </Dialog>
</template>

<script setup lang="ts">
import type { GiphySearchResponse, PostMediaKind, PostMediaSource, PostVisibility } from '~/types/api'
import type { ProfilePostsFilter } from '~/utils/post-visibility'
import { filterPillClasses } from '~/utils/post-visibility'
import { PRIMARY_PREMIUM_ORANGE, PRIMARY_TEXT_DARK, PRIMARY_TEXT_LIGHT, PRIMARY_VERIFIED_BLUE, primaryPaletteToCssVars } from '~/utils/theme-tint'
import { tinyTooltip } from '~/utils/tiny-tooltip'
import { getApiErrorMessage } from '~/utils/api-error'

definePageMeta({
  layout: 'app',
  title: 'Home',
  hideTopBar: true,
})

usePageSeo({
  title: 'Home',
  description: 'Your Men of Hunger feed — posts are shown in simple chronological order.',
  canonicalPath: '/home',
  noindex: true,
  ogType: 'website',
  image: '/images/banner.png',
})

const { user } = useAuth()
const isAuthed = computed(() => Boolean(user.value?.id))
const { apiFetchData } = useApiClient()
const toast = useAppToast()

const feedFilter = useCookie<ProfilePostsFilter>('moh.feed.filter.v1', {
  default: () => 'all',
  sameSite: 'lax',
  path: '/',
  maxAge: 60 * 60 * 24 * 365,
})

const feedScope = useCookie<'following' | 'all'>('moh.home.scope.v1', {
  default: () => 'all',
  sameSite: 'lax',
  path: '/',
  maxAge: 60 * 60 * 24 * 365,
})

const feedSort = useCookie<'new' | 'trending'>('moh.home.sort.v1', {
  default: () => 'new',
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

watch(
  feedScope,
  (v) => {
    if (v === 'following' || v === 'all') return
    feedScope.value = 'all'
  },
  { immediate: true }
)

watch(
  feedSort,
  (v) => {
    if (v === 'new' || v === 'trending') return
    feedSort.value = 'new'
  },
  { immediate: true }
)

const followingOnly = computed(() => Boolean(isAuthed.value && feedScope.value === 'following'))

const { posts, nextCursor, loading, error, refresh, loadMore, addPost, removePost } = usePostsFeed({
  visibility: feedFilter,
  followingOnly,
  sort: feedSort,
})

const followingCount = ref<number | null>(null)
const followingCountLoading = ref(false)
const showFollowingEmptyState = computed(() => {
  return Boolean(followingOnly.value && !loading.value && !error.value && posts.value.length === 0)
})

watchEffect(() => {
  if (!import.meta.client) return
  if (!isAuthed.value) return
  if (!showFollowingEmptyState.value) return
  if (followingCount.value !== null) return
  if (followingCountLoading.value) return

  followingCountLoading.value = true
  void apiFetchData<{ followingCount: number }>('/follows/me/following-count')
    .then((res) => {
      const n = Number((res as { followingCount?: unknown } | null)?.followingCount ?? 0)
      followingCount.value = Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0
    })
    .catch(() => {
      // Fall back to generic copy.
      followingCount.value = null
    })
    .finally(() => {
      followingCountLoading.value = false
    })
})
const draft = ref('')
const isPremium = computed(() => Boolean(user.value?.premium))

type ComposerMediaItem = {
  localId: string
  source: PostMediaSource
  kind: PostMediaKind
  // For UI preview (object URLs for uploads; direct URLs for Giphy).
  previewUrl: string
  // For API payload:
  r2Key?: string
  url?: string
  mp4Url?: string | null
  width?: number | null
  height?: number | null
  uploading?: boolean
}

const composerMedia = ref<ComposerMediaItem[]>([])
const canAddMoreMedia = computed(() => composerMedia.value.length < 4)
const composerUploading = computed(() => composerMedia.value.some((m) => Boolean(m.uploading)))

const mediaFileInputEl = ref<HTMLInputElement | null>(null)

function makeLocalId(): string {
  try {
    return crypto.randomUUID()
  } catch {
    return `m_${Date.now()}_${Math.random().toString(16).slice(2)}`
  }
}

function openMediaPicker() {
  if (!canAddMoreMedia.value) return
  mediaFileInputEl.value?.click()
}

function removeComposerMedia(localId: string) {
  const id = (localId ?? '').trim()
  if (!id) return
  const idx = composerMedia.value.findIndex((m) => m.localId === id)
  if (idx < 0) return
  const item = composerMedia.value[idx]
  if (item?.source === 'upload' && item.previewUrl?.startsWith('blob:')) {
    try {
      URL.revokeObjectURL(item.previewUrl)
    } catch {
      // ignore
    }
  }
  composerMedia.value.splice(idx, 1)
}

async function onMediaFilesSelected(e: Event) {
  if (!import.meta.client) return
  const input = e.target as HTMLInputElement | null
  const files = Array.from(input?.files ?? [])
  // reset so selecting the same file again triggers change
  if (input) input.value = ''
  if (!files.length) return

  for (const file of files) {
    if (!canAddMoreMedia.value) break
    if (!file) continue
    const ct = (file.type ?? '').toLowerCase()
    if (!ct.startsWith('image/')) continue

    const previewUrl = URL.createObjectURL(file)
    const localId = makeLocalId()

    const slot: ComposerMediaItem = {
      localId,
      source: 'upload',
      kind: ct === 'image/gif' ? 'gif' : 'image',
      previewUrl,
      uploading: true,
    }
    composerMedia.value.push(slot)

    try {
      const init = await apiFetchData<{ key: string; uploadUrl: string; headers: Record<string, string>; maxBytes?: number }>(
        '/uploads/post-media/init',
        {
          method: 'POST',
          body: { contentType: file.type },
        },
      )

      const maxBytes = typeof init.maxBytes === 'number' ? init.maxBytes : null
      if (maxBytes && file.size > maxBytes) {
        throw new Error('File is too large.')
      }

      const putRes = await fetch(init.uploadUrl, {
        method: 'PUT',
        headers: init.headers,
        body: file,
      })
      if (!putRes.ok) throw new Error('Failed to upload.')

      const committed = await apiFetchData<{ key: string; contentType: string; kind: PostMediaKind; width: number | null; height: number | null }>(
        '/uploads/post-media/commit',
        {
          method: 'POST',
          body: { key: init.key },
        },
      )

      const idx = composerMedia.value.findIndex((m) => m.localId === localId)
      if (idx >= 0) {
        const existing = composerMedia.value[idx]
        if (!existing) return
        composerMedia.value[idx] = {
          ...existing,
          uploading: false,
          kind: committed.kind,
          r2Key: committed.key,
          width: committed.width ?? null,
          height: committed.height ?? null,
        }
      }
    } catch (err: unknown) {
      removeComposerMedia(localId)
      toast.push({ title: getApiErrorMessage(err) || 'Failed to add media.', tone: 'error', durationMs: 2200 })
    }
  }
}

const giphyOpen = ref(false)
const giphyQuery = ref('')
const giphyLoading = ref(false)
const giphyError = ref<string | null>(null)
const giphyItems = ref<GiphySearchResponse['items']>([])
const giphyInputRef = ref<any>(null)
const giphyRequestId = ref(0)

function resetGiphyPickerState() {
  giphyQuery.value = ''
  giphyItems.value = []
  giphyError.value = null
  giphyLoading.value = false
}

function focusGiphyInput() {
  if (!import.meta.client) return
  try {
    // PrimeVue InputText exposes the underlying input as its $el.
    const root = (giphyInputRef.value?.$el ?? giphyInputRef.value) as HTMLElement | null
    const input = (root?.tagName === 'INPUT' ? (root as HTMLInputElement) : (root?.querySelector?.('input') as HTMLInputElement | null)) ?? null
    input?.focus()
    input?.select?.()
  } catch {
    // ignore
  }
}

function openGiphyPicker() {
  if (!canAddMoreMedia.value) return
  // Always start fresh (don't keep stale state around).
  resetGiphyPickerState()

  // Update the search field immediately (before the modal renders).
  giphyQuery.value = deriveGiphyQueryFromDraft(draft.value) ?? ''
  giphyOpen.value = true

  // Focus immediately once mounted.
  void nextTick().then(() => focusGiphyInput())

  // Immediately show results (best UX): either trending, or the derived query.
  void primeGiphyResults()
}

function deriveGiphyQueryFromDraft(text: string): string | null {
  const rawOriginal = (text ?? '').toString().trim()
  if (!rawOriginal) return null

  // If it's already a short "hype phrase", keep it essentially as-is.
  // This avoids weird transformations like "Let's" -> "Let".
  const withoutUrls = rawOriginal.replace(/https?:\/\/\S+/g, ' ').replace(/\s+/g, ' ').trim()
  if (withoutUrls && withoutUrls.length <= 28) {
    // Trim trailing punctuation; keep contractions.
    const cleaned = withoutUrls.replace(/[!?.,;:]+$/g, '').trim()
    if (cleaned.length >= 2) return normalizeGiphyQuery(cleaned)
  }

  const raw = withoutUrls.toLowerCase()
  // Heuristic: grab a few meaningful tokens from the end.
  const stop = new Set([
    'the',
    'a',
    'an',
    'and',
    'or',
    'to',
    'of',
    'in',
    'on',
    'for',
    'with',
    'is',
    'it',
    'this',
    'that',
    'i',
    'im',
    "i'm",
    'you',
    'we',
    'they',
    'my',
    'your',
    'our',
  ])
  const tokens = raw
    // Keep apostrophes inside words ("let's") so we don't lose meaning.
    .match(/[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu)
    ?.map((t) => t.trim())
    .filter((t) => t.length >= 2 && !stop.has(t)) ?? []
  if (!tokens.length) return null
  const picked = tokens.slice(-4)
  const q = picked.join(' ').trim()
  return q.length >= 2 ? normalizeGiphyQuery(q) : null
}

function normalizeGiphyQuery(q: string): string {
  const s = (q ?? '').toString().trim()
  if (!s) return ''
  // Reduce extremely long repeated letters so searches stay sane (e.g. "goooo" -> "gooo").
  // Keep at most 3 repeats.
  const collapsed = s.replace(/([A-Za-z])\1{3,}/g, '$1$1$1')
  return collapsed.replace(/\s+/g, ' ').trim()
}

async function fetchTrendingGifs() {
  if (!isAuthed.value) return
  if (giphyLoading.value) return
  const reqId = (giphyRequestId.value += 1)
  giphyLoading.value = true
  giphyError.value = null
  try {
    const res = await apiFetchData<GiphySearchResponse>('/giphy/trending', {
      method: 'GET',
      query: { limit: 24 },
    })
    if (!giphyOpen.value || giphyRequestId.value !== reqId) return
    giphyItems.value = res.items ?? []
  } catch (e: unknown) {
    if (!giphyOpen.value || giphyRequestId.value !== reqId) return
    giphyError.value = getApiErrorMessage(e) || 'Failed to load trending GIFs.'
    giphyItems.value = []
  } finally {
    if (giphyRequestId.value === reqId) giphyLoading.value = false
  }
}

async function primeGiphyResults() {
  if (!isAuthed.value) return
  if (giphyLoading.value) return
  const existing = giphyQuery.value.trim()
  if (existing.length >= 2) {
    await searchGiphy()
    return
  }
  await fetchTrendingGifs()
}

async function searchGiphy() {
  if (!isAuthed.value) return
  const q = giphyQuery.value.trim()
  if (q.length < 2) {
    await fetchTrendingGifs()
    return
  }
  if (giphyLoading.value) return
  const reqId = (giphyRequestId.value += 1)
  giphyLoading.value = true
  giphyError.value = null
  try {
    const res = await apiFetchData<GiphySearchResponse>('/giphy/search', {
      method: 'GET',
      query: { q, limit: 24 },
    })
    if (!giphyOpen.value || giphyRequestId.value !== reqId) return
    giphyItems.value = res.items ?? []
  } catch (e: unknown) {
    if (!giphyOpen.value || giphyRequestId.value !== reqId) return
    giphyError.value = getApiErrorMessage(e) || 'Failed to search Giphy.'
    giphyItems.value = []
  } finally {
    if (giphyRequestId.value === reqId) giphyLoading.value = false
  }
}

function selectGiphyGif(gif: GiphySearchResponse['items'][number]) {
  if (!canAddMoreMedia.value) return
  const url = (gif?.url ?? '').trim()
  if (!url) return
  composerMedia.value.push({
    localId: makeLocalId(),
    source: 'giphy',
    kind: 'gif',
    previewUrl: url,
    url,
    mp4Url: gif.mp4Url ?? null,
    width: gif.width ?? null,
    height: gif.height ?? null,
    uploading: false,
  })
  giphyOpen.value = false
}

watch(
  giphyOpen,
  (open) => {
    if (!open) {
      // Invalidate in-flight requests.
      giphyRequestId.value += 1
      // When closed/used, don't keep state around.
      resetGiphyPickerState()
    }
  },
  { flush: 'post' },
)

const viewerIsVerified = computed(() => Boolean(user.value?.verifiedStatus && user.value.verifiedStatus !== 'none'))
const viewerIsPremium = computed(() => Boolean(isPremium.value))

// Unverified users can only post to "Only me".
const canPost = computed(() => Boolean(isAuthed.value && (viewerIsVerified.value || visibility.value === 'onlyMe')))

const feedCtaKind = computed<null | 'verify' | 'premium'>(() => {
  if (feedFilter.value === 'verifiedOnly' && !viewerIsVerified.value) return 'verify'
  if (feedFilter.value === 'premiumOnly' && !viewerIsPremium.value) return 'premium'
  return null
})

function scrollFeedToTop() {
  if (!import.meta.client) return
  // `layouts/app.vue` owns the actual scroll container. Reuse the same event hook
  // as "re-tap active nav item" so this stays centralized.
  window.dispatchEvent(new CustomEvent('moh-scroll-top'))
}

function setFeedFilter(next: ProfilePostsFilter) {
  feedFilter.value = next
  if (feedCtaKind.value) return
  scrollFeedToTop()
  void refresh()
}

function setFeedSort(next: 'new' | 'trending') {
  feedSort.value = next
  if (feedCtaKind.value) return
  void refresh()
}

watch(
  () => feedScope.value,
  () => {
    if (feedCtaKind.value) return
    void refresh()
  },
  { flush: 'post' }
)

watch(
  () => feedSort.value,
  () => {
    if (feedCtaKind.value) return
    void refresh()
  },
  { flush: 'post' }
)

const feedFilterTagLabel = computed(() => {
  if (feedFilter.value === 'all') return 'All'
  if (feedFilter.value === 'public') return 'Public'
  if (feedFilter.value === 'verifiedOnly') return 'Verified'
  if (feedFilter.value === 'premiumOnly') return 'Premium'
  return 'All'
})

const feedScopeLabel = computed(() => {
  return feedScope.value === 'following' ? 'Following' : 'All'
})

const feedScopeChipLabel = computed(() => {
  return feedScopeLabel.value
})

const feedSortTagLabel = computed(() => {
  const base = feedSort.value === 'trending' ? 'Trending' : 'Newest'
  if (feedFilter.value === 'all') return base
  return `${base} · ${feedFilterTagLabel.value}`
})

function setFeedSortFromPicker(next: 'new' | 'trending') {
  setFeedSort(next)
  closeFeedSortPopover()
}

const feedScopePillClass = computed(() => {
  return 'border-gray-200 text-gray-700 hover:bg-gray-50 dark:border-zinc-800 dark:text-gray-200 dark:hover:bg-zinc-900'
})

const feedSortPillClass = computed(() => {
  // Color-coordinate with the selected visibility filter (subtle tint).
  if (feedFilter.value === 'verifiedOnly') return filterPillClasses('verifiedOnly', false)
  if (feedFilter.value === 'premiumOnly') return filterPillClasses('premiumOnly', false)
  if (feedFilter.value === 'public') return filterPillClasses('public', false)
  return filterPillClasses('all', false)
})

function setFeedFilterFromSortPicker(next: ProfilePostsFilter) {
  setFeedFilter(next)
  closeFeedSortPopover()
}

const feedScopeWrapEl = ref<HTMLElement | null>(null)
const feedScopePopoverOpen = ref(false)

function closeFeedScopePopover() {
  feedScopePopoverOpen.value = false
}

function toggleFeedScopePopover() {
  feedSortPopoverOpen.value = false
  feedScopePopoverOpen.value = !feedScopePopoverOpen.value
}

watch(
  feedScopePopoverOpen,
  (open) => {
    if (!import.meta.client) return

    const onPointerDown = (e: Event) => {
      const el = feedScopeWrapEl.value
      const target = e.target as Node | null
      if (!el || !target) return
      if (el.contains(target)) return
      closeFeedScopePopover()
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeFeedScopePopover()
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

const feedSortIconClass = computed(() => (feedSort.value === 'trending' ? 'pi pi-bolt' : 'pi pi-clock'))

const feedSortWrapEl = ref<HTMLElement | null>(null)
const feedSortPopoverOpen = ref(false)

function closeFeedSortPopover() {
  feedSortPopoverOpen.value = false
}

function toggleFeedSortPopover() {
  feedScopePopoverOpen.value = false
  feedSortPopoverOpen.value = !feedSortPopoverOpen.value
}

watch(
  feedSortPopoverOpen,
  (open) => {
    if (!import.meta.client) return

    const onPointerDown = (e: Event) => {
      const el = feedSortWrapEl.value
      const target = e.target as Node | null
      if (!el || !target) return
      if (el.contains(target)) return
      closeFeedSortPopover()
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeFeedSortPopover()
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
  return user.value?.avatarUrl ?? null
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

const composerTextareaEl = ref<HTMLTextAreaElement | null>(null)
let autosizeRaf: number | null = null

function autosizeComposerTextarea() {
  if (!import.meta.client) return
  const el = composerTextareaEl.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = `${el.scrollHeight}px`
}

function scheduleAutosize() {
  if (!import.meta.client) return
  if (autosizeRaf != null) return
  autosizeRaf = requestAnimationFrame(() => {
    autosizeRaf = null
    autosizeComposerTextarea()
  })
}

function onComposerKeydown(e: KeyboardEvent) {
  // Cmd+Enter (macOS) / Ctrl+Enter (Windows/Linux) submits.
  // Keep plain Enter behavior (new line) intact.
  if (e.key !== 'Enter') return
  if ((e as unknown as { isComposing?: boolean }).isComposing) return
  if (!(e.metaKey || e.ctrlKey)) return
  e.preventDefault()
  void submit()
}

watch(
  draft,
  () => {
    // Draft changes can come from submit/reset as well as typing.
    scheduleAutosize()
  },
  { flush: 'post' }
)

onMounted(() => scheduleAutosize())

onBeforeUnmount(() => {
  if (autosizeRaf != null) cancelAnimationFrame(autosizeRaf)
  autosizeRaf = null
})

const composerTextareaVars = computed<Record<string, string>>(() => {
  if (visibility.value === 'verifiedOnly') {
    return {
      '--moh-compose-accent': '#1D9BF0',
      '--moh-compose-ring': 'rgba(29, 155, 240, 0.45)',
    }
  }
  if (visibility.value === 'premiumOnly') {
    return {
      '--moh-compose-accent': '#F59E0B',
      '--moh-compose-ring': 'rgba(245, 158, 11, 0.45)',
    }
  }
  if (visibility.value === 'onlyMe') {
    return {
      '--moh-compose-accent': '#7C3AED',
      '--moh-compose-ring': 'rgba(124, 58, 237, 0.45)',
    }
  }
  // Public: neutral (text color per mode).
  return isDarkMode.value
    ? { '--moh-compose-accent': 'rgba(255, 255, 255, 0.85)', '--moh-compose-ring': 'rgba(255, 255, 255, 0.25)' }
    : { '--moh-compose-accent': 'rgba(0, 0, 0, 0.85)', '--moh-compose-ring': 'rgba(0, 0, 0, 0.18)' }
})
const allowedComposerVisibilities = computed<PostVisibility[]>(() => {
  // Unverified: only-me only. Verified: public + verified-only (+ premium-only if premium).
  if (!isAuthed.value) return ['public']
  if (!viewerIsVerified.value) return ['onlyMe']
  return isPremium.value ? ['public', 'verifiedOnly', 'premiumOnly', 'onlyMe'] : ['public', 'verifiedOnly', 'onlyMe']
})

watch(
  allowedComposerVisibilities,
  (allowed) => {
    const set = new Set(allowed)
    if (!set.has(visibility.value)) visibility.value = allowed[0] ?? 'public'
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
  if (visibility.value === 'onlyMe') {
    return '!border-violet-600 !bg-violet-600 !text-white hover:!bg-violet-700 hover:!border-violet-700 dark:!border-violet-500 dark:!bg-violet-500 dark:!text-black dark:hover:!bg-violet-400'
  }
  // public
  return '!border-gray-300 !text-gray-900 hover:!bg-gray-50 dark:!border-zinc-700 dark:!text-gray-50 dark:hover:!bg-zinc-900'
})

const composerVisibilityLabel = computed(() => {
  if (visibility.value === 'verifiedOnly') return 'Verified'
  if (visibility.value === 'premiumOnly') return 'Premium'
  if (visibility.value === 'onlyMe') return 'Only me'
  return 'Public'
})

const composerVisibilityPillClass = computed(() => {
  // Outline-only pill: colored text + border, clear background.
  // Reuse existing palette mapping, but use the "inactive" style (no bg).
  return `${filterPillClasses(visibility.value, false)} bg-transparent hover:bg-transparent dark:hover:bg-transparent`
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
const submitError = ref<string | null>(null)

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
  if (composerUploading.value) return
  submitError.value = null
  submitting.value = true
  try {
    const mediaPayload = composerMedia.value
      .map((m) => {
        if (m.source === 'upload') {
          const r2Key = (m.r2Key ?? '').trim()
          if (!r2Key) return null
          return {
            source: 'upload' as const,
            kind: m.kind,
            r2Key,
            width: m.width ?? null,
            height: m.height ?? null,
          }
        }
        const url = (m.url ?? '').trim()
        if (!url) return null
        return {
          source: 'giphy' as const,
          kind: 'gif' as const,
          url,
          mp4Url: m.mp4Url ?? null,
          width: m.width ?? null,
          height: m.height ?? null,
        }
      })
      .filter((x): x is NonNullable<typeof x> => Boolean(x))

    const created = await addPost(draft.value, visibility.value, mediaPayload)
    draft.value = ''
    // Clear composer media (and release blob URLs) after successful post.
    for (const m of composerMedia.value) {
      if (m.source === 'upload' && m.previewUrl?.startsWith('blob:')) {
        try {
          URL.revokeObjectURL(m.previewUrl)
        } catch {
          // ignore
        }
      }
    }
    composerMedia.value = []
    if (created?.id) {
      const to = `/p/${encodeURIComponent(created.id)}`
      const tone =
        visibility.value === 'premiumOnly'
          ? 'premiumOnly'
          : visibility.value === 'verifiedOnly'
            ? 'verifiedOnly'
            : visibility.value === 'onlyMe'
              ? 'onlyMe'
              : 'public'

      const detail =
        visibility.value === 'premiumOnly'
          ? 'Premium-only post · Tap to view.'
          : visibility.value === 'verifiedOnly'
            ? 'Verified-only post · Tap to view.'
            : visibility.value === 'onlyMe'
              ? 'Only you can see this · Tap to view.'
              : 'Tap to view.'

      toast.push({
        title: 'Posted',
        message: detail,
        tone,
        to,
        durationMs: 2600,
      })
    }
  } catch (e: unknown) {
    // If user is rate limited (posting too often), show a toast.
    const msg = getApiErrorMessage(e) || 'Failed to post.'
    submitError.value = msg
    toast.push({ title: msg, tone: 'error', durationMs: 2500 })
  } finally {
    submitting.value = false
  }
}

const goLogin = () => {
  const redirect = encodeURIComponent('/home')
  return navigateTo(`/login?redirect=${redirect}`)
}
</script>

<style scoped>
/* Make the PrimeVue Tabs bar flush + transparent (per design). */
:deep(.p-tabs),
:deep(.p-tablist) {
  background: transparent;
}
:deep(.p-tablist) {
  padding-left: 0 !important;
  padding-right: 0 !important;
  margin-left: 0 !important;
  margin-right: 0 !important;
  border-bottom: 0;
}
:deep(.p-tablist-tab-list) {
  padding-left: 0 !important;
  padding-right: 0 !important;
}
</style>

