<template>
  <AppPageContent bottom="standard">
    <div class="lg:flex lg:min-h-full">
      <section class="min-w-0 flex-1">
        <header class="moh-gutter-x flex flex-wrap items-end justify-between gap-3 pb-3 pt-4">
          <div class="min-w-0">
            <NuxtLink
              v-if="bucket"
              :to="{ path: '/map', query: filterQuery }"
              class="mb-1 inline-flex items-center gap-1 text-sm font-semibold text-[var(--moh-brass)] hover:underline"
            >
              <Icon name="tabler:chevron-left" class="h-4 w-4" aria-hidden="true" />
              All states
            </NuxtLink>
            <h1 class="text-xl font-bold tracking-tight moh-text sm:text-2xl">{{ title }}</h1>
            <p class="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
              <template v-if="summary">
                <span class="font-medium moh-text-muted">{{ subtitle }}</span>
                <span class="moh-text-soft" aria-hidden="true">·</span>
                <span class="inline-flex items-center gap-1.5 font-semibold text-[var(--moh-online)]">
                  <span class="relative flex h-2 w-2" aria-hidden="true">
                    <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--moh-online)] opacity-60 motion-reduce:hidden" />
                    <span class="relative inline-flex h-2 w-2 rounded-full bg-[var(--moh-online)]" />
                  </span>
                  {{ onlineLine }}
                </span>
              </template>
              <span v-else class="moh-text-soft">Where every man on Men of Hunger lives, by state.</span>
            </p>
          </div>

          <nav class="flex rounded-full bg-[var(--moh-surface-1)] p-[3px]" aria-label="Filter the map">
            <NuxtLink
              :to="{ path: '/map', query: bucketQuery(false) }"
              replace
              class="rounded-full px-3 py-1.5 text-[13px] font-semibold transition-colors"
              :class="!onlineOnly ? 'bg-[var(--moh-surface-2)] moh-text shadow-sm' : 'moh-text-muted hover:text-[var(--moh-text)]'"
              :aria-current="!onlineOnly ? 'true' : undefined"
            >
              Everyone
            </NuxtLink>
            <NuxtLink
              :to="{ path: '/map', query: bucketQuery(true) }"
              replace
              class="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-semibold transition-colors"
              :class="onlineOnly ? 'bg-[var(--moh-surface-2)] moh-text shadow-sm' : 'moh-text-muted hover:text-[var(--moh-text)]'"
              :aria-current="onlineOnly ? 'true' : undefined"
            >
              <span class="h-1.5 w-1.5 rounded-full bg-[var(--moh-online)]" aria-hidden="true" />
              Online now
            </NuxtLink>
          </nav>
        </header>

        <div v-if="error && !summary" class="moh-gutter-x pb-4">
          <AppInlineAlert severity="danger">{{ error }}</AppInlineAlert>
        </div>

        <ClientOnly>
          <AppMapMembersUsMap
            :states="states"
            :online-only="onlineOnly"
            :selected="mapSelected"
            :members="mapMembers"
            :member-total="mapMemberTotal"
            :pack-loading="bucketLoading && !bucketMembers.length"
            :viewer-state="viewerState"
            @select="selectState"
            @show-all="revealPanel"
          />
          <template #fallback>
            <div class="moh-gutter-x">
              <div class="h-[280px] w-full animate-pulse rounded-2xl bg-[var(--moh-surface-1)] sm:h-[420px]" />
            </div>
          </template>
        </ClientOnly>

        <div v-if="summary && !states.length" class="moh-gutter-x py-4 text-sm moh-text-muted">
          No one has added a location yet.
        </div>

        <div class="moh-gutter-x flex flex-wrap items-center gap-x-3 gap-y-2 pb-5 pt-3 text-[11px] moh-text-soft">
          <span class="inline-flex items-center gap-1.5">
            Fewer
            <span v-for="t in LEGEND_STEPS" :key="t" class="h-2 w-5 rounded-sm" :style="{ background: legendFill(t) }" aria-hidden="true" />
            More
          </span>
          <span class="hidden sm:inline">Tap a state to see who lives there. Pinch or ⌘/Ctrl + scroll to zoom.</span>
          <span class="sm:hidden">Tap a state to see who lives there.</span>
        </div>
      </section>

      <aside ref="panelEl" class="border-t moh-border lg:w-[360px] lg:shrink-0 lg:border-l lg:border-t-0">
        <AppMapMembersMapPanel
          :states="states"
          :online-only="onlineOnly"
          :totals="totals"
          :unlocated-preview="summary?.unlocatedPreview ?? []"
          :viewer-state="viewerState"
          :viewer-has-location="Boolean(viewerState)"
          :bucket="bucket"
          :bucket-title="bucketTitle"
          :members="panelMembers"
          :bucket-loading="bucketLoading"
          :bucket-cursor="bucketCursor"
          :bucket-error="bucketError"
          @load-more="loadMore"
        />
      </aside>
    </div>
  </AppPageContent>
</template>

<script setup lang="ts">
import type { MembersMapUser } from '~/types/api'
import type { MembersMapBucket } from '~/composables/useMembersMap'
import { usStateShape } from '~/utils/us-state-shapes'

definePageMeta({
  layout: 'app',
  title: 'Map',
  hideTopBar: true,
  middleware: ['verified'],
})

usePageSeo({
  title: 'Map',
  description: 'Where the men of Men of Hunger live, and who is online right now.',
  canonicalPath: '/map',
  noindex: true,
})

const LEGEND_STEPS = [0.15, 0.35, 0.55, 0.75, 1]

const route = useRoute()
const router = useRouter()
const { user } = useAuth()
const { isOnline } = usePresence()

const {
  summary,
  states,
  totals,
  error,
  bucket: loadedBucket,
  bucketMembers,
  bucketCursor,
  bucketLoading,
  bucketError,
  loadBucket,
} = useMembersMap()

const onlineOnly = computed(() => route.query.online === '1')

const bucket = computed<MembersMapBucket | null>(() => {
  const raw = typeof route.query.state === 'string' ? route.query.state.trim() : ''
  if (raw.toLowerCase() === 'none') return 'none'
  return /^[A-Za-z]{2}$/.test(raw) && usStateShape(raw) ? raw.toUpperCase() : null
})

const viewerState = computed(() => {
  const s = user.value?.locationState
  return typeof s === 'string' && s ? s.toUpperCase() : null
})

const selectedState = computed(() => states.value.find((s) => s.state === bucket.value) ?? null)
const mapSelected = computed(() => (bucket.value && bucket.value !== 'none' ? bucket.value : null))

const filterQuery = computed(() => (onlineOnly.value ? { online: '1' } : {}))
function bucketQuery(online: boolean) {
  return { ...(bucket.value ? { state: bucket.value } : {}), ...(online ? { online: '1' } : {}) }
}

const onlineMembers = (list: MembersMapUser[]) => (onlineOnly.value ? list.filter((u) => isOnline(u.id)) : list)
const panelMembers = computed(() => onlineMembers(loadedBucket.value === bucket.value ? bucketMembers.value : []))
const mapMembers = computed(() => (mapSelected.value ? panelMembers.value : []))
const mapMemberTotal = computed(() => {
  const s = selectedState.value
  if (!s) return 0
  return onlineOnly.value ? s.onlineCount : s.memberCount
})

const bucketTitle = computed(() => {
  if (bucket.value === 'none') return 'Location not set'
  const name = selectedState.value?.stateDisplay ?? usStateShape(bucket.value)?.name ?? bucket.value
  return `Men in ${name}`
})

const title = computed(() => {
  if (bucket.value === 'none') return 'Location not set'
  if (bucket.value) return selectedState.value?.stateDisplay ?? usStateShape(bucket.value)?.name ?? 'Map'
  return 'Where the men are'
})

function men(n: number) {
  return `${n.toLocaleString()} ${n === 1 ? 'man' : 'men'}`
}

const subtitle = computed(() => {
  if (bucket.value === 'none') return men(totals.value.unlocated)
  if (bucket.value) return men(selectedState.value?.memberCount ?? 0)
  const n = totals.value.states
  return `${men(totals.value.members)} · ${n} ${n === 1 ? 'state' : 'states'}`
})

const onlineLine = computed(() => {
  if (bucket.value === 'none') return `${totals.value.unlocatedOnline} online now`
  if (bucket.value) return `${selectedState.value?.onlineCount ?? 0} online now`
  return `${totals.value.online} online now`
})

function legendFill(t: number) {
  return `color-mix(in srgb, var(--moh-brass) ${Math.round(22 + t * 78)}%, var(--moh-surface-1))`
}

function selectState(code: string | null) {
  void router.push({ path: '/map', query: { ...(code ? { state: code } : {}), ...filterQuery.value } })
}

const panelEl = ref<HTMLElement | null>(null)
function revealPanel() {
  panelEl.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function loadMore() {
  if (bucket.value) void loadBucket(bucket.value, { more: true })
}

onMounted(() => {
  watch(bucket, (next) => void loadBucket(next), { immediate: true })
})
</script>
