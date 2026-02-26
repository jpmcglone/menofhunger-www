<template>
  <AppPageContent bottom="standard">
    <div class="w-full pb-6">

      <!-- Header -->
      <div class="moh-gutter-x pt-4 pb-3">
        <h1 class="moh-h1">Spaces</h1>
        <p class="mt-1 moh-meta">Enter a space, chat, and optionally play music while you build.</p>
      </div>

      <!-- Loading -->
      <div v-if="!loadedOnce" class="moh-gutter-x py-6 flex items-center gap-2 moh-meta" role="status" aria-live="polite">
        <Icon name="tabler:loader" class="text-[18px] opacity-80 animate-spin" aria-hidden="true" />
        <span>Loading spaces…</span>
      </div>
      <div v-else-if="spaces.length === 0 && !loading" class="moh-gutter-x py-4 moh-meta">
        No spaces available.
      </div>

      <!-- Space rows — edge to edge -->
      <TransitionGroup v-else tag="div" class="border-t moh-border" move-class="transition-transform duration-500 ease-in-out">
        <AppSpaceRow
          v-for="space in sortedSpaces"
          :key="space.id"
          :space="space"
        />
      </TransitionGroup>

      <!-- Empty state / member footer -->
      <div v-if="loadedOnce" class="moh-gutter-x pt-4">
        <p v-if="!currentSpace" class="moh-meta">
          Pick a space to see who's here. Share a space link to bring others in.
        </p>
        <p v-else-if="members.length === 0" class="moh-meta">
          You're the first in {{ currentSpace.name }} — share the link to invite others.
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
  description: 'Enter spaces to chat and optionally play music.',
  canonicalPath: '/spaces',
  noindex: true,
})

const { spaces, loading, loadedOnce, loadSpaces } = useSpaces()
const { currentSpace, members, lobbyCountForSpace, subscribeLobbyCounts, unsubscribeLobbyCounts } = useSpaceLobby()
const sortedSpaces = computed(() =>
  [...(spaces.value ?? [])].sort((a, b) => lobbyCountForSpace(b.id) - lobbyCountForSpace(a.id))
)

onMounted(() => {
  if (!loadedOnce.value) void loadSpaces()
  void subscribeLobbyCounts()
})

onBeforeUnmount(() => {
  unsubscribeLobbyCounts()
})
</script>

