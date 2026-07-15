<template>
  <AppPageContent bottom="standard">
    <div class="w-full">
      <div class="sticky top-0 z-20 border-b moh-border moh-frosted moh-texture overflow-hidden">
        <div class="relative z-10 flex items-center gap-3 px-3 py-2.5 sm:px-4 sm:py-3">
          <div class="min-w-0 flex-1">
            <div class="text-base sm:text-lg font-semibold">{{ stateLabel }}</div>
            <div class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Posts from members in {{ stateLabel }}</div>
          </div>
        </div>
      </div>

      <!-- Members in this state — overlapping avatars + see all -->
      <div
        v-if="previewUsers.length"
        class="flex items-center gap-3 border-b moh-border px-3 py-3 sm:px-4"
      >
        <NuxtLink
          :to="membersHref"
          class="group flex min-w-0 flex-1 items-center gap-3 moh-focus rounded-lg"
          :aria-label="`See all members in ${stateLabel}`"
        >
          <div class="relative inline-flex shrink-0 items-center">
            <AppAvatarFacepile
              :authors="facepileAuthors"
              size-class="h-8 w-8"
              overlap-class="-ml-2.5"
            />
            <div
              class="pointer-events-none absolute inset-y-0 right-0 w-10 rounded-r-full bg-gradient-to-l from-[var(--moh-bg)] to-transparent"
              aria-hidden="true"
            />
          </div>
          <div class="min-w-0 flex-1">
            <div class="text-sm font-medium moh-text truncate">
              Members in {{ stateLabel }}
            </div>
            <div class="text-xs moh-text-muted truncate">
              Tap to see everyone
            </div>
          </div>
        </NuxtLink>
        <NuxtLink
          :to="membersHref"
          class="shrink-0 text-sm font-semibold text-[var(--moh-link)] hover:underline underline-offset-2"
        >
          See all
        </NuxtLink>
      </div>

      <AppInlineAlert v-if="error" class="mx-3 mt-3 sm:mx-4 sm:mt-4" severity="danger">
        {{ error }}
      </AppInlineAlert>

      <AppSubtleSectionLoader :loading="showInitialLoader" min-height-class="min-h-[240px]">
        <div
          v-if="initialLoadResolved && !displayPosts.length && !nextCursor && !loading"
          class="px-3 py-6 sm:px-4 sm:py-8 text-center text-[13px] sm:text-sm text-gray-500 dark:text-gray-400"
        >
          No posts from {{ stateLabel }} yet.
        </div>

        <div v-else class="relative mt-3">
          <template v-for="post in displayPosts" :key="post._localId ?? post.id">
            <AppFeedPostRow
              :post="post"
              collapse-ancestors
            />
          </template>
        </div>

        <div v-if="nextCursor && !loading" class="px-3 pt-2.5 pb-0 sm:px-4 sm:pt-3 sm:pb-3 text-center">
          <Button
            label="Load more"
            text
            severity="secondary"
            :loading="loadingMore"
            @click="loadMore"
          />
        </div>
        <div v-else-if="loadingMore" class="px-3 pt-2.5 pb-0 sm:px-4 sm:pt-3 sm:pb-3 text-center">
          <div class="inline-flex transition-opacity duration-150">
            <AppLogoLoader compact />
          </div>
        </div>
      </AppSubtleSectionLoader>
    </div>
  </AppPageContent>
</template>

<script setup lang="ts">
import type { FollowListUser, LocationBrowseResponse } from '~/types/api'
import type { ReplyAuthorPreview } from '~/utils/thread-reply-authors'

definePageMeta({
  layout: 'app',
  hideTopBar: true,
  ssr: false,
})

const route = useRoute()
const { apiFetchData } = useApiClient()
const stateCode = computed(() => String(route.params.code ?? '').toUpperCase())

const STATE_NAMES: Record<string, string> = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
  CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', FL: 'Florida', GA: 'Georgia',
  HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa',
  KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland',
  MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi',
  MO: 'Missouri', MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire',
  NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York', NC: 'North Carolina',
  ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania',
  RI: 'Rhode Island', SC: 'South Carolina', SD: 'South Dakota', TN: 'Tennessee',
  TX: 'Texas', UT: 'Utah', VT: 'Vermont', VA: 'Virginia', WA: 'Washington',
  WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming', DC: 'Washington D.C.',
}

const stateLabel = computed(() => STATE_NAMES[stateCode.value] ?? stateCode.value)
const membersHref = computed(() => ({ path: '/l', query: { state: stateCode.value } }))

usePageSeo({
  title: computed(() => `Posts from ${stateLabel.value}`),
  description: computed(() => `A feed of posts from Men of Hunger members in ${stateLabel.value}.`),
  canonicalPath: computed(() => `/state/${stateCode.value.toLowerCase()}`),
  noindex: true,
})

const {
  displayPosts,
  nextCursor,
  loading,
  loadingMore,
  error,
  refresh,
  loadMore,
} = usePostsFeed({
  authorLocationState: stateCode,
})

const previewUsers = ref<FollowListUser[]>([])
const facepileAuthors = computed<ReplyAuthorPreview[]>(() =>
  previewUsers.value.slice(0, 8).map((u) => ({
    id: u.id,
    username: u.username,
    name: u.name,
    avatarUrl: u.avatarUrl,
    isOrganization: u.isOrganization,
  })),
)

async function loadMemberPreview() {
  const code = stateCode.value
  if (!code || code.length !== 2) {
    previewUsers.value = []
    return
  }
  try {
    const data = await apiFetchData<LocationBrowseResponse>('/users/by-location', {
      method: 'GET',
      query: { state: code, limit: 12 },
      mohDedupe: true,
    })
    const stateSection = data?.sections?.find((s) => s.key === 'sameState')
    previewUsers.value = stateSection?.users ?? data?.sections?.[0]?.users ?? []
  } catch {
    previewUsers.value = []
  }
}

const initialLoadResolved = ref(false)
const showInitialLoader = computed(
  () => !initialLoadResolved.value || (loading.value && displayPosts.value.length === 0),
)

onMounted(async () => {
  void loadMemberPreview()
  try {
    await refresh()
  } finally {
    initialLoadResolved.value = true
  }
})

onActivated(async () => {
  void loadMemberPreview()
  await refresh()
})

watch(stateCode, () => {
  void loadMemberPreview()
})
</script>
