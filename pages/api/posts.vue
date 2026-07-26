<template>
  <div class="space-y-10">
    <header class="space-y-2">
      <h1 class="text-3xl font-semibold tracking-tight text-gray-900 dark:text-gray-50">Posts</h1>
      <p class="text-base text-gray-500 dark:text-gray-400">Fetch one public post by ID.</p>
      <ApiDocsEndpoint path="/public/posts/:id" />
    </header>

    <section class="space-y-3">
      <h2 class="text-base font-semibold text-gray-900 dark:text-gray-50">Try it</h2>
      <p class="text-sm text-gray-500 dark:text-gray-400">
        Every post link looks like <code class="font-mono">menofhunger.com/p/&lt;id&gt;</code>. Paste the whole link or just the ID.
      </p>
      <ApiDocsTry
        label="Post ID"
        placeholder="Post ID or menofhunger.com/p/… link"
        path-prefix="/public/posts/"
        param-name=":id"
        :initial="latestPostId"
      />
    </section>

    <section class="space-y-3">
      <h2 class="text-base font-semibold text-gray-900 dark:text-gray-50">Response</h2>
      <p class="text-sm text-gray-500 dark:text-gray-400">Trimmed for readability.</p>
      <ApiDocsCode :code="sampleResponse" />
    </section>

    <section class="space-y-3">
      <h2 class="text-base font-semibold text-gray-900 dark:text-gray-50">Fields</h2>
      <ApiDocsFields :fields="fields" />
    </section>

    <section class="space-y-3">
      <h2 class="text-base font-semibold text-gray-900 dark:text-gray-50">404s</h2>
      <p class="text-sm text-gray-500 dark:text-gray-400">
        Drafts, deleted posts, group posts, and anything not set to
        <code class="font-mono">public</code> visibility all return 404 — the same as an ID that
        never existed.
      </p>
    </section>
  </div>
</template>

<script setup lang="ts">
import type { ApiDocsField } from '~/config/api-docs'

definePageMeta({
  layout: 'docs',
  title: 'API — Posts',
})

usePageSeo({
  title: 'API — Posts',
  description: 'Fetch a public Men of Hunger post by ID with a single unauthenticated GET request.',
  canonicalPath: '/api/posts',
  ogType: 'website',
})

const latestPostId = ref('')
const { apiFetchData } = useApiClient()

onMounted(async () => {
  try {
    const post = await apiFetchData<{ id: string }>('/public/posts/latest', { credentials: 'omit' })
    latestPostId.value = post.id
  } catch {
    // no default — user can paste any ID
  }
})

const sampleResponse = `{
  "data": {
    "id": "cm4x8f2p1k0001qab3d7yh2m9z",
    "createdAt": "2026-07-14T13:02:41.518Z",
    "editedAt": null,
    "body": "Discipline is remembering what you want.",
    "kind": "regular",
    "visibility": "public",
    "topics": ["discipline"],
    "hashtags": [],
    "cashtags": [],
    "boostCount": 42,
    "commentCount": 7,
    "repostCount": 3,
    "bookmarkCount": 11,
    "viewerCount": 1280,
    "parentId": null,
    "media": [],
    "poll": null,
    "author": {
      "id": "cm4x8ez4mn0000qab3g1r5t8kv",
      "username": "menofhunger",
      "name": "Men of Hunger",
      "avatarUrl": "https://menofhunger.com/…",
      "verifiedStatus": "identity",
      "premium": true
    }
  }
}`

const fields: ApiDocsField[] = [
  { name: 'id', type: 'string' },
  { name: 'body', type: 'string', note: 'Plain text. Mentions, #hashtags, and $cashtags stay inline.' },
  { name: 'createdAt / editedAt', type: 'ISO 8601 string' },
  { name: 'kind', type: '"regular" | "checkin" | "repost" | "articleShare"' },
  { name: 'author', type: 'object', note: 'id, username, name, avatarUrl, verifiedStatus, premium.' },
  { name: 'media', type: 'array', note: 'Each has url, kind ("image" | "gif" | "video"), width, height, alt.' },
  { name: 'topics / hashtags / cashtags', type: 'string[]' },
  { name: 'boostCount, commentCount, repostCount, bookmarkCount, viewerCount', type: 'number' },
  { name: 'parentId', type: 'string | null', note: 'Set when the post is a reply.' },
  { name: 'poll', type: 'object | null', note: 'Options with voteCount and percent, plus endsAt.' },
  { name: 'viewer*', type: 'false | []', note: 'Present but always empty — there is no viewer on a public call.' },
]
</script>
