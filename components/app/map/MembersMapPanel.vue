<template>
  <div class="flex flex-col">
    <!-- Overview: ranked states -->
    <template v-if="!bucket">
      <div v-if="!membersVisible" class="moh-gutter-x border-b moh-border bg-[rgba(var(--moh-brass-rgb),0.05)] py-4">
        <AppMembersLockedCta compact />
      </div>
      <div class="moh-gutter-x flex items-center justify-between pb-2 pt-5">
        <h2 class="text-base font-bold tracking-tight moh-text">States</h2>
        <span class="text-xs font-medium moh-text-soft">{{ onlineOnly ? 'Most online first' : 'Most men first' }}</span>
      </div>

      <p v-if="!rankedStates.length" class="moh-gutter-x pb-5 text-sm moh-text-muted">
        {{ onlineOnly ? 'No one with a location is online right now.' : 'No one has added a location yet.' }}
      </p>

      <ul v-else class="moh-divide border-t moh-border">
        <li v-for="(s, i) in visibleStates" :key="s.state">
          <NuxtLink
            :to="{ path: '/map', query: { state: s.state } }"
            class="moh-gutter-x flex min-h-14 items-center gap-3 py-2.5 transition-colors hover:bg-[var(--moh-surface-hover)]"
            :class="viewerState === s.state ? 'bg-[rgba(var(--moh-brass-rgb),0.07)]' : ''"
          >
            <span class="w-5 shrink-0 text-xs font-semibold tabular-nums moh-text-soft">{{ i + 1 }}</span>
            <AppStateShape :state="s.state" class="h-6 w-6 shrink-0 text-[var(--moh-brass)] opacity-80" />
            <span class="min-w-0 flex-1">
              <span class="flex items-center gap-1.5">
                <span class="truncate text-sm font-semibold moh-text">{{ s.stateDisplay }}</span>
                <span v-if="viewerState === s.state" class="rounded-md bg-[var(--moh-brass)] px-1 text-[9px] font-bold uppercase leading-4 text-white">You</span>
              </span>
              <span class="mt-0.5 flex items-center gap-2 text-xs">
                <span class="moh-text-muted">{{ menLabel(s.memberCount) }}</span>
                <span v-if="s.onlineCount > 0" class="flex items-center gap-1 font-medium text-[var(--moh-online)]">
                  <span class="h-1.5 w-1.5 rounded-full bg-[var(--moh-online)]" aria-hidden="true" />{{ s.onlineCount }} online
                </span>
              </span>
            </span>
            <span class="flex shrink-0 -space-x-2">
              <AppUserAvatar
                v-for="u in s.preview.slice(0, 3)"
                :key="u.id"
                :user="u"
                size-class="h-6 w-6"
                :show-presence="false"
                :show-status="false"
                :enable-preview="false"
                class="rounded-full ring-2"
                :class="isOnline(u.id) ? 'ring-[var(--moh-online)]' : 'ring-[var(--moh-bg)]'"
              />
            </span>
          </NuxtLink>
        </li>
      </ul>

      <button
        v-if="rankedStates.length > COLLAPSED_COUNT"
        type="button"
        class="moh-gutter-x py-3 text-left text-sm font-semibold text-[var(--moh-brass)] hover:underline"
        @click="expanded = !expanded"
      >
        {{ expanded ? 'Show fewer' : `Show all ${rankedStates.length} states` }}
      </button>

      <NuxtLink
        :to="{ path: '/map', query: { state: 'none' } }"
        class="mt-2 block border-y moh-border bg-[var(--moh-surface-1)] transition-colors hover:bg-[var(--moh-surface-hover)]"
      >
        <span class="moh-gutter-x flex items-center gap-3 py-4">
          <span class="min-w-0 flex-1">
            <span class="block text-sm font-semibold moh-text">Location not set</span>
            <span class="mt-0.5 flex items-center gap-2 text-xs">
              <span class="moh-text-muted">{{ menLabel(totals.unlocated) }}</span>
              <span v-if="totals.unlocatedOnline > 0" class="flex items-center gap-1 font-medium text-[var(--moh-online)]">
                <span class="h-1.5 w-1.5 rounded-full bg-[var(--moh-online)]" aria-hidden="true" />{{ totals.unlocatedOnline }} online
              </span>
            </span>
            <span class="mt-1.5 block text-xs moh-text-soft">Includes men outside the US and anyone who hasn't added a ZIP code.</span>
          </span>
          <span class="flex shrink-0 -space-x-2">
            <AppUserAvatar
              v-for="u in unlocatedPreview.slice(0, 4)"
              :key="u.id"
              :user="u"
              size-class="h-6 w-6"
              :show-presence="false"
              :show-status="false"
              :enable-preview="false"
              class="rounded-full ring-2"
              :class="isOnline(u.id) ? 'ring-[var(--moh-online)]' : 'ring-[var(--moh-surface-1)]'"
            />
          </span>
        </span>
      </NuxtLink>

      <div v-if="!viewerHasLocation" class="moh-gutter-x py-4">
        <NuxtLink to="/settings/account" class="text-sm font-semibold text-[var(--moh-brass)] hover:underline">
          Add your ZIP code to put yourself on the map
        </NuxtLink>
      </div>
    </template>

    <!-- One state (or the no-location bucket) -->
    <template v-else>
      <div class="moh-gutter-x flex items-center justify-between gap-3 pb-2 pt-5">
        <h2 class="truncate text-base font-bold tracking-tight moh-text">{{ bucketTitle }}</h2>
        <NuxtLink
          v-if="bucket !== 'none' && membersVisible"
          :to="{ path: '/l', query: { state: bucket } }"
          class="shrink-0 text-xs font-semibold text-[var(--moh-brass)] hover:underline"
        >
          View directory
        </NuxtLink>
      </div>

      <div v-if="!membersVisible" class="moh-gutter-x border-t moh-border pb-6 pt-5">
        <p class="text-3xl font-bold tabular-nums tracking-tight moh-text">{{ bucketCounts.members.toLocaleString('en-US') }}</p>
        <p class="mt-0.5 text-sm moh-text-muted">{{ bucketCounts.members === 1 ? 'man' : 'men' }}<template v-if="bucket !== 'none'"> live here</template></p>
        <p class="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--moh-online)]">
          <span class="h-1.5 w-1.5 rounded-full bg-[var(--moh-online)]" aria-hidden="true" />
          {{ bucketCounts.online.toLocaleString('en-US') }} online right now
        </p>
        <AppMembersLockedCta class="mt-6" compact title="See who they are" />
      </div>

      <div v-else-if="bucketError && !members.length" class="moh-gutter-x pb-4">
        <AppInlineAlert severity="danger">{{ bucketError }}</AppInlineAlert>
      </div>
      <div v-else-if="bucketLoading && !members.length" class="flex justify-center py-8">
        <AppLogoLoader compact />
      </div>
      <p v-else-if="!members.length" class="moh-gutter-x pb-5 text-sm moh-text-muted">
        {{ onlineOnly ? 'No one here is online right now.' : 'No one here yet.' }}
      </p>

      <div v-else class="moh-divide border-t moh-border">
        <AppUserRow v-for="u in members" :key="u.id" :user="asRowUser(u)" show-presence />
      </div>

      <div v-if="membersVisible && bucketCursor && !onlineOnly" class="relative flex min-h-12 items-center justify-center py-5">
        <div ref="sentinelEl" class="absolute bottom-0 left-0 right-0 h-px" aria-hidden="true" />
        <Button v-if="bucketError" label="Try again" severity="secondary" rounded @click="emit('loadMore')" />
        <AppLogoLoader v-else-if="bucketLoading" compact />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { FollowListUser, FollowRelationship, MembersMapState, MembersMapUser } from '~/types/api'
import type { MembersMapBucket } from '~/composables/useMembersMap'

const props = defineProps<{
  states: MembersMapState[]
  onlineOnly: boolean
  totals: { unlocated: number; unlocatedOnline: number }
  unlocatedPreview: MembersMapUser[]
  viewerState: string | null
  viewerHasLocation: boolean
  bucket: MembersMapBucket | null
  bucketTitle: string
  members: MembersMapUser[]
  bucketLoading: boolean
  bucketCursor: string | null
  bucketError: string | null
  /** False for signed-out and unverified viewers: counts only, never names or faces. */
  membersVisible: boolean
  bucketCounts: { members: number; online: number }
}>()

const emit = defineEmits<{ (e: 'loadMore'): void }>()

const COLLAPSED_COUNT = 8
const expanded = ref(false)
const { isOnline } = usePresence()

const rankedStates = computed(() => {
  const metric = (s: MembersMapState) => (props.onlineOnly ? s.onlineCount : s.memberCount)
  return props.states
    .filter((s) => metric(s) > 0)
    .sort((a, b) => metric(b) - metric(a) || b.memberCount - a.memberCount || a.stateDisplay.localeCompare(b.stateDisplay))
})

const visibleStates = computed(() => (expanded.value ? rankedStates.value : rankedStates.value.slice(0, COLLAPSED_COUNT)))

const NO_RELATIONSHIP: FollowRelationship = {
  viewerFollowsUser: false,
  userFollowsViewer: false,
  viewerPostNotificationsEnabled: false,
}

function asRowUser(u: MembersMapUser): FollowListUser {
  return { ...u, relationship: u.relationship ?? NO_RELATIONSHIP }
}

function menLabel(n: number) {
  return `${n.toLocaleString('en-US')} ${n === 1 ? 'man' : 'men'}`
}

const sentinelEl = ref<HTMLElement | null>(null)
const middleScrollerRef = useMiddleScroller()
useLoadMoreObserver(
  sentinelEl,
  middleScrollerRef,
  computed(() => Boolean(props.bucketCursor) && !props.bucketLoading && !props.bucketError && !props.onlineOnly),
  () => emit('loadMore'),
)
</script>
