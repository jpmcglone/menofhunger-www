<template>
  <AppPageContent bottom="standard">
  <div class="space-y-6">
    <div class="px-4 pt-4">
      <AppPageHeader title="Admin" icon="tabler:shield" description="Admin-only tools." />
    </div>

    <div class="px-4">
      <div class="rounded-xl border moh-border moh-bg p-4 space-y-3">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div class="min-w-0">
            <div class="text-sm font-semibold moh-text">Hashtag backfill</div>
            <div class="text-xs moh-text-muted">
              Rebuilds `Post.hashtags` and hashtag counts from existing post bodies.
            </div>
          </div>
          <div class="flex items-center gap-2">
            <AppFormField label="Batch size" class="min-w-[10rem]">
              <InputNumber v-model="batchSize" :min="10" :max="5000" showButtons inputClass="w-full" />
            </AppFormField>
          </div>
        </div>

        <div v-if="backfillError" class="text-xs text-red-700 dark:text-red-300">
          {{ backfillError }}
        </div>

        <div v-if="backfillStatus" class="grid grid-cols-2 gap-3 text-xs">
          <div class="rounded-lg border moh-border p-3">
            <div class="moh-text-muted">Status</div>
            <div class="mt-1 font-semibold moh-text">{{ backfillStatus.status }}</div>
          </div>
          <div class="rounded-lg border moh-border p-3">
            <div class="moh-text-muted">Processed posts</div>
            <div class="mt-1 font-semibold moh-text">{{ backfillStatus.processedPosts }}</div>
          </div>
          <div class="rounded-lg border moh-border p-3">
            <div class="moh-text-muted">Updated posts</div>
            <div class="mt-1 font-semibold moh-text">{{ backfillStatus.updatedPosts }}</div>
          </div>
          <div class="rounded-lg border moh-border p-3">
            <div class="moh-text-muted">Cursor</div>
            <div class="mt-1 font-mono moh-text truncate">{{ backfillStatus.cursor || '—' }}</div>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <Button
            label="Refresh"
            severity="secondary"
            :loading="backfillLoading"
            :disabled="backfillLoading"
            @click="refreshBackfillStatus"
          />
          <Button
            label="Start backfill (reset + rebuild)"
            :loading="backfillRunning"
            :disabled="backfillRunning"
            @click="startBackfill"
          >
            <template #icon>
              <Icon name="tabler:player-play" aria-hidden="true" />
            </template>
          </Button>
          <NuxtLink to="/admin/hashtags" class="text-sm font-medium hover:underline underline-offset-2">
            Advanced…
          </NuxtLink>
        </div>

        <p class="text-xs moh-text-muted">
          Note: “Start backfill” resets hashtag counts and rebuilds from posts. Prefer running this when load is low.
        </p>
      </div>
    </div>

    <div class="divide-y divide-gray-200 dark:divide-zinc-800 pb-4">
      <NuxtLink to="/admin/site-settings" class="block px-4 py-3 transition-colors hover:bg-gray-50 dark:hover:bg-zinc-900">
        <div class="flex items-center gap-3">
          <Icon name="tabler:settings" class="text-lg" aria-hidden="true" />
          <div class="min-w-0 flex-1">
            <div class="font-semibold truncate">Site settings</div>
            <div class="text-sm text-gray-600 dark:text-gray-300 truncate">Configure post rate limits</div>
          </div>
          <Icon name="tabler:chevron-right" class="text-gray-400" aria-hidden="true" />
        </div>
      </NuxtLink>

      <NuxtLink to="/admin/users" class="block px-4 py-3 transition-colors hover:bg-gray-50 dark:hover:bg-zinc-900">
        <div class="flex items-center gap-3">
          <Icon name="tabler:users" class="text-lg" aria-hidden="true" />
          <div class="min-w-0 flex-1">
            <div class="font-semibold truncate">Users</div>
            <div class="text-sm text-gray-600 dark:text-gray-300 truncate">Search and edit users</div>
          </div>
          <Icon name="tabler:chevron-right" class="text-gray-400" aria-hidden="true" />
        </div>
      </NuxtLink>

      <NuxtLink to="/admin/verification" class="block px-4 py-3 transition-colors hover:bg-gray-50 dark:hover:bg-zinc-900">
        <div class="flex items-center gap-3">
          <Icon name="tabler:rosette-discount-check" class="text-lg" aria-hidden="true" />
          <div class="min-w-0 flex-1">
            <div class="font-semibold truncate">Verification</div>
            <div class="text-sm text-gray-600 dark:text-gray-300 truncate">Review pending verification requests</div>
          </div>
          <Icon name="tabler:chevron-right" class="text-gray-400" aria-hidden="true" />
        </div>
      </NuxtLink>

      <NuxtLink to="/admin/media-review" class="block px-4 py-3 transition-colors hover:bg-gray-50 dark:hover:bg-zinc-900">
        <div class="flex items-center gap-3">
          <Icon name="tabler:photo" class="text-lg" aria-hidden="true" />
          <div class="min-w-0 flex-1">
            <div class="font-semibold truncate">Media review</div>
            <div class="text-sm text-gray-600 dark:text-gray-300 truncate">Review and delete uploaded images and videos</div>
          </div>
          <Icon name="tabler:chevron-right" class="text-gray-400" aria-hidden="true" />
        </div>
      </NuxtLink>

      <NuxtLink to="/admin/feedback" class="block px-4 py-3 transition-colors hover:bg-gray-50 dark:hover:bg-zinc-900">
        <div class="flex items-center gap-3">
          <Icon name="tabler:inbox" class="text-lg" aria-hidden="true" />
          <div class="min-w-0 flex-1">
            <div class="font-semibold truncate">Feedback</div>
            <div class="text-sm text-gray-600 dark:text-gray-300 truncate">Triaged feedback from users</div>
          </div>
          <Icon name="tabler:chevron-right" class="text-gray-400" aria-hidden="true" />
        </div>
      </NuxtLink>

      <NuxtLink to="/admin/reports" class="block px-4 py-3 transition-colors hover:bg-gray-50 dark:hover:bg-zinc-900">
        <div class="flex items-center gap-3">
          <Icon name="tabler:flag" class="text-lg" aria-hidden="true" />
          <div class="min-w-0 flex-1">
            <div class="font-semibold truncate">Reports</div>
            <div class="text-sm text-gray-600 dark:text-gray-300 truncate">Review reported posts and users</div>
          </div>
          <Icon name="tabler:chevron-right" class="text-gray-400" aria-hidden="true" />
        </div>
      </NuxtLink>

      <NuxtLink to="/admin/search" class="block px-4 py-3 transition-colors hover:bg-gray-50 dark:hover:bg-zinc-900">
        <div class="flex items-center gap-3">
          <Icon name="tabler:search" class="text-lg" aria-hidden="true" />
          <div class="min-w-0 flex-1">
            <div class="font-semibold truncate">Search</div>
            <div class="text-sm text-gray-600 dark:text-gray-300 truncate">Recent user searches</div>
          </div>
          <Icon name="tabler:chevron-right" class="text-gray-400" aria-hidden="true" />
        </div>
      </NuxtLink>

      <NuxtLink to="/admin/hashtags" class="block px-4 py-3 transition-colors hover:bg-gray-50 dark:hover:bg-zinc-900">
        <div class="flex items-center gap-3">
          <Icon name="tabler:hash" class="text-lg" aria-hidden="true" />
          <div class="min-w-0 flex-1">
            <div class="font-semibold truncate">Hashtags</div>
            <div class="text-sm text-gray-600 dark:text-gray-300 truncate">Backfill and rebuild hashtag indexes</div>
          </div>
          <Icon name="tabler:chevron-right" class="text-gray-400" aria-hidden="true" />
        </div>
      </NuxtLink>
    </div>
  </div>
  </AppPageContent>
</template>

<script setup lang="ts">
import { getApiErrorMessage } from '~/utils/api-error'

definePageMeta({
  layout: 'app',
  title: 'Admin',
  middleware: 'admin',
})

usePageSeo({
  title: 'Admin',
  description: 'Admin tools for Men of Hunger.',
  canonicalPath: '/admin',
  noindex: true,
})

type BackfillStatus = {
  id: string
  status: string
  cursor: string | null
  processedPosts: number
  updatedPosts: number
  resetDone: boolean
  startedAt: string
  finishedAt: string | null
  lastError: string | null
  updatedAt: string
}

const { apiFetch, apiFetchData } = useApiClient()

const batchSize = ref(500)
const backfillStatus = ref<BackfillStatus | null>(null)
const backfillLoading = ref(false)
const backfillRunning = ref(false)
const backfillError = ref<string | null>(null)

async function refreshBackfillStatus() {
  backfillLoading.value = true
  backfillError.value = null
  try {
    const res = await apiFetch<{ id: string } | null>('/admin/hashtags/backfill', { method: 'GET' })
    backfillStatus.value = (res.data ?? null) as any
  } catch (e: unknown) {
    backfillError.value = getApiErrorMessage(e) || 'Failed to load hashtag backfill status.'
  } finally {
    backfillLoading.value = false
  }
}

async function startBackfill() {
  backfillRunning.value = true
  backfillError.value = null
  try {
    await apiFetchData('/admin/hashtags/backfill', {
      method: 'POST',
      body: { batchSize: batchSize.value, reset: true },
    })
    await refreshBackfillStatus()
  } catch (e: unknown) {
    backfillError.value = getApiErrorMessage(e) || 'Hashtag backfill failed.'
  } finally {
    backfillRunning.value = false
  }
}

onMounted(() => {
  void refreshBackfillStatus()
})
</script>

