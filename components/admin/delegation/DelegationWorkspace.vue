<template>
  <section class="delegation-board">
    <NuxtLink :to="jobId ? '/admin/delegation' : '/admin/assistant'" class="text-sm moh-text-muted hover:underline">← {{ jobId ? 'Delegated work' : 'Ask MARV' }}</NuxtLink>
    <header class="space-y-2"><div class="flex items-center gap-3"><h1 class="flex-1 text-[28px] font-semibold tracking-tight">{{ editing ? (job ? 'Edit job' : 'New job') : job?.title ?? 'Delegated work' }}</h1><Button label="Refresh" text severity="secondary" :loading="loading" @click="refresh()" /></div><p class="text-sm moh-text-muted">{{ job ? `Acting as @${job.actor.username} · ${schedule(job)}` : 'Give MARV a job. Follow every action.' }}</p></header>
    <AppInlineAlert v-if="error" severity="danger">{{ error }}</AppInlineAlert>
    <div v-if="!workspace" class="py-8" role="status"><AppMarvMark v-if="loading" :size="24" loading /><p class="mt-3 moh-text-muted">{{ loading ? 'Loading delegated work…' : 'Your workspace could not be loaded.' }}</p></div>
    <template v-else>
      <div v-if="!workspace.configured" class="delegation-action space-y-2"><h2 class="font-semibold">MARV is unavailable</h2><p class="text-sm moh-text-muted">Your jobs and receipts remain available. Check MARV settings before running new work.</p><NuxtLink to="/admin/marv" class="text-sm underline">Open MARV settings</NuxtLink></div>
      <AdminDelegationEditor v-if="editing" :key="job?.id ?? 'new'" :workspace="workspace" :initial="job ?? undefined" :busy="busy" @save="save" @cancel="editing = false" />
      <template v-else-if="job">
        <div class="flex flex-wrap gap-3"><Button label="Run now" class="delegation-primary" :disabled="busy || !workspace.configured || job.status === 'cancelled' || job.runs.some(r => ['queued','running'].includes(r.status))" @click="control('run')" /><Button v-if="job.status !== 'cancelled'" :label="job.status === 'paused' ? 'Resume' : 'Pause'" outlined severity="secondary" :disabled="busy" @click="control(job.status === 'paused' ? 'resume' : 'pause')" /><Button v-if="job.status !== 'cancelled'" label="Edit" text severity="secondary" :disabled="busy" @click="editing = true" /></div>
        <p class="text-xs moh-text-muted">{{ status(job.status) }} · {{ job.permission === 'publish_news' ? 'May publish one sourced news post per run' : 'Actions require your review' }}<span v-if="job.nextRunAt"> · Next: {{ date(job.nextRunAt) }}</span></p>
        <details><summary class="min-h-11 content-center cursor-pointer text-sm">Instructions</summary><p class="whitespace-pre-wrap text-sm moh-text-muted py-3">{{ job.instruction }}</p></details>
        <div v-if="!job.runs.length" class="py-6"><h2 class="font-semibold">Ready when you are</h2><p class="mt-2 text-sm moh-text-muted">The first run will appear here when it starts.</p></div>
        <div class="moh-divide"><article v-for="(run, index) in job.runs" :key="run.id" class="py-6 space-y-4"><div><p class="text-xs moh-text-muted">{{ index === 0 ? 'Latest run' : 'Earlier run' }} · {{ date(run.createdAt) }}</p><h2 class="mt-1 font-semibold">{{ status(run.status) }}</h2></div><p v-if="run.summary" class="whitespace-pre-wrap text-sm leading-relaxed">{{ run.summary }}</p><p v-else class="text-sm moh-text-muted">{{ ['queued','running'].includes(run.status) ? 'MARV is gathering evidence and preparing the result.' : 'No summary was recorded.' }}</p><AdminDelegationAction v-for="action in run.actions" :key="action.id" :action="action" :actor="job.actor.username ?? ''" :busy="busy" :stale="job.status === 'cancelled'" @decide="decide" /></article></div>
        <Button v-if="job.nextRunCursor" label="Load earlier runs" text severity="secondary" :loading="loading" @click="older" />
        <details v-if="job.status !== 'cancelled'"><summary class="min-h-11 content-center cursor-pointer text-sm moh-text-muted">Cancel this job</summary><p class="text-sm moh-text-muted my-3">Stops future runs and invalidates pending proposals. Completed actions and receipts remain.</p><Button label="Cancel job" outlined severity="danger" :disabled="busy" @click="control('cancel')" /></details>
      </template>
      <template v-else-if="!jobId">
        <div class="flex items-center justify-between"><Button label="New job" class="delegation-primary" @click="editing = true" /><span class="text-xs moh-text-muted">Admins only</span></div>
        <div class="flex flex-wrap gap-1" aria-label="Filter jobs"><Button v-for="item in filters" :key="item.id" :label="item.label" :text="filter !== item.id" severity="secondary" :aria-pressed="filter === item.id" @click="filter = item.id" /></div>
        <div v-if="!filtered.length" class="py-8 space-y-2"><h2 class="text-xl font-semibold">{{ workspace.jobs.length ? 'No jobs in this view' : 'What can MARV take off your plate?' }}</h2><p class="text-sm moh-text-muted">{{ workspace.jobs.length ? 'Choose another filter or create a job.' : 'Start with morning news, community follow-up, or a weekly retention review.' }}</p></div>
        <div class="moh-divide"><NuxtLink v-for="item in filtered" :key="item.id" :to="`/admin/delegation/${item.id}`" class="block py-5 space-y-2 hover:opacity-80"><h2 class="font-semibold">{{ item.title }} <span aria-hidden="true">↗</span></h2><p class="text-sm moh-text-muted">@{{ item.actor.username }} · {{ schedule(item) }}</p><p class="text-sm">{{ needsReview(item) ? 'Needs review' : status(item.runs[0]?.status ?? item.status) }}<span v-if="item.status === 'paused' || item.status === 'cancelled'"> · {{ status(item.status) }}</span></p></NuxtLink></div>
        <details><summary class="min-h-11 content-center cursor-pointer text-sm moh-text-muted">Available connections</summary><div class="moh-divide"><div v-for="integration in workspace.integrations" :key="integration.id" class="py-3"><p class="text-sm font-medium">{{ integration.title }} · {{ integration.available ? 'Available' : 'Not connected' }}</p><p class="mt-1 text-xs moh-text-muted">{{ integration.reason }}</p></div></div></details>
      </template>
    </template>
  </section>
</template>
<script setup lang="ts">
import type { DelegationJobDto } from '~/types/api'
import { delegationStatus as status, delegationSchedule as schedule, delegationNeedsReview as needsReview } from '~/utils/admin-delegation'
const props = defineProps<{ jobId?: string }>()
const { workspace, job, error, loading, busy, refresh, mutate, older } = useAdminDelegation(toRef(props, 'jobId'))
const editing = ref(false), filter = ref('all')
const filters = [{ id: 'all', label: 'All jobs' }, { id: 'review', label: 'Needs review' }, { id: 'scheduled', label: 'Scheduled' }, { id: 'complete', label: 'Completed' }]
const filtered = computed(() => (workspace.value?.jobs ?? []).filter(j => filter.value === 'all' || (filter.value === 'review' ? needsReview(j) : filter.value === 'scheduled' ? j.status === 'active' && Boolean(j.nextRunAt) : j.runs[0]?.status === 'complete')))
const date = (value: string) => new Date(value).toLocaleString()
watch(() => workspace.value === null, cleared => { if (cleared) editing.value = false })
async function save(input: Record<string, unknown>) {
  const result = await mutate<DelegationJobDto>(job.value ? `jobs/${job.value.id}` : 'jobs', input, job.value ? 'PATCH' : 'POST')
  if (result) { editing.value = false; if (!props.jobId) await navigateTo(`/admin/delegation/${result.id}`) }
}
async function control(command: string) { if (job.value) await mutate(`jobs/${job.value.id}/control`, { command, requestId: crypto.randomUUID() }) }
async function decide(id: string, decision: 'confirm' | 'cancel', body?: string) { await mutate(`actions/${id}`, { decision, body }) }
</script>
<style>
.delegation-board { display: flex; flex-direction: column; gap: 24px; padding: 32px; color: var(--moh-text); }
.delegation-primary { background: var(--moh-text) !important; color: var(--moh-surface-0) !important; border-color: var(--moh-text) !important; min-height: 44px; font-weight: 600; }
.delegation-field { display: block; width: 100%; min-height: 44px; border: 1px solid var(--moh-border); border-radius: 12px; background: var(--moh-surface-2); color: var(--moh-text); padding: 12px; }
.delegation-action { padding: 20px; background: var(--moh-surface-2); border: 1px solid var(--moh-border); border-radius: 12px; }
.delegation-board label { display: block; font-size: 14px; }
@media(max-width:640px) { .delegation-board { padding: 16px; } }
</style>
