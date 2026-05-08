<template>
  <NuxtLink
    v-if="preview && username"
    :to="`/u/${encodeURIComponent(username)}`"
    class="group mt-2 block overflow-hidden rounded-xl border moh-border moh-surface transition-colors moh-surface-hover"
    @click.stop
  >
    <div class="flex items-center gap-3 p-3">
      <AppUserAvatar
        :user="preview"
        size-class="h-10 w-10 shrink-0"
        :show-presence="false"
        :enable-preview="false"
      />

      <div class="min-w-0 flex-1">
        <div class="flex items-center gap-1 flex-wrap">
          <span class="font-semibold text-sm moh-text truncate leading-tight">
            {{ preview.name || preview.username }}
          </span>
          <AppVerifiedBadge
            :status="preview.verifiedStatus"
            :premium="preview.premium"
            :premium-plus="preview.premiumPlus"
            :is-organization="preview.isOrganization"
            :steward-badge-enabled="preview.stewardBadgeEnabled"
            size="xs"
          />
        </div>
        <div class="text-xs moh-text-muted leading-tight">@{{ preview.username }}</div>
        <div v-if="preview.bio" class="mt-0.5 text-xs moh-text-muted line-clamp-1">{{ preview.bio }}</div>
        <div v-if="preview.followerCount != null" class="mt-1 text-[11px] moh-text-muted tabular-nums">
          {{ followerLabel }}
        </div>
      </div>

      <!-- Follow button — stop propagation so it doesn't trigger the NuxtLink -->
      <div class="shrink-0" @click.stop.prevent>
        <AppFollowButton
          v-if="isAuthed && preview.relationship"
          :user-id="preview.id"
          :username="preview.username"
          :initial-relationship="preview.relationship"
          rounded
          text
        />
      </div>
    </div>
  </NuxtLink>

  <!-- Skeleton while loading -->
  <div
    v-else-if="loading"
    class="mt-2 overflow-hidden rounded-xl border moh-border moh-surface animate-pulse"
    aria-hidden="true"
  >
    <div class="flex items-center gap-3 p-3">
      <div class="h-10 w-10 shrink-0 rounded-full bg-black/10 dark:bg-white/10" />
      <div class="flex-1 space-y-1.5">
        <div class="h-3 w-2/5 rounded bg-black/10 dark:bg-white/10" />
        <div class="h-2.5 w-1/4 rounded bg-black/10 dark:bg-white/10" />
      </div>
    </div>
  </div>

  <!-- Fallback when preview couldn't be loaded (profile private, fetch error, etc.) -->
  <div
    v-else-if="username"
    class="mt-2 overflow-hidden rounded-xl border moh-border moh-surface"
  >
    <div class="flex items-center gap-2 px-3 py-2 text-xs moh-text-muted">
      <Icon name="tabler:user" class="shrink-0 text-[13px]" aria-hidden="true" />
      <span>@{{ username }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { UserPreview } from '~/types/api'

const props = defineProps<{
  username: string
  /** When false, defer the fetch (e.g. row is off-screen). */
  enabled?: boolean
}>()

const { apiFetchData } = useApiClient()
const { isAuthed } = useAuth()

const preview = ref<UserPreview | null>(null)
const loading = ref(false)

const DWELL_MS = 400

watch(
  () => [props.username, props.enabled] as const,
  ([username, enabled], _old, onCleanup) => {
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | null = null
    onCleanup(() => {
      cancelled = true
      if (timer) clearTimeout(timer)
    })

    if (!username || enabled === false) return
    if (preview.value?.username === username) return

    preview.value = null
    loading.value = true

    timer = setTimeout(async () => {
      if (cancelled) return
      try {
        const res = await apiFetchData<UserPreview | { banned: true }>(
          `/users/${encodeURIComponent(username)}/preview`,
        )
        if (cancelled) return
        // Banned users: render nothing (v-if="preview" stays false)
        if (res && 'banned' in res) {
          preview.value = null
        } else {
          preview.value = (res as UserPreview) ?? null
        }
      } catch {
        if (!cancelled) preview.value = null
      } finally {
        if (!cancelled) loading.value = false
      }
    }, DWELL_MS)
  },
  { immediate: true },
)

const followerLabel = computed(() => {
  const n = preview.value?.followerCount ?? 0
  if (n === 1) return '1 follower'
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k followers`
  return `${n} followers`
})
</script>
