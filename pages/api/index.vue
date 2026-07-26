<template>
  <div class="space-y-10">
    <header class="space-y-2">
      <h1 class="text-3xl font-semibold tracking-tight text-gray-900 dark:text-gray-50">
        Men of Hunger API
      </h1>
      <p class="text-base text-gray-500 dark:text-gray-400">
        Read public posts and profiles. No key, no signup — just GET.
      </p>
    </header>

    <section class="space-y-3">
      <h2 class="text-base font-semibold text-gray-900 dark:text-gray-50">Base URL</h2>
      <ApiDocsCode :code="apiBaseUrl" />
    </section>

    <section class="space-y-3">
      <h2 class="text-base font-semibold text-gray-900 dark:text-gray-50">Try it</h2>
      <ApiDocsCode :code="curlExample" />
      <p class="text-sm text-gray-500 dark:text-gray-400">
        Swap in any member — start typing to search.
      </p>
      <ApiDocsTry
        label="Username"
        placeholder="Type a username"
        path-prefix="/public/users/"
        param-name=":usernameOrId"
        initial="menofhunger"
        suggest-users
      />
    </section>

    <section class="space-y-3">
      <h2 class="text-base font-semibold text-gray-900 dark:text-gray-50">Endpoints</h2>
      <div class="divide-y moh-border-subtle overflow-hidden rounded-lg border moh-border">
        <NuxtLink
          v-for="endpoint in endpoints"
          :key="endpoint.to"
          :to="endpoint.to"
          class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-4 py-3 transition-colors hover:bg-gray-50 dark:hover:bg-zinc-900"
        >
          <span class="font-mono text-sm font-medium text-gray-900 dark:text-gray-50">{{ endpoint.path }}</span>
          <span class="text-sm text-gray-500 dark:text-gray-400">{{ endpoint.summary }}</span>
        </NuxtLink>
      </div>
    </section>

    <section class="space-y-3">
      <h2 class="text-base font-semibold text-gray-900 dark:text-gray-50">Every response</h2>
      <ApiDocsCode code='{ "data": … }' />
      <p class="text-sm text-gray-500 dark:text-gray-400">
        Errors replace <code class="font-mono">data</code> with <code class="font-mono">meta</code>.
        See <NuxtLink to="/api/errors" class="font-medium text-gray-900 underline underline-offset-2 dark:text-gray-50">errors &amp; limits</NuxtLink>.
      </p>
    </section>

    <section class="space-y-3">
      <h2 class="text-base font-semibold text-gray-900 dark:text-gray-50">Good to know</h2>
      <ul class="space-y-1.5 text-sm text-gray-500 dark:text-gray-400">
        <li>CORS is open, so you can call these straight from a browser.</li>
        <li>Only public, non-group posts are served. Anything else returns 404.</li>
        <li>Responses are cacheable — 60s for posts, 5m for profiles.</li>
        <li>Anything beyond this page needs an account and isn't public yet.</li>
      </ul>
    </section>
  </div>
</template>

<script setup lang="ts">
import { useApiDocsUrl } from '~/config/api-docs'

definePageMeta({
  layout: 'docs',
  title: 'API',
})

usePageSeo({
  title: 'API',
  description:
    'The Men of Hunger public API. Read public posts and profiles with a plain GET — no key, no signup.',
  canonicalPath: '/api',
  ogType: 'website',
})

const { apiBaseUrl, url } = useApiDocsUrl()
const curlExample = computed(() => `curl ${url('/public/users/menofhunger')}`)

const endpoints = [
  { to: '/api/posts', path: '/public/posts/:id', summary: 'One post' },
  { to: '/api/profiles', path: '/public/users/:usernameOrId', summary: 'One profile' },
]
</script>
