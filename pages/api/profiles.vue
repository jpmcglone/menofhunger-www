<template>
  <div class="space-y-10">
    <header class="space-y-2">
      <h1 class="text-3xl font-semibold tracking-tight text-gray-900 dark:text-gray-50">Profiles</h1>
      <p class="text-base text-gray-500 dark:text-gray-400">
        Fetch one public profile by username or user ID.
      </p>
      <ApiDocsEndpoint path="/public/users/:usernameOrId" />
    </header>

    <section class="space-y-3">
      <h2 class="text-base font-semibold text-gray-900 dark:text-gray-50">Try it</h2>
      <p class="text-sm text-gray-500 dark:text-gray-400">
        Start typing to search members, or paste a
        <code class="font-mono">menofhunger.com/u/&lt;username&gt;</code> link. Usernames are
        case-insensitive.
      </p>
      <ApiDocsTry
        label="Username or user ID"
        placeholder="Type a username"
        path-prefix="/public/users/"
        param-name=":usernameOrId"
        initial="menofhunger"
        suggest-users
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
      <h2 class="text-base font-semibold text-gray-900 dark:text-gray-50">Two special cases</h2>
      <ul class="space-y-1.5 text-sm text-gray-500 dark:text-gray-400">
        <li>
          Banned accounts return <code class="font-mono">{ "data": { "banned": true } }</code> with a 200.
        </li>
        <li>
          <code class="font-mono">lastOnlineAt</code> is always <code class="font-mono">null</code> here — presence is never exposed publicly.
        </li>
      </ul>
    </section>
  </div>
</template>

<script setup lang="ts">
import type { ApiDocsField } from '~/config/api-docs'

definePageMeta({
  layout: 'docs',
  title: 'API — Profiles',
})

usePageSeo({
  title: 'API — Profiles',
  description:
    'Fetch a public Men of Hunger profile by username or ID with a single unauthenticated GET request.',
  canonicalPath: '/api/profiles',
  ogType: 'website',
})

const sampleResponse = `{
  "data": {
    "id": "cm4x8ez4mn0000qab3g1r5t8kv",
    "username": "menofhunger",
    "name": "Men of Hunger",
    "bio": "A trusted community for men who want measurable progress.",
    "website": "https://menofhunger.com",
    "createdAt": "2025-03-02T18:44:09.201Z",
    "avatarUrl": "https://menofhunger.com/…",
    "bannerUrl": "https://menofhunger.com/…",
    "verifiedStatus": "identity",
    "premium": true,
    "isOrganization": true,
    "locationDisplay": "Roanoke, VA",
    "postCount": 318,
    "articleCount": 12,
    "checkinStreakDays": 46,
    "longestStreakDays": 91,
    "pinnedPostId": null,
    "lastOnlineAt": null
  }
}`

const fields: ApiDocsField[] = [
  { name: 'id / username', type: 'string', note: 'Either one works as the path parameter.' },
  { name: 'name / bio / website', type: 'string | null' },
  { name: 'avatarUrl / bannerUrl', type: 'string | null' },
  { name: 'verifiedStatus', type: '"none" | "identity" | "manual"' },
  { name: 'premium / premiumPlus / isOrganization', type: 'boolean' },
  { name: 'locationDisplay', type: 'string | null', note: 'Whatever the member chose to show publicly.' },
  { name: 'postCount / articleCount', type: 'number' },
  { name: 'checkinStreakDays / longestStreakDays', type: 'number' },
  { name: 'pinnedPostId', type: 'string | null', note: 'Feed it back into /public/posts/:id.' },
  { name: 'createdAt', type: 'ISO 8601 string' },
]
</script>
