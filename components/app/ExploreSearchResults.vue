<template>
  <div :aria-busy="loading || loadingMore">
    <div v-if="error" class="px-4 py-6 space-y-3" role="alert">
      <AppInlineAlert severity="danger">{{ error }}</AppInlineAlert>
      <Button label="Try again" severity="secondary" rounded @click="$emit('retry')" />
    </div>
    <div v-if="loading && !total" class="px-4 py-6 space-y-6" role="status" aria-label="Searching">
      <div v-for="n in 3" :key="n" class="flex gap-3" aria-hidden="true">
        <Skeleton shape="circle" size="2.5rem" />
        <div class="flex-1 space-y-2"><Skeleton width="45%" /><Skeleton width="75%" /></div>
      </div>
    </div>
    <template v-else>
      <div v-if="category === 'all' && topics.length" class="flex flex-wrap gap-2 px-4 pb-4">
        <NuxtLink
v-for="topic in topics" :key="topic.slug" :to="`/topics/${encodeURIComponent(topic.slug)}`"
          class="inline-flex min-h-11 items-center rounded-full border moh-border px-4 text-sm moh-focus">{{ topic.label }}</NuxtLink>
      </div>
      <section v-for="section in visibleSections" :key="section.key" class="mb-5">
        <div class="px-4 py-3 flex items-center justify-between gap-3">
          <h2 class="text-xl font-semibold moh-text">{{ section.label }}</h2>
          <button v-if="category === 'all'" type="button" class="min-h-11 px-2 text-sm font-semibold moh-focus" @click="$emit('category', section.key)">See all</button>
        </div>
        <div v-if="section.key === 'people'" class="moh-divide">
          <AppUserRow v-for="user in users" :key="user.id" :user="user" show-follow-button discovery />
        </div>
        <div v-else-if="section.key === 'groups'" class="px-4 grid gap-3">
          <AppGroupPreviewCard
v-for="group in groups" :key="group.id" :preview="shellToGroupPreview(group)"
            compact :show-join="isAuthed" :join-busy="joiningId === group.id" @join="$emit('join', group)" />
        </div>
        <div v-else-if="section.key === 'articles'" class="moh-divide">
          <AppArticleListCard v-for="article in articles" :key="article.id" :article="article" />
        </div>
        <div v-else>
          <AppFeedPostRow
v-for="post in posts" :key="post.id" :post="post" collapse-ancestors
            @deleted="$emit('deleted', $event)" @edited="$emit('edited', $event)" />
        </div>
      </section>
      <div v-if="searched && !loading && !visibleSections.length && !error" class="px-6 py-10 text-center space-y-3" role="status">
        <Icon name="tabler:search" size="28" class="moh-text-muted" aria-hidden="true" />
        <h2 class="text-xl font-semibold moh-text">No {{ category === 'all' ? 'results' : category }} found</h2>
        <p class="text-[15px] moh-text-muted">Nothing matches “{{ query }}”. Try a different name or keyword.</p>
        <Button label="Clear search" severity="secondary" rounded @click="$emit('clear')" />
        <Button v-if="category !== 'all' && total > 0" label="See all results" text @click="$emit('category', 'all')" />
      </div>
      <div v-if="gatedCount > 0 && !isVerifiedMember && !loading" class="px-6 py-5 space-y-3">
        <h2 class="font-semibold moh-text">More conversations for verified members</h2>
        <p class="text-sm moh-text-muted">{{ gatedCount }} more result{{ gatedCount === 1 ? '' : 's' }} are available after verification.</p>
        <NuxtLink to="/tiers" class="inline-flex min-h-11 items-center rounded-full bg-[var(--moh-verified)] px-5 font-semibold text-white moh-focus">Get verified</NuxtLink>
      </div>
      <div v-if="hasMore || loadingMore" class="flex justify-center px-4 py-4">
        <Button label="Load more" severity="secondary" rounded :loading="loadingMore" :disabled="loadingMore || loading" @click="$emit('more')" />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import AppGroupPreviewCard from '~/components/app/groups/AppGroupPreviewCard.vue'
import { shellToGroupPreview } from '~/utils/community-group-preview'
import type { Article, CommunityGroupShell, FeedPost, SearchUserResult, TaxonomyMatch } from '~/types/api'

const props = defineProps<{
  users: SearchUserResult[]; groups: CommunityGroupShell[]; posts: FeedPost[]; articles: Article[]
  category: string; query: string; loading: boolean; loadingMore: boolean; error: string | null
  searched: boolean; hasMore: boolean; gatedCount: number; joiningId: string | null; topics: TaxonomyMatch[]
}>()
defineEmits<{
  category: [value: string]; retry: []; more: []; clear: []; join: [group: CommunityGroupShell]
  deleted: [id: string]; edited: [payload: { id: string; post: FeedPost }]
}>()
const { isAuthed, isVerifiedMember } = useAuth()
const total = computed(() => props.users.length + props.groups.length + props.posts.length + props.articles.length)
const visibleSections = computed(() => [
  { key: 'people', label: 'People', count: props.users.length },
  { key: 'groups', label: 'Groups', count: props.groups.length },
  { key: 'posts', label: 'Posts', count: props.posts.length },
  { key: 'articles', label: 'Articles', count: props.articles.length },
].filter(section => section.count > 0 && (props.category === 'all' || section.key === props.category)))
</script>
