<template>
  <section class="mx-auto w-full max-w-2xl space-y-6">
    <header class="space-y-3">
      <div class="flex flex-wrap items-center gap-2">
        <Tag value="API" severity="info" />
        <Tag value="Health" severity="secondary" />
        <Tag :value="isUp ? 'UP' : 'DOWN'" :severity="isUp ? 'success' : 'danger'" />
      </div>

      <h1 class="text-2xl sm:text-3xl font-semibold tracking-tight text-gray-900 dark:text-gray-50">
        API Health
      </h1>

      <p class="text-sm sm:text-base text-gray-600 dark:text-gray-300">
        Checks the API via <code class="rounded bg-gray-100 px-1 py-0.5 text-xs dark:bg-zinc-900">{{ url }}</code>
      </p>
    </header>

    <Card>
      <template #title>Status</template>
      <template #content>
        <div class="space-y-4">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div class="space-y-1">
              <div class="text-sm text-gray-600 dark:text-gray-300">API Base URL</div>
              <div class="font-mono text-sm text-gray-900 dark:text-gray-50">{{ apiBaseUrl }}</div>
            </div>
            <Button
              label="Refresh"
              icon="pi pi-refresh"
              :loading="pending"
              severity="secondary"
              @click="refresh()"
            />
          </div>

          <Divider />

          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div class="rounded-lg border border-gray-200 p-3 dark:border-zinc-800">
              <div class="text-xs text-gray-500 dark:text-gray-400">Result</div>
              <div class="mt-1 flex items-center gap-2">
                <Tag :value="isUp ? 'OK' : 'ERROR'" :severity="isUp ? 'success' : 'danger'" />
                <span class="text-sm text-gray-700 dark:text-gray-300">{{ status }}</span>
              </div>
            </div>

            <div class="rounded-lg border border-gray-200 p-3 dark:border-zinc-800">
              <div class="text-xs text-gray-500 dark:text-gray-400">Last checked</div>
              <div class="mt-1 text-sm text-gray-700 dark:text-gray-300">
                {{ lastCheckedAtIso ?? '—' }}
              </div>
            </div>
          </div>

          <div v-if="error" class="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-200">
            <div class="font-semibold">Request failed</div>
            <div class="mt-1 font-mono text-xs whitespace-pre-wrap">{{ error?.message }}</div>
          </div>

          <div class="rounded-lg border border-gray-200 p-3 dark:border-zinc-800">
            <div class="text-xs text-gray-500 dark:text-gray-400">Raw response</div>
            <pre class="mt-2 text-xs whitespace-pre-wrap rounded-lg bg-gray-50 dark:bg-zinc-900 p-3 border border-gray-200 dark:border-zinc-800"><code>{{ data ? JSON.stringify(data, null, 2) : '—' }}</code></pre>
          </div>
        </div>
      </template>
    </Card>
  </section>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'app',
  title: 'API Health'
})

usePageSeo({
  title: 'API Health',
  description: 'Checks reachability of the Men of Hunger API.',
  noindex: true
})

const { apiBaseUrl, url, data, pending, error, status, isUp, lastCheckedAtIso, refresh } = useApiHealth()
</script>

