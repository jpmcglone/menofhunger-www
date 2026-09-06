<template>
  <section>
    <header class="moh-gutter-x flex items-start justify-between gap-3 border-b moh-border py-5">
      <div><h1 class="moh-h2">Attention inbox</h1><p class="mt-1 moh-text-muted text-sm">The work that needs a human.</p></div>
      <Button label="Refresh" text :loading="loading" @click="refresh" />
    </header>
    <p v-if="error" role="alert" class="moh-gutter-x py-4 text-sm text-red-600">{{ error }}</p>
    <div v-if="!data && loading" class="moh-gutter-x space-y-4 py-6" aria-label="Loading inbox"><Skeleton v-for="n in 4" :key="n" height="3rem" /></div>
    <template v-if="data">
      <p v-if="!pending.length" class="moh-gutter-x py-8 moh-text-muted">You're up to date. No pending reviews or conversations needing a first reply.</p>
      <div class="moh-divide">
        <NuxtLink v-for="item in pending" :key="item.id" :to="item.path" class="moh-gutter-x flex items-center gap-4 py-4 hover:bg-black/5 dark:hover:bg-white/5">
          <span class="min-w-0 flex-1"><span class="block font-semibold">{{ item.title }}</span><span class="mt-1 block text-sm moh-text-muted">{{ item.detail }}</span></span>
          <span class="text-xl font-semibold tabular-nums">{{ item.count }}</span><Icon name="tabler:chevron-right" aria-hidden="true" />
        </NuxtLink>
      </div>
      <section v-if="data.unansweredPosts.length" id="conversations" class="border-t moh-border py-5">
        <h2 class="moh-gutter-x moh-h3">Start a conversation</h2>
        <p class="moh-gutter-x mt-1 mb-3 text-sm moh-text-muted">Oldest first · up to eight posts from the past two weeks</p>
        <div class="moh-divide"><NuxtLink v-for="post in data.unansweredPosts" :key="post.id" :to="`/p/${post.id}`" class="moh-gutter-x block py-4 hover:bg-black/5 dark:hover:bg-white/5"><span class="text-sm font-semibold">@{{ post.username || 'member' }}</span><p class="mt-1 line-clamp-3 text-sm moh-text-muted">{{ post.body || 'Open this post' }}</p></NuxtLink></div>
      </section>
      <p class="moh-gutter-x py-3 text-xs moh-text-muted">Updated {{ new Date(data.asOf).toLocaleTimeString() }} · counts update as work is resolved</p>
    </template>
  </section>
</template>
<script setup lang="ts">
import type { AdminAttentionDto } from '~/types/api'
definePageMeta({ layout: 'app', middleware: ['admin'] })
const { data, loading, error, refresh } = usePrivateApiData<AdminAttentionDto>('/admin/operations/attention')
const pending = computed(() => data.value?.items.filter(item => item.count > 0) ?? [])
</script>
