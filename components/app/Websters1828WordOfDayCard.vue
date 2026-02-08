<template>
  <Card class="border moh-border moh-card-matte !bg-white/95 dark:!bg-zinc-900/80">
    <template #content>
      <div class="flex items-center justify-between gap-3">
        <div class="flex items-center gap-0.5">
          <span
            class="inline-flex items-center rounded-full border border-black/10 bg-white/55 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gray-900 dark:border-white/10 dark:bg-white/5 dark:text-gray-100 translate-y-[1px]"
          >
            Word
          </span>
          <span class="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 tracking-[0.14em] translate-x-[-1px] translate-y-[1px]">
            of the Day
          </span>
        </div>
      </div>

      <ClientOnly>
        <div v-if="pending" class="mt-4 text-sm moh-text-muted">
          Loading…
        </div>
        <div v-else-if="error" class="mt-4 text-sm text-red-700 dark:text-red-300">
          Couldn’t load the word of the day.
        </div>
        <div v-else-if="data?.word" class="mt-5 flex items-end gap-3">
          <!-- Vertical pill marker -->
          <div class="h-9 w-1.5 rounded-full bg-gray-900 dark:bg-white opacity-20 shrink-0 translate-y-[1px]" aria-hidden="true" />
          <div
            class="text-3xl font-semibold tracking-tight text-gray-900 dark:text-gray-50"
            style="font-family: var(--moh-font-serif);"
          >
            {{ data.word }}
          </div>
        </div>

        <div v-if="data?.dictionaryUrl" class="mt-3 flex justify-end">
          <a
            :href="data.dictionaryUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center gap-1.5 text-[11px] font-medium text-gray-500 hover:underline underline-offset-2 dark:text-gray-400"
          >
            View definition
            <i class="pi pi-external-link text-[11px] opacity-70" aria-hidden="true" />
          </a>
        </div>
        <template #fallback>
          <div class="mt-4 text-sm moh-text-muted">Loading…</div>
        </template>
      </ClientOnly>
    </template>
  </Card>
</template>

<script setup lang="ts">
import type { Websters1828WordOfDay } from '~/types/api'
import { msUntilNextEasternMidnight } from '~/utils/eastern-time'

const { apiFetchData } = useApiClient()

const { data, pending, error, refresh } = useAsyncData<Websters1828WordOfDay>(
  'websters1828:wotd',
  async () => {
    return await apiFetchData<Websters1828WordOfDay>('/meta/websters1828/wotd', { method: 'GET' })
  },
  { server: false, lazy: true },
)

let rolloverTimer: ReturnType<typeof setTimeout> | null = null
function scheduleRollover() {
  if (!import.meta.client) return
  rolloverTimer && clearTimeout(rolloverTimer)
  const ms = msUntilNextEasternMidnight(new Date())
  // Nudge a bit after midnight to avoid boundary weirdness.
  rolloverTimer = setTimeout(async () => {
    await refresh()
    scheduleRollover()
  }, Math.max(1000, ms + 2000))
}
onMounted(() => scheduleRollover())
onBeforeUnmount(() => {
  rolloverTimer && clearTimeout(rolloverTimer)
  rolloverTimer = null
})
</script>

