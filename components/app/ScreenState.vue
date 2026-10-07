<template>
  <div
    v-if="status === 'loading'"
    class="moh-screen-state moh-screen-state--skeletons"
    role="status"
    aria-label="Loading"
    aria-busy="true"
  >
    <AppSkeletonRow v-for="n in skeletonCount" :key="n" :variant="skeleton" />
  </div>

  <div v-else-if="status === 'content'" class="moh-screen-state moh-screen-state--content">
    <slot />
    <AppLoadMoreFooter
      v-if="loadMore"
      :state="loadMore"
      :manual="loadMoreManual"
      :load-label="loadMoreLabel"
      @retry="emit('loadMoreRetry')"
      @load="emit('loadMore')"
    />
  </div>

  <AppScreenStateFollowingEmpty
    v-else-if="emptyVariant === 'following'"
    :show-checkin-cta="showCheckinCta"
    @post="emit('post')"
    @check-in="emit('check-in')"
  />

  <section
    v-else
    class="moh-screen-state"
    :class="{ 'moh-screen-state--page': prominent }"
    :role="error || status === 'error' ? 'alert' : 'status'"
    :aria-labelledby="titleId"
  >
    <div class="moh-screen-state__content">
      <div class="moh-screen-state__symbol" aria-hidden="true">
        <AppIconGlyph :name="resolvedIcon" :size="28" />
      </div>
      <div class="moh-screen-state__copy">
        <component :is="prominent ? 'h1' : 'h2'" :id="titleId">{{ resolvedTitle }}</component>
        <div v-if="resolvedDescription || $slots.default" class="moh-screen-state__description">
          <slot>{{ resolvedDescription }}</slot>
        </div>
      </div>
      <div v-if="resolvedActionLabel || $slots.actions" class="moh-screen-state__actions">
        <AppActionButton v-if="resolvedActionLabel && resolvedActionTo" :as="NuxtLink" :to="resolvedActionTo" :label="resolvedActionLabel" />
        <AppActionButton
          v-else-if="resolvedActionLabel"
          :label="busy ? busyLabel : resolvedActionLabel"
          :disabled="busy"
          :aria-busy="busy || undefined"
          @click="emit('action')"
        >
          <AppIconGlyph v-if="busy" name="refresh" :size="18" class="motion-safe:animate-spin" />
          {{ busy ? busyLabel : resolvedActionLabel }}
        </AppActionButton>
        <slot name="actions">
          <NuxtLink v-if="isAllEmpty" to="/who-to-follow" class="inline-flex items-center text-sm font-medium moh-text-muted">{{ VOICE.actions.findPeople }}</NuxtLink>
        </slot>
      </div>
    </div>
  </section>
</template>

<script lang="ts">
export type ScreenStateStatus = 'loading' | 'empty' | 'error' | 'content'
export type ScreenStateEmptyVariant = 'default' | 'all' | 'following'
</script>

<script setup lang="ts">
import { NuxtLink } from '#components'
import type catalog from '~/design/icon-catalog.json'
import { VOICE } from '~/config/voice'
import type { LoadMoreFooterState } from '~/components/app/LoadMoreFooter.vue'
import type { SkeletonRowVariant } from '~/components/app/SkeletonRow.vue'

// Figma brief 1 (list kit): loading (skeleton), empty, error-with-retry, content.
// Empty variants fold AllEmptyState / FollowingEmptyState. Node 980:85.

const props = withDefaults(defineProps<{
  status?: ScreenStateStatus
  title?: string
  icon?: keyof typeof catalog
  description?: string | null
  prominent?: boolean
  error?: boolean
  actionLabel?: string
  actionTo?: string
  busy?: boolean
  busyLabel?: string
  skeleton?: SkeletonRowVariant
  skeletonCount?: number
  emptyVariant?: ScreenStateEmptyVariant
  followingCount?: number | null
  showCheckinCta?: boolean
  loadMore?: LoadMoreFooterState | null
  loadMoreManual?: boolean
  loadMoreLabel?: string
}>(), {
  status: undefined,
  title: undefined,
  icon: 'inbox',
  busyLabel: 'Trying again…',
  description: undefined,
  actionLabel: undefined,
  actionTo: undefined,
  skeleton: 'post',
  skeletonCount: 6,
  emptyVariant: 'default',
  followingCount: null,
  loadMore: null,
  loadMoreLabel: undefined,
})

const emit = defineEmits<{
  action: []
  post: []
  'check-in': []
  loadMore: []
  loadMoreRetry: []
}>()

const titleId = useId()
const isAllEmpty = computed(() => props.emptyVariant === 'all')
const resolvedTitle = computed(() => props.title ?? (isAllEmpty.value ? VOICE.feed.emptyTitle : ''))
const resolvedDescription = computed(() => {
  if (props.description !== undefined) return props.description
  return isAllEmpty.value ? VOICE.feed.emptyBody : undefined
})
const resolvedIcon = computed(() => props.icon ?? 'inbox')
const resolvedActionLabel = computed(() => props.actionLabel ?? (isAllEmpty.value ? VOICE.actions.explore : undefined))
const resolvedActionTo = computed(() => props.actionTo ?? (isAllEmpty.value ? '/explore' : undefined))
</script>

<style scoped>
.moh-screen-state { display: flex; align-items: center; justify-content: center; width: 100%; min-height: 280px; padding: 40px 24px; }
.moh-screen-state--skeletons { display: flex; flex-direction: column; align-items: stretch; justify-content: flex-start; min-height: 0; padding: 0; }
.moh-screen-state--content { display: block; min-height: 0; padding: 0; }
.moh-screen-state__content { display: flex; flex-direction: column; align-items: center; gap: 24px; width: 100%; max-width: 320px; text-align: center; }
.moh-screen-state__symbol { display: grid; place-items: center; width: 64px; height: 64px; border-radius: 20px; background: var(--moh-surface-2); border: 1px solid var(--moh-border); color: var(--moh-text-muted); }
.moh-screen-state__copy { display: flex; flex-direction: column; gap: 12px; width: 100%; overflow-wrap: anywhere; }
.moh-screen-state h1, .moh-screen-state h2 { margin: 0; font-size: 20px; font-weight: 600; line-height: 1.25; letter-spacing: -0.025em; color: var(--moh-text); text-wrap: balance; }
.moh-screen-state--page h1 { font-size: 28px; }
.moh-screen-state__description { font-size: 15px; line-height: 23px; color: var(--moh-text-muted); text-wrap: pretty; }
.moh-screen-state__actions { display: flex; flex-direction: column; gap: 8px; width: 100%; }
.moh-screen-state__actions :deep(a), .moh-screen-state__actions :deep(button) { min-height: 44px; justify-content: center; }
.moh-screen-state__actions :deep(a:focus-visible) { outline: 2px solid var(--moh-brass); outline-offset: 3px; border-radius: 999px; }
</style>
