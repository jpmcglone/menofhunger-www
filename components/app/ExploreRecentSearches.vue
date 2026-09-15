<template>
  <div class="px-4 sm:px-6 pb-6">
    <div class="flex items-center justify-between gap-3 mb-2">
      <h2 class="text-xl font-semibold moh-text">Recent searches</h2>
      <Button v-if="recents.length" label="Clear all" text severity="secondary" @click="clearAll" />
    </div>
    <p v-if="!recents.length && !loading" class="py-4 text-sm moh-text-muted">Your recent searches will appear here.</p>
    <div v-if="loading" class="py-4" role="status" aria-label="Loading recent searches"><Skeleton height="3rem" /></div>
    <div v-else class="moh-divide">
      <div v-for="recent in recents" :key="recent.id" class="flex items-center gap-3 min-h-12">
        <NuxtLink
v-if="recent.user || recent.group" :to="recent.user ? `/u/${encodeURIComponent(recent.user.username ?? '')}` : `/g/${encodeURIComponent(recent.group!.slug)}`"
          class="flex min-h-12 flex-1 min-w-0 items-center gap-3 moh-focus">
          <AppGroupsGroupAvatar v-if="recent.group" :name="recent.group.name" :src="recent.group.avatarImageUrl" :size="32" />
          <AppUserAvatar v-else-if="recent.user" :user="recent.user" size-class="h-8 w-8" />
          <span class="truncate">{{ recent.user?.name || recent.user?.username || recent.group?.name }}</span>
        </NuxtLink>
        <button v-else type="button" class="flex min-h-12 flex-1 min-w-0 items-center gap-3 text-left moh-focus" @click="$emit('submit', recent.query)">
          <Icon name="tabler:history" size="20" class="shrink-0 moh-text-muted" aria-hidden="true" /><span class="truncate">{{ recent.query }}</span>
        </button>
        <button type="button" class="min-h-11 px-3 text-sm font-semibold moh-focus" :aria-label="`Remove ${recent.query} from recent searches`" @click="remove(recent.id)">Remove</button>
      </div>
    </div>
    <h2 class="text-xl font-semibold moh-text mt-6 mb-3">Browse by category</h2>
    <div class="grid gap-3">
      <button
v-for="category in ['People', 'Groups', 'Posts', 'Articles']" :key="category" type="button"
        class="min-h-11 rounded-full border moh-border px-4 text-sm font-semibold moh-focus" @click="$emit('browse', category.toLowerCase())">{{ category }}</button>
    </div>
  </div>
</template>
<script setup lang="ts">
defineEmits<{ submit: [query: string]; browse: [category: string] }>()
const { recents, loading, load, remove, clearAll } = useRecentSearches()
onMounted(load)
</script>
