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
          <NuxtLink
            v-else-if="user && mySpaceHref"
            :to="mySpaceHref"
            class="moh-tap moh-focus shrink-0 inline-flex items-center gap-1.5 rounded-full border moh-border-subtle px-4 py-2 text-sm font-semibold moh-meta moh-surface-hover transition-colors"
          >
            <Icon name="tabler:door-enter" class="text-[16px]" aria-hidden="true" />
            My space
          </NuxtLink>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="!loadedOnce" class="moh-gutter-x py-6 flex items-center gap-2 moh-meta" role="status" aria-live="polite">
        <Icon name="tabler:loader" class="text-[18px] opacity-80 animate-spin" aria-hidden="true" />
        <span>Loading spaces…</span>
      </div>
      <div v-else-if="spaces.length === 0 && !loading" class="moh-gutter-x py-4 moh-meta">
        No live or upcoming spaces right now. Be the first to create one!
      </div>

      <!-- Space rows — own → notifying → following → soonest schedule -->
      <TransitionGroup v-else name="moh-spaces-row" tag="div" class="relative border-t moh-border">
        <AppSpaceRow
          v-for="space in spaces"
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
  ssr: false,
})

usePageSeo({
  title: 'Spaces',
  description: 'Live spaces on Men of Hunger — join a watch party, listen to radio, or just hang out and chat with other men. Verified members can create and host their own space.',
  canonicalPath: '/spaces',
})

const { user } = useAuth()
const { spaces, loading, loadedOnce, loadSpaces } = useSpaces()
const { currentSpace, members, subscribeLobbyCounts, unsubscribeLobbyCounts } = useSpaceLobby()
const { getMySpace, createSpace } = useSpaceOwner()
const { addSpacesCallback, removeSpacesCallback } = usePresence()

const mySpace = useState<any>('my-space', () => null)

const mySpaceHref = computed(() => {
  const username = String(mySpace.value?.owner?.username ?? user.value?.username ?? '').trim()
  if (!username) return null
  return `/s/${encodeURIComponent(username)}`
})

async function onCreateSpace() {
  const space = await createSpace({ title: `${user.value?.username ?? 'My'}'s Space` })
  if (space) {
    mySpace.value = space
    navigateTo(`/s/${encodeURIComponent(space.owner?.username ?? '')}`)
  }
}

async function refreshSpaces() {
  await loadSpaces()
}

let lobbyRefreshTimer: ReturnType<typeof setTimeout> | null = null
const spacesCb = {
  onLobbyCounts: () => {
    // Debounce: live badges / listener counts change while this page is open.
    if (lobbyRefreshTimer) clearTimeout(lobbyRefreshTimer)
    lobbyRefreshTimer = setTimeout(() => {
      lobbyRefreshTimer = null
      void refreshSpaces()
    }, 1500)
  },
}

onMounted(async () => {
  await refreshSpaces()
  void subscribeLobbyCounts()
  addSpacesCallback(spacesCb as any)
  const s = await getMySpace()
  if (s) mySpace.value = s
})

onActivated(() => {
  void refreshSpaces()
})

onBeforeUnmount(() => {
  if (lobbyRefreshTimer) clearTimeout(lobbyRefreshTimer)
  unsubscribeLobbyCounts()
  removeSpacesCallback(spacesCb as any)
})
</script>
