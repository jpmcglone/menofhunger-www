<template>
  <AppPageContent bottom="standard">
    <AppPageHeader
      sticky
      class="px-4 pt-4 pb-3"
      title="Analytics"
      
      description="Growth, engagement, and money first."
    >
      <template #leading>
        <AppAdminKitMobileBack />
      </template>
      <template #trailing>
        <Button
          text
          severity="secondary"
          :loading="loading"
          aria-label="Refresh"
          @click="load"
        >
          <template #icon>
            <Icon name="tabler:refresh" aria-hidden="true" />
          </template>
        </Button>
      </template>
    </AppPageHeader>

    <div class="py-4 space-y-10">
      <!-- Range selector -->
      <div class="px-4 flex flex-wrap items-center justify-between gap-3">
        <div class="inline-flex rounded-lg border moh-border overflow-hidden text-sm">
          <button
            v-for="opt in rangeOptions"
            :key="opt.value"
            class="px-3 py-1.5 font-medium transition-colors"
            :class="selectedRange === opt.value
              ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-zinc-800'"
            @click="setRange(opt.value)"
          >
            {{ opt.label }}
          </button>
        </div>
        <Button
          label="Ask Marv"
          severity="secondary"
          rounded
          :loading="briefLoading"
          :disabled="!data || briefLoading"
          aria-label="Ask Marv how the platform is doing"
          @click="askMarv"
        >
          <template #icon>
            <AppMarvMark :size="16" tone="inherit" />
          </template>
        </Button>
      </div>

      <div v-if="briefLoading || brief || briefError" class="px-4">
        <div class="rounded-xl border moh-border p-4 space-y-3">
          <div class="flex items-center gap-2">
            <AppMarvMark :size="18" :tone="brief ? 'active' : 'muted'" />
            <div class="text-sm font-semibold">How we're doing</div>
          </div>
          <div v-if="briefLoading" class="space-y-2" aria-live="polite">
            <p class="text-sm text-gray-500 dark:text-gray-400">Reading the numbers…</p>
            <AppSkeletonBar class="h-3 w-5/6" />
            <AppSkeletonBar class="h-3 w-full" />
            <AppSkeletonBar class="h-3 w-2/3" />
          </div>
          <p v-else-if="briefError" class="text-sm text-rose-700 dark:text-rose-300">{{ briefError }}</p>
          <p v-else class="whitespace-pre-line text-sm leading-relaxed text-gray-800 dark:text-gray-100">{{ brief }}</p>
        </div>
      </div>

      <AppInlineAlert v-if="error" severity="danger" :message="error" class="mx-4" />

      <div v-if="loading && !data" class="px-4 text-sm text-gray-500 dark:text-gray-400">Loading…</div>

      <template v-if="data">
        <AppAdminAnalyticsOverview :data="data" />

        <AppAdminAnalyticsEngagement :data="data" />

        <AppAdminAnalyticsMonetization :data="data" />

        <AppAdminAnalyticsContent :data="data" />

        <AppAdminAnalyticsGroups :data="data" />

        <AppAdminAnalyticsChannels :data="data" />

        <AppAdminAnalyticsSpaces :data="data" />

        <AppAdminAnalyticsCoins :data="data" />

        <AppAdminAnalyticsMarv :data="data" />

        <AppAdminAnalyticsHomepage :data="data" />

        <div class="px-4 text-xs text-gray-400 dark:text-gray-500">
          Last updated {{ asOfDisplay }}
        </div>
      </template>
    </div>
  </AppPageContent>
</template>

<script setup lang="ts">
import { useAdminAnalyticsPage } from '~/composables/pages/admin/useAdminAnalyticsPage'

definePageMeta({ middleware: 'admin', layout: 'app' })

const {
  data,
  loading,
  error,
  brief,
  briefLoading,
  briefError,
  rangeOptions,
  selectedRange,
  setRange,
  askMarv,
  load,
  asOfDisplay,
} = useAdminAnalyticsPage()
</script>
