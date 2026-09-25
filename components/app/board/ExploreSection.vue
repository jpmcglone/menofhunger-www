<template>
  <section v-if="threads.length" class="space-y-2">
    <div class="px-4 flex items-center justify-between gap-3">
      <h2 class="text-sm font-semibold text-gray-900 dark:text-gray-50">On the Board</h2>
      <NuxtLink to="/b" class="text-sm font-medium hover:underline underline-offset-2 text-[var(--p-primary-color)] moh-focus">See all</NuxtLink>
    </div>
    <div class="moh-divide">
      <AppBoardThreadRow v-for="t in threads" :key="t.id" :thread="t" />
    </div>
  </section>
</template>

<script setup lang="ts">
import type { BoardThread } from '~/types/api'

const api = useBoardApi()
const threads = ref<BoardThread[]>([])

onMounted(async () => {
  try {
    threads.value = (await api.listThreads({ sort: 'top', limit: 5 })).threads
  } catch {
    threads.value = []
  }
})
</script>
