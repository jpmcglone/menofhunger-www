<template>
  <div class="space-y-10">
    <header class="space-y-2">
      <h1 class="text-3xl font-semibold tracking-tight text-gray-900 dark:text-gray-50">
        Errors &amp; limits
      </h1>
      <p class="text-base text-gray-500 dark:text-gray-400">
        Everything you need to handle a failed call.
      </p>
    </header>

    <section class="space-y-3">
      <h2 class="text-base font-semibold text-gray-900 dark:text-gray-50">Error shape</h2>
      <p class="text-sm text-gray-500 dark:text-gray-400">
        Failures drop <code class="font-mono">data</code> and return <code class="font-mono">meta</code> instead.
        Check for <code class="font-mono">data</code> and you're covered. Quote the
        <code class="font-mono">requestId</code> if you report a problem.
      </p>
      <ApiDocsCode :code="errorSample" />
    </section>

    <section class="space-y-3">
      <h2 class="text-base font-semibold text-gray-900 dark:text-gray-50">Status codes</h2>
      <ApiDocsFields :fields="statuses" />
    </section>

    <section class="space-y-3">
      <h2 class="text-base font-semibold text-gray-900 dark:text-gray-50">Rate limits</h2>
      <p class="text-sm text-gray-500 dark:text-gray-400">Per IP, per minute.</p>
      <ApiDocsFields :fields="limits" />
    </section>

    <section class="space-y-3">
      <h2 class="text-base font-semibold text-gray-900 dark:text-gray-50">Caching</h2>
      <p class="text-sm text-gray-500 dark:text-gray-400">
        Both endpoints send a public <code class="font-mono">Cache-Control</code> header — 60s for
        posts, 5m for profiles. Respect it and you'll rarely hit a limit.
      </p>
    </section>
  </div>
</template>

<script setup lang="ts">
import type { ApiDocsField } from '~/config/api-docs'

definePageMeta({
  layout: 'docs',
  title: 'API — Errors & limits',
})

usePageSeo({
  title: 'API — Errors & limits',
  description:
    'Error envelope, status codes, rate limits, and caching for the Men of Hunger public API.',
  canonicalPath: '/api/errors',
  ogType: 'website',
})

const errorSample = `{
  "meta": {
    "status": 404,
    "errors": [{ "code": 404, "message": "Post not found.", "reason": "Not Found" }],
    "requestId": "75380ae5-4ce8-4119-8f6e-cc1b9129f24c"
  }
}`

const statuses: ApiDocsField[] = [
  { name: '200', type: 'OK', note: 'Body is { "data": … }.' },
  { name: '404', type: 'Not found', note: 'Missing, deleted, or not public. Deliberately indistinguishable.' },
  { name: '429', type: 'Too many requests', note: 'Back off and retry.' },
  { name: '500', type: 'Server error', note: 'On us. Safe to retry.' },
]

const limits: ApiDocsField[] = [
  { name: '/public/posts/:id', type: '600 req/min' },
  { name: '/public/users/:usernameOrId', type: '300 req/min' },
]
</script>
