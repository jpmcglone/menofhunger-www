<template>
  <NuxtLink
    v-if="preview && username"
    :to="`/u/${encodeURIComponent(username)}`"
    class="group mt-2 block overflow-hidden rounded-xl border moh-border moh-surface transition-colors moh-surface-hover moh-focus"
    @click.stop
  >
    <!-- Banner -->
    <div class="relative aspect-[4/1] w-full bg-black/5 dark:bg-white/5 overflow-hidden shrink-0">
      <img
        v-if="preview.bannerUrl"
        :src="preview.bannerUrl"
        alt=""
        class="h-full w-full object-cover"
        loading="lazy"
      >
    </div>

    <!-- Avatar + status pill (overlapping banner bottom) -->
    <div class="relative px-3">
      <div class="absolute left-3 -top-5">
        <div class="ring-2 ring-[color:var(--moh-surface-1)] rounded-full">
          <AppUserAvatar
            :user="preview"
            size-class="h-10 w-10"
            bg-class="moh-surface"
            :enable-preview="false"
            :show-status="false"
          />
        </div>
      </div>

      <!-- Status pill: right of avatar, anchored to banner bottom -->
      <ClientOnly>
        <div
          v-if="activeStatus"
          class="absolute left-[3.5rem] -top-4 inline-flex max-w-[10rem] items-center gap-1 rounded-full bg-white px-2 py-0.5 shadow ring-1 ring-black/5"
        >
          <Icon name="tabler:message-circle-filled" class="shrink-0 text-[10px] text-zinc-950" aria-hidden="true" />
          <span class="truncate text-[10px] font-semibold leading-tight text-zinc-950">{{ activeStatus.text }}</span>
        </div>
      </ClientOnly>

      <!-- Online pill: right-aligned -->
      <div v-if="preview.id && (showOnlineNow || showLastOnline)" class="flex justify-end -mt-3 mb-1">
        <div
          class="rounded-full px-2 py-0.5 text-[10px] shadow-sm backdrop-blur-sm"
          :class="showOnlineNow
            ? 'bg-green-600/90 text-white dark:bg-green-500/20 dark:text-green-200'
            : 'bg-white/70 text-gray-600 dark:bg-black/60 dark:text-gray-400 tabular-nums'"
        >
          <template v-if="showOnlineNow">Online now</template>
          <template v-else>Last online {{ lastOnlineShort }}</template>
        </div>
      </div>
      <div v-else class="mt-2" />

      <!-- Name + follow -->
      <div class="flex items-start justify-between gap-2 pb-3 pt-1">
        <AppUserIdentityLine
          :user="preview"
          name-class="text-sm font-bold"
          handle-class="text-xs"
          badge-size="sm"
          :org-affiliations="preview.orgAffiliations ?? null"
          class="min-w-0 flex-1"
        />
        <div class="shrink-0 pt-0.5" @click.stop.prevent>
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
    </div>
  </NuxtLink>

  <!-- Skeleton while loading -->
  <div
    v-else-if="loading"
    class="mt-2 overflow-hidden rounded-xl border moh-border moh-surface animate-pulse"
    aria-hidden="true"
  >
    <div class="aspect-[4/1] w-full bg-black/10 dark:bg-white/10" />
    <div class="px-3 pt-1 pb-3">
      <div class="flex items-center gap-3 mt-3">
        <div class="h-10 w-10 shrink-0 rounded-full bg-black/10 dark:bg-white/10" />
        <div class="flex-1 space-y-1.5">
          <div class="h-3 w-2/5 rounded bg-black/10 dark:bg-white/10" />
          <div class="h-2.5 w-1/4 rounded bg-black/10 dark:bg-white/10" />
        </div>
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
import { formatListTime } from '~/utils/time-format'

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

// ── Presence / online status ──────────────────────────────────────────────────
const { addInterest, removeInterest, getPresenceStatus, getUserStatus, isPresenceKnown } = usePresence()
const { user: authUser } = useAuth()

const lastUserId = ref<string | null>(null)
watch(
  () => preview.value?.id ?? null,
  (nextId) => {
    if (!import.meta.client) return
    const prev = lastUserId.value
    if (prev && prev !== nextId) removeInterest([prev])
    lastUserId.value = nextId ?? null
    if (nextId) addInterest([nextId])
  },
  { immediate: true },
)
onBeforeUnmount(() => {
  const id = lastUserId.value
  if (id) removeInterest([id])
})

const presenceStatus = computed(() => {
  const id = preview.value?.id
  if (!id) return 'offline'
  return getPresenceStatus(id)
})
const showOnlineNow = computed(() => presenceStatus.value !== 'offline')
const activeStatus = computed(() => getUserStatus(preview.value?.id ?? ''))

const viewerCanSeeLastOnline = computed(() => {
  const status = authUser.value?.verifiedStatus ?? 'none'
  return Boolean(authUser.value?.siteAdmin) || (typeof status === 'string' && status !== 'none')
})
const showLastOnline = computed(() => {
  if (!viewerCanSeeLastOnline.value) return false
  if (presenceStatus.value !== 'offline') return false
  if (!preview.value?.id || !isPresenceKnown(preview.value.id)) return false
  return Boolean(preview.value.lastOnlineAt)
})
const { nowMs } = useNowTicker({ everyMs: 15_000 })
const lastOnlineShort = computed(() => {
  const iso = preview.value?.lastOnlineAt ?? null
  const t = formatListTime(iso, nowMs.value)
  if (t === 'now') return '<1m ago'
  if (/^\d+[mhd]$/.test(t)) return `${t} ago`
  return t
})
</script>
