<template>
  <AppPageContent bottom="standard">
    <div class="w-full">
      <div v-if="!space" class="moh-gutter-x py-8">
        <div v-if="loading" class="flex items-center gap-2 moh-meta">
          <Icon name="tabler:loader" class="text-[18px] opacity-80 animate-spin" aria-hidden="true" />
          <span>Loading space…</span>
        </div>
        <div v-else class="moh-meta">
          <p>Space not found.</p>
          <NuxtLink to="/spaces" class="mt-2 inline-flex font-semibold text-[var(--p-primary-color)] hover:underline">
            Back to Spaces
          </NuxtLink>
        </div>
      </div>

      <template v-else>
        <div class="moh-gutter-x pt-4 pb-3">
          <h1 class="moh-h1">{{ space.name }}</h1>
          <p class="mt-1 moh-meta">Live chat and music in the bar below. Share this link to bring others here.</p>
        </div>

        <div class="moh-gutter-x pb-6 pt-1">
          <div class="flex items-center justify-between gap-3 text-sm text-gray-600 dark:text-gray-300">
            <div class="min-w-0 truncate">
              <span class="font-semibold tabular-nums text-gray-900 dark:text-gray-100">{{ members.length }}</span>
              <span> here</span>
            </div>
          </div>

          <div v-if="currentSpace && members.length === 0" class="mt-3 text-sm text-gray-600 dark:text-gray-300">
            No one here yet. You’re the first.
          </div>

          <div v-else-if="currentSpace" class="mt-3 flex flex-wrap gap-3">
            <template v-for="u in lobbyMembers" :key="u.id">
              <NuxtLink
                v-if="u.username"
                :to="`/u/${encodeURIComponent(u.username)}`"
                class="group moh-focus rounded-xl"
                :aria-label="`View @${u.username}`"
                v-tooltip.bottom="tinyTooltip(`@${u.username}`)"
              >
                <div class="relative">
                  <AppUserAvatar
                    :user="{ id: u.id, username: u.username, avatarUrl: u.avatarUrl }"
                    size-class="h-10 w-10"
                    bg-class="moh-surface dark:bg-black"
                    :show-presence="false"
                  />
                  <Transition name="moh-avatar-pause-fade">
                    <div
                      v-if="u.paused"
                      class="absolute inset-0 rounded-full bg-black/30 flex items-center justify-center moh-avatar-pause moh-avatar-pause-sm"
                      aria-hidden="true"
                    >
                      <Icon name="tabler:player-pause" aria-hidden="true" />
                    </div>
                    <div
                      v-else-if="u.muted"
                      class="absolute inset-0 rounded-full bg-black/30 flex items-center justify-center moh-avatar-pause moh-avatar-pause-sm"
                      aria-hidden="true"
                    >
                      <Icon name="tabler:volume-off" aria-hidden="true" />
                    </div>
                  </Transition>
                </div>
              </NuxtLink>
              <div
                v-else
                class="group rounded-xl"
                v-tooltip.bottom="tinyTooltip('User')"
              >
                <div class="relative">
                  <AppUserAvatar
                    :user="{ id: u.id, username: u.username, avatarUrl: u.avatarUrl }"
                    size-class="h-10 w-10"
                    bg-class="moh-surface dark:bg-black"
                    :show-presence="false"
                  />
                  <Transition name="moh-avatar-pause-fade">
                    <div
                      v-if="u.paused"
                      class="absolute inset-0 rounded-full bg-black/30 flex items-center justify-center moh-avatar-pause moh-avatar-pause-sm"
                      aria-hidden="true"
                    >
                      <Icon name="tabler:player-pause" aria-hidden="true" />
                    </div>
                    <div
                      v-else-if="u.muted"
                      class="absolute inset-0 rounded-full bg-black/30 flex items-center justify-center moh-avatar-pause moh-avatar-pause-sm"
                      aria-hidden="true"
                    >
                      <Icon name="tabler:volume-off" aria-hidden="true" />
                    </div>
                  </Transition>
                </div>
              </div>
            </template>
          </div>
        </div>
      </template>
    </div>
  </AppPageContent>
</template>

<script setup lang="ts">
import { tinyTooltip } from '~/utils/tiny-tooltip'

const route = useRoute()
const id = computed(() => (route.params.id as string)?.trim() ?? '')

const { spaces, loading, loadedOnce, loadSpaces, getById } = useSpaces()
const { select, currentSpace, members, subscribeLobbyCounts, unsubscribeLobbyCounts } = useSpaceLobby()

const space = computed(() => (id.value ? getById(id.value) : null))
const lobbyMembers = computed(() => members.value ?? [])

// Sync route id to selected space: select when we have a valid id and space exists.
watch(
  [id, space, loadedOnce],
  async ([sid, s, loaded]) => {
    const spaceId = String(sid ?? '').trim()
    if (!spaceId || !loaded) return
    if (s) {
      await select(spaceId)
    }
  },
  { immediate: true },
)

// Load spaces on mount; redirect to list if id is invalid after load.
onMounted(async () => {
  if (!loadedOnce.value) await loadSpaces()
  await subscribeLobbyCounts()
  // Nuxt can leave the top loading bar stuck on dynamic routes (page:loading:end not fired).
  // Fire the hook and finish the indicator so the bar always clears.
  await useNuxtApp().callHook('page:loading:end')
  useLoadingIndicator().finish({ force: true })
})

onBeforeUnmount(() => {
  unsubscribeLobbyCounts()
})

// If we have an id but space not found after load, redirect to /spaces
watch(
  [id, space, loadedOnce],
  ([sid, s, loaded]) => {
    if (!import.meta.client || !loaded) return
    const spaceId = String(sid ?? '').trim()
    if (!spaceId) return
    if (!s) navigateTo('/spaces')
  },
  { immediate: true },
)

definePageMeta({
  layout: 'app',
  title: 'Spaces',
  hideTopBar: true,
  middleware: ['verified'],
})

usePageSeo({
  title: computed(() => (space.value?.name ? `${space.value.name} · Spaces` : 'Spaces')),
  description: computed(() =>
    space.value
      ? `Join ${space.value.name} — live chat and music.`
      : 'Enter spaces to chat and optionally play music.',
  ),
  canonicalPath: computed(() => (id.value ? `/spaces/${encodeURIComponent(id.value)}` : '/spaces')),
  noindex: true,
})
</script>
