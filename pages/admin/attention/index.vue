<template>
  <section>
    <header class="moh-gutter-x space-y-4 py-5">
      <h1 class="moh-h2">Attention inbox</h1>
      <p class="text-sm moh-text-muted">The work that needs a human.</p>
      <Button label="Refresh" severity="secondary" rounded size="small" class="min-h-11" :loading="loading" @click="refresh" />
    </header>
    <p v-if="error" role="alert" class="moh-gutter-x py-4 text-sm text-red-600">{{ error }}</p>
    <div v-if="!data && loading" class="moh-gutter-x space-y-4 py-6" aria-label="Loading inbox"><Skeleton v-for="n in 4" :key="n" height="3rem" /></div>
    <template v-if="data">
      <section v-if="weekRows.length" aria-labelledby="attention-week">
        <h2 id="attention-week" class="moh-gutter-x pb-1 pt-4 text-sm font-semibold moh-text-muted">This week</h2>
        <div class="moh-divide border-t moh-border">
          <div v-for="row in weekRows" :key="row.label" class="moh-gutter-x flex items-center gap-4 py-4">
            <AppIconGlyph :name="row.icon" :size="20" class="shrink-0 text-[var(--moh-text-muted)]" />
            <span class="min-w-0 flex-1">
              <span class="block font-semibold">{{ row.label }}</span>
              <span class="mt-1 block text-sm moh-text-muted">{{ row.detail }}</span>
            </span>
            <span class="text-xl font-semibold tabular-nums">{{ row.value }}</span>
          </div>
        </div>
      </section>
      <section aria-labelledby="attention-work">
        <h2 id="attention-work" class="moh-gutter-x pb-1 pt-4 text-sm font-semibold moh-text-muted">Work</h2>
        <p v-if="!pending.length" class="moh-gutter-x py-8 moh-text-muted">You're up to date. No pending reviews or conversations needing a first reply.</p>
        <div v-else class="moh-divide border-t moh-border">
          <NuxtLink v-for="item in pending" :key="item.id" :to="item.id === 'unanswered' ? '/admin/attention/conversations' : item.path" class="moh-gutter-x flex items-center gap-4 py-4 hover:bg-black/5 dark:hover:bg-white/5">
            <AppIconGlyph :name="workIcon(item.id)" :size="20" class="shrink-0 text-[var(--moh-text-muted)]" />
            <span class="min-w-0 flex-1"><span class="block font-semibold">{{ item.title }}</span><span class="mt-1 block text-sm moh-text-muted">{{ item.detail }}</span></span>
            <span class="text-xl font-semibold tabular-nums">{{ item.count }}</span><Icon name="tabler:chevron-right" aria-hidden="true" />
          </NuxtLink>
        </div>
      </section>
      <p class="moh-gutter-x py-4 text-sm moh-text-muted">Updated {{ new Date(data.asOf).toLocaleTimeString() }}. Counts update as work is resolved.</p>
    </template>
  </section>
</template>
<script setup lang="ts">
import { usePrivateApiData } from '~/composables/usePrivateApiData'
import type { AdminAttentionDto } from '~/types/api'

// Figma: https://www.figma.com/design/YnuRSJB7p90n9jEY4mb4RN?node-id=418-12440
definePageMeta({ layout: 'app', middleware: ['admin', 'admin-attention-legacy'] })
useHead({ title: 'Attention inbox' })
const { data, loading, error, refresh } = usePrivateApiData<AdminAttentionDto>('/admin/operations/attention')
const pending = computed(() => data.value?.items.filter(item => item.count > 0) ?? [])
const weekRows = computed(() => {
  const pulse = data.value?.pulse
  if (!pulse) return []
  return [
    { label: 'Member posts answered in 24 hours', detail: 'Personal accounts only. Pages and site admins are excluded.', value: `${pulse.repliedWithin24h} of ${pulse.memberRoots}`, icon: 'reply' as const },
    { label: 'Those authors active again', detail: 'Recorded on a later UTC day after their post.', value: `${pulse.authorsReturned} of ${pulse.authors}`, icon: 'history' as const },
    { label: 'Lodge prompt replies', detail: 'Human replies to this week’s @menofhunger prompt.', value: pulse.lodgePromptReplies == null ? '—' : String(pulse.lodgePromptReplies), icon: 'quote' as const },
    { label: 'Oldest verification wait', detail: 'Pending requests from active accounts.', value: formatWait(pulse.oldestVerificationRequestedAt), icon: 'verified' as const },
  ]
})
function workIcon(id: string) {
  if (id === 'unanswered') return 'inbox' as const
  if (id === 'verification') return 'verified' as const
  if (id === 'reports') return 'flag' as const
  if (id === 'feedback') return 'messages' as const
  if (id === 'scheduled') return 'scheduled' as const
  return 'warning' as const
}
function formatWait(value: string | null) {
  if (!value) return 'None'
  const days = Math.floor((Date.now() - Date.parse(value)) / 86400000)
  if (!Number.isFinite(days) || days <= 0) return 'Today'
  return days === 1 ? '1 day' : `${days} days`
}
</script>
