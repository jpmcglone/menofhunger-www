<template>
  <AppPageContent bottom="standard">
    <div class="w-full pb-6">

      <!-- Header -->
      <div class="moh-gutter-x pt-4 pb-3">
        <div class="flex items-start justify-between gap-3">
          <div>
            <h1 class="moh-h1">Spaces</h1>
            <p class="mt-1 moh-meta">Join a space to chat and hang out. Create your own to host.</p>
          </div>
          <button
            v-if="user && !mySpace"
            type="button"
            class="moh-tap moh-focus shrink-0 inline-flex items-center gap-1.5 rounded-full bg-[var(--p-primary-color)] text-white px-4 py-2 text-sm font-semibold transition-opacity hover:opacity-90"
            @click="onCreateSpace"
          >
            <Icon name="tabler:plus" class="text-[16px]" aria-hidden="true" />
            Create Space
          </button>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="!loadedOnce" class="moh-gutter-x py-6 flex items-center gap-2 moh-meta" role="status" aria-live="polite">
        <Icon name="tabler:loader" class="text-[18px] opacity-80 animate-spin" aria-hidden="true" />
        <span>Loading spaces…</span>
      </div>
      <div v-else-if="spaces.length === 0 && !loading" class="moh-gutter-x py-4 moh-meta">
        No active spaces right now. Be the first to create one!
      </div>

      <!-- Space rows -->
      <TransitionGroup v-else tag="div" class="border-t moh-border" move-class="transition-transform duration-500 ease-in-out">
        <AppSpaceRow
          v-for="space in sortedSpaces"
          :key="space.id"
          :space="space"
        />
      </TransitionGroup>

      <div v-if="loadedOnce" class="moh-gutter-x pt-4">
        <p v-if="!currentSpace" class="moh-meta">
          Pick a space to see who's here. Share a space link to bring others in.
        </p>
        <p v-else-if="members.length === 0" class="moh-meta">
          You're the first in {{ currentSpace.title }} — share the link to invite others.
        </p>
      </div>
    </div>
  </AppPageContent>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'app',
  title: 'Spaces',
  hideTopBar: true,
  middleware: ['verified'],
})

usePageSeo({
  title: 'Spaces',
  description: 'Join spaces to chat, watch videos, and listen to music together.',
  canonicalPath: '/spaces',
  noindex: true,
})

const { user } = useAuth()
const { spaces, loading, loadedOnce, loadSpaces } = useSpaces()
const { currentSpace, members, lobbyCountForSpace, subscribeLobbyCounts, unsubscribeLobbyCounts } = useSpaceLobby()
const { getMySpace, createSpace } = useSpaceOwner()

const mySpace = useState<any>('my-space', () => null)

const sortedSpaces = computed(() =>
  [...(spaces.value ?? [])].sort((a, b) => (b.listenerCount ?? 0) - (a.listenerCount ?? 0))
)

async function onCreateSpace() {
  const space = await createSpace({ title: `${user.value?.username ?? 'My'}'s Space` })
  if (space) {
    navigateTo(`/s/${encodeURIComponent(space.owner?.username ?? '')}`)
  }
}

onMounted(async () => {
  if (!loadedOnce.value) void loadSpaces()
  void subscribeLobbyCounts()
  const s = await getMySpace()
  if (s) mySpace.value = s
})

onBeforeUnmount(() => {
  unsubscribeLobbyCounts()
})
</script>
