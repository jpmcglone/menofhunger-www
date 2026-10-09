<template>
    <div class="border-b moh-border">
      <AppTitleBar>
        <div class="flex items-center justify-between gap-3">
          <div class="min-w-0 flex items-center gap-2">
            <AppGroupsGroupAvatar v-if="hydrated && appHeader?.group" :name="appHeader.group.name" :src="appHeader.group.avatarUrl" :size="32" />
            <Icon v-else-if="headerIcon" :name="headerIcon" class="text-xl shrink-0 opacity-80" aria-hidden="true" />
            <h1 class="min-w-0 truncate moh-h1">
              {{ headerTitle }}
            </h1>
            <AppVerifiedBadge
              v-if="hydrated && appHeader?.verifiedStatus"
              :status="appHeader.verifiedStatus"
              :premium="Boolean(appHeader?.premium)"
              :premium-plus="Boolean(appHeader?.premiumPlus)"
              :is-organization="Boolean((appHeader as any)?.isOrganization)"
            />
          </div>
          <div v-if="hydrated && typeof appHeader?.postCount === 'number'" class="shrink-0 moh-meta">
            <span class="font-semibold tabular-nums">{{ formatCompactNumber(appHeader.postCount) }}</span>
            <span class="ml-1">posts</span>
          </div>
        </div>
        <p v-if="headerDescription" class="moh-meta truncate">
          {{ headerDescription }}
        </p>
      </AppTitleBar>
    </div>
</template>

<script setup lang="ts">
import { formatCompact } from '~/utils/number-format'
import { routeHeaderDefaultsFor } from '~/config/routes'

/** Sticky page title bar: route-meta title during hydration, then the page-provided header. */
const props = defineProps<{ routeTitle: string }>()

const route = useRoute()
const currentGroup = useCurrentGroup()
const { header: appHeader } = useAppHeader()
// Prevent SSR hydration mismatches: render route meta during hydration, then swap to appHeader after mount.
// Shared state so the bar does not fall back to route meta again when it remounts between page layouts.
const hydrated = useState('app-title-bar-hydrated', () => false)
onMounted(() => {
  hydrated.value = true
})

const headerTitle = computed(() => {
  // During SSR + initial hydration, prefer route meta title for stable markup.
  if (!hydrated.value) return props.routeTitle
  // Moving between a group's Channels and Posts must not flash a generic title.
  if (currentGroup.value) return currentGroup.value.name
  const t = (appHeader.value?.title ?? '').trim()
  return t || props.routeTitle
})

const headerIcon = computed(() => (hydrated.value ? (appHeader.value?.icon ?? routeHeaderDefaults.value.icon) : routeHeaderDefaults.value.icon))
const headerDescription = computed(() =>
  hydrated.value ? (appHeader.value?.description ?? routeHeaderDefaults.value.description) : routeHeaderDefaults.value.description
)

const routeHeaderDefaults = computed(() => {
  return routeHeaderDefaultsFor(route.path)
})

function formatCompactNumber(n: number): string {
  try {
    return formatCompact(n)
  } catch {
    return String(n)
  }
}
</script>
