<template>
  <AppPageContent bottom="standard">
    <AppPageHeader
      sticky
      class="px-4 pt-4 pb-3"
      title="Service status"
      description="Which connected services are set up, reachable, or missing. Setting names only, never values."
    >
      <template #leading>
        <div class="md:hidden">
          <Button as="NuxtLink" to="/admin" text severity="secondary" aria-label="Back">
            <template #icon><Icon name="tabler:chevron-left" aria-hidden="true" /></template>
          </Button>
        </div>
      </template>
      <template #trailing>
        <Button label="Check again" severity="secondary" rounded :loading="loading" :disabled="loading" @click="load(true)" />
      </template>
    </AppPageHeader>

    <p v-if="error" role="alert" class="moh-gutter-x py-3 text-sm text-red-700 dark:text-red-300">{{ error }}</p>

    <template v-if="report">
      <section
        aria-labelledby="overall-heading"
        class="moh-gutter-x border-b moh-border py-4 space-y-3"
      >
        <div class="flex items-center gap-3">
          <span :class="levelMeta[report.overall].badge" class="inline-flex size-9 items-center justify-center rounded-full">
            <Icon :name="levelMeta[report.overall].icon" class="text-xl" aria-hidden="true" />
          </span>
          <div class="min-w-0">
            <h2 id="overall-heading" class="font-semibold">{{ overallTitle }}</h2>
            <p class="text-xs moh-text-muted">
              {{ report.environment }} · checked {{ checkedAt }}
            </p>
          </div>
        </div>
        <div class="flex flex-wrap gap-2" role="list" aria-label="Counts by status">
          <span
            v-for="level in levels"
            :key="level"
            role="listitem"
            :class="levelMeta[level].chip"
            class="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold tabular-nums"
          >
            <Icon :name="levelMeta[level].icon" aria-hidden="true" />
            {{ report.counts[level] }} {{ levelMeta[level].label }}
          </span>
        </div>
      </section>

      <section
        v-for="level in levels"
        v-show="grouped[level].length"
        :key="level"
        :aria-labelledby="`${level}-heading`"
        class="border-b moh-border"
      >
        <h3
          :id="`${level}-heading`"
          class="moh-gutter-x pt-4 pb-2 text-[11px] font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400"
        >
          {{ levelMeta[level].heading }}
        </h3>
        <ul class="moh-divide">
          <li v-for="service in grouped[level]" :key="service.id" class="moh-gutter-x py-3 space-y-1.5">
            <div class="flex items-start gap-3">
              <span :class="levelMeta[service.level].dot" class="mt-1.5 inline-block size-2.5 shrink-0 rounded-full" aria-hidden="true" />
              <div class="min-w-0 flex-1">
                <div class="flex flex-wrap items-baseline justify-between gap-x-3">
                  <span class="font-semibold">{{ service.name }}</span>
                  <span class="text-xs moh-text-muted">
                    {{ service.group }}<template v-if="service.latencyMs !== null"> · {{ service.latencyMs }} ms</template>
                  </span>
                </div>
                <p class="text-sm">
                  <span class="sr-only">{{ levelMeta[service.level].label }}: </span>{{ service.summary }}
                </p>
                <p v-if="service.detail" class="text-xs moh-text-muted break-words">{{ service.detail }}</p>
                <p v-if="service.level !== 'green'" class="text-xs moh-text-muted">
                  If unavailable: {{ service.impact }}
                </p>
                <ul v-if="service.missingKeys.length" class="mt-1 flex flex-wrap gap-1.5" aria-label="Missing settings">
                  <li v-for="key in service.missingKeys" :key="key">
                    <code class="rounded moh-surface-2 px-1.5 py-0.5 text-[11px]">{{ key }}</code>
                  </li>
                </ul>
                <ul v-if="service.features.length" class="mt-1 flex flex-wrap gap-1.5" aria-label="Features">
                  <li
                    v-for="feature in service.features"
                    :key="feature.label"
                    class="rounded-full moh-surface-2 px-2 py-0.5 text-[11px]"
                    :class="feature.enabled ? '' : 'moh-text-muted line-through'"
                  >
                    {{ feature.label }}
                  </li>
                </ul>
              </div>
            </div>
          </li>
        </ul>
      </section>
    </template>
    <p v-else-if="loading" role="status" class="moh-gutter-x py-4 text-sm moh-text-muted">Checking services…</p>
  </AppPageContent>
</template>

<script setup lang="ts">
import { formatLocaleTime } from '~/utils/time-format'
import type { AdminServiceLevel, AdminServiceStatusDto, AdminServiceStatusItemDto } from '~/types/api-contracts.gen'
import { getApiErrorMessage } from '~/utils/api-error'

definePageMeta({ layout: 'app', title: 'Service status', middleware: 'admin' })

usePageSeo({
  title: 'Admin Service status',
  description: 'Status of connected services.',
  canonicalPath: '/admin/services',
  noindex: true,
})

const levels: AdminServiceLevel[] = ['red', 'yellow', 'green']
const levelMeta: Record<AdminServiceLevel, { label: string; heading: string; icon: string; badge: string; chip: string; dot: string }> = {
  red: {
    label: 'Down',
    heading: 'Needs attention',
    icon: 'tabler:circle-x',
    badge: 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300',
    chip: 'bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-200',
    dot: 'bg-red-500',
  },
  yellow: {
    label: 'Degraded',
    heading: 'Degraded or optional',
    icon: 'tabler:alert-triangle',
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
    chip: 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-200',
    dot: 'bg-amber-400',
  },
  green: {
    label: 'Healthy',
    heading: 'Healthy',
    icon: 'tabler:circle-check',
    badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
    chip: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200',
    dot: 'bg-emerald-500',
  },
}

const { apiFetchData } = useApiClient()
const report = ref<AdminServiceStatusDto | null>(null)
const loading = ref(false)
const error = ref('')
const checkedAt = ref('')

const grouped = computed<Record<AdminServiceLevel, AdminServiceStatusItemDto[]>>(() => {
  const out: Record<AdminServiceLevel, AdminServiceStatusItemDto[]> = { red: [], yellow: [], green: [] }
  for (const service of report.value?.services ?? []) out[service.level].push(service)
  return out
})

const overallTitle = computed(() => {
  const counts = report.value?.counts
  if (!counts) return ''
  if (counts.red) return `${counts.red} service${counts.red === 1 ? '' : 's'} need attention`
  if (counts.yellow) return `Everything critical is up; ${counts.yellow} degraded or optional`
  return 'All services healthy'
})

async function load(refresh = false) {
  if (loading.value) return
  loading.value = true
  try {
    const data = await apiFetchData<AdminServiceStatusDto>('/admin/services', { query: refresh ? { refresh: 'true' } : undefined })
    report.value = data
    checkedAt.value = formatLocaleTime(new Date(data.asOf), { hour: 'numeric', minute: '2-digit' })
    error.value = ''
  } catch (e) {
    error.value = getApiErrorMessage(e) || 'Could not load service status.'
  } finally {
    loading.value = false
  }
}

// Settings and provider reachability change on deploys, not while someone watches this page,
// so fetch-on-open/activation plus the "Check again" button is enough; no socket subscription.
onMounted(() => load(true))
onActivated(() => load())
</script>
