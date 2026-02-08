<template>
  <AppPageContent bottom="standard">
  <div class="px-4 py-4 space-y-6">
    <AppPageHeader title="Site settings" icon="pi-cog" description="Admin-only configuration for the site.">
      <template #leading>
        <Button
          class="md:hidden"
          text
          severity="secondary"
          icon="pi pi-chevron-left"
          aria-label="Back"
          @click="navigateTo('/admin')"
        />
      </template>
    </AppPageHeader>

    <div class="space-y-2">
      <div class="text-sm font-semibold text-gray-900 dark:text-gray-50">Post rate limits</div>
      <div class="text-sm text-gray-600 dark:text-gray-300">
        Configure how frequently users can post.
      </div>
    </div>

    <div v-if="siteError" class="text-sm text-red-700 dark:text-red-300">
      {{ siteError }}
    </div>

    <div v-else class="grid gap-4 sm:grid-cols-2">
      <div class="space-y-2">
        <label class="text-sm font-medium text-gray-700 dark:text-gray-200">Posts</label>
        <InputNumber v-model="sitePostsPerWindow" :min="1" :max="100" class="w-full" />
        <div class="text-xs text-gray-500 dark:text-gray-400">Max posts in the window.</div>
      </div>

      <div class="space-y-2">
        <label class="text-sm font-medium text-gray-700 dark:text-gray-200">Window (minutes)</label>
        <InputNumber v-model="siteWindowMinutes" :min="1" :max="1440" class="w-full" />
        <div class="text-xs text-gray-500 dark:text-gray-400">Rolling window size.</div>
      </div>
    </div>

    <div class="flex items-center gap-3">
      <Button
        label="Save"
        icon="pi pi-check"
        severity="secondary"
        :loading="siteSaving"
        :disabled="siteSaving"
        @click="saveSiteConfig"
      />
      <div v-if="siteSaved" class="text-sm text-green-700 dark:text-green-300">Saved.</div>
    </div>
  </div>
  </AppPageContent>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'app',
  title: 'Site settings',
  middleware: 'admin',
})

usePageSeo({
  title: 'Site settings',
  description: 'Admin site settings.',
  canonicalPath: '/admin/site-settings',
  noindex: true,
})

type SiteConfig = {
  id: number
  postsPerWindow: number
  windowSeconds: number
}

const { apiFetchData } = useApiClient()
import { getApiErrorMessage } from '~/utils/api-error'

const siteCfg = ref<SiteConfig | null>(null)
const siteSaving = ref(false)
const siteSaved = ref(false)
const siteError = ref<string | null>(null)
const sitePostsPerWindow = ref<number>(5)
const siteWindowMinutes = ref<number>(5)

async function loadSiteConfig() {
  if (siteCfg.value) return
  siteError.value = null
  try {
    const cfg = await apiFetchData<SiteConfig>('/admin/site-config', { method: 'GET' })
    siteCfg.value = cfg
    sitePostsPerWindow.value = cfg.postsPerWindow ?? 5
    siteWindowMinutes.value = Math.max(1, Math.round((cfg.windowSeconds ?? 300) / 60))
  } catch (e: unknown) {
    siteError.value = getApiErrorMessage(e) || 'Failed to load site settings.'
  }
}

watchEffect(() => {
  if (!import.meta.client) return
  void loadSiteConfig()
})

async function saveSiteConfig() {
  siteSaved.value = false
  siteError.value = null
  siteSaving.value = true
  try {
    const updated = await apiFetchData<SiteConfig>('/admin/site-config', {
      method: 'PATCH',
      body: {
        postsPerWindow: sitePostsPerWindow.value,
        windowSeconds: Math.max(10, Math.round(siteWindowMinutes.value * 60)),
      },
    })
    siteCfg.value = updated
    siteSaved.value = true
  } catch (e: unknown) {
    siteError.value = getApiErrorMessage(e) || 'Failed to save site settings.'
  } finally {
    siteSaving.value = false
  }
}
</script>

