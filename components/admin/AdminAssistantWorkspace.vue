<template>
  <section class="marv-board">
    <header class="space-y-2">
      <div class="flex items-center gap-3">
        <AppMarvMark :size="32" />
        <h1 class="flex-1 text-[28px] font-semibold tracking-tight">Ask MARV</h1>
        <Button label="Refresh" text severity="secondary" :loading="loading" @click="refresh()"><template #loadingicon><AppMarvMark :size="18" loading /></template></Button>
      </div>
      <p class="text-sm moh-text-muted">Your private admin board.</p>
    </header>

    <form class="marv-composer" @submit.prevent="submit">
      <label for="admin-marv-message" class="text-xs font-medium moh-text-muted">WHAT’S ON YOUR MIND?</label>
      <Textarea id="admin-marv-message" v-model="draft" class="marv-input w-full" rows="3" maxlength="6000" placeholder="Ask about Men of Hunger, or describe a change…" :disabled="sending || !workspace?.configured" aria-describedby="marv-review-note" />
      <div class="flex items-center justify-between gap-4">
        <p id="marv-review-note" class="text-xs moh-text-muted max-w-xs">Changes stay in review until you apply them.</p>
        <Button type="submit" class="marv-submit shrink-0" :label="sending ? 'Asking…' : 'Ask MARV'" :loading="sending" :disabled="!draft.trim() || sending || !workspace?.configured"><template #loadingicon><AppMarvMark :size="18" loading /></template></Button>
      </div>
    </form>
    <div class="marv-quick-asks" aria-label="Suggested asks">
      <button v-for="prompt in prompts" :key="prompt.label" type="button" :disabled="sending || !workspace?.configured" @click="choosePrompt(prompt.question)">{{ prompt.label }}<Icon name="tabler:arrow-up-right" aria-hidden="true" /></button>
    </div>

    <AppInlineAlert v-if="error" severity="danger">{{ error }}</AppInlineAlert>
    <div class="flex flex-wrap items-center justify-between gap-2">
      <h2 class="font-semibold">Your asks</h2>
      <p class="text-xs moh-text-muted">{{ turns.length ? `${turns.length} ${turns.length === 1 ? 'ask' : 'asks'} · ` : '' }}Newest first</p>
    </div>
    <div v-if="loading && !workspace" class="marv-state" role="status"><AppMarvMark :size="24" loading /><p>Loading your board…</p></div>
    <div v-else-if="workspace && !workspace.configured" class="marv-state">
      <h2 class="text-xl font-semibold">MARV is unavailable</h2>
      <p class="text-sm moh-text-muted">Check the configuration. Your saved asks and admin tools remain available.</p>
      <NuxtLink to="/admin/marv" class="text-sm underline">Open MARV settings</NuxtLink>
    </div>
    <div v-else-if="workspace && !turns.length" class="marv-state">
      <h2 class="text-xl font-semibold">What needs your attention?</h2>
      <p class="text-sm moh-text-muted">Ask a question or describe a change. Your answers and proposals will collect here.</p>
    </div>
    <div class="space-y-4" aria-label="Asks, newest first">
      <AdminAssistantAsk v-for="(turn, index) in turns" :key="turn.id" :turn="turn" :expanded="isExpanded(turn, index)" :deciding="deciding" @toggle="expanded[turn.id] = !isExpanded(turn, index)" @decide="decide" />
    </div>
    <div v-if="workspace" class="space-y-4 pt-2">
      <details>
        <summary class="marv-summary font-semibold">All admin tools</summary>
        <div class="moh-divide mt-2">
          <div v-for="capability in workspace.capabilities.filter(item => item.id !== 'assistant')" :key="capability.id" class="py-3">
            <NuxtLink v-if="capability.path" :to="capability.path" class="font-semibold hover:underline">{{ capability.title }}</NuxtLink>
            <p v-else class="font-semibold">{{ capability.title }}</p>
            <p class="text-sm moh-text-muted">{{ capability.summary }}</p>
            <p class="text-xs moh-text-muted mt-1">{{ capability.id === 'local-artifacts' ? 'Available on your computer only' : capability.tools.length ? 'MARV can help investigate this area' : 'Use the dedicated admin controls' }}</p>
          </div>
        </div>
      </details>
      <details class="text-xs moh-text-muted">
        <summary class="marv-summary">Connection details</summary>
        <p class="break-all py-2">{{ workspace.environment }}</p>
        <p>MARV reads live data and prepares changes for your review. Only you can apply them.</p>
      </details>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { AdminAssistantTurnDto } from '~/types/api'
import { adminNewestAsks } from '~/utils/admin-assistant'
const { workspace, error, loading, sending, deciding, refresh, send, decide } = useAdminAssistant()
const draft = ref('')
const expanded = ref<Record<string, boolean>>({})
const turns = computed(() => adminNewestAsks(workspace.value?.turns ?? []))
const prompts = [
  { label: 'Today’s priorities', question: 'What needs my attention today?' },
  { label: 'Growth & retention', question: 'How did growth and retention change this week?' },
  { label: 'Draft a newsletter', question: 'Help me draft the next lodge newsletter.' },
  { label: 'Review feedback', question: 'Review feedback, reports, and verification requests.' },
]
function isExpanded(turn: AdminAssistantTurnDto, index: number) {
  return expanded.value[turn.id] ?? (index === 0 || turn.status === 'running' || turn.actions.some(action => action.status === 'pending'))
}
async function choosePrompt(question: string) {
  draft.value = question
  await nextTick()
  document.getElementById('admin-marv-message')?.focus()
}
watch(() => workspace.value === null, (cleared) => { if (cleared) { draft.value = ''; expanded.value = {} } })
async function submit() {
  const message = draft.value
  if (await send(message)) {
    if (draft.value === message) draft.value = ''
  }
}
</script>

<style scoped>
.marv-board { display: flex; flex-direction: column; gap: 24px; padding: 32px; color: var(--moh-text); }
.marv-composer { display: flex; flex-direction: column; gap: 16px; padding: 20px; background: var(--moh-surface-2); border: 1px solid var(--moh-border); border-radius: 16px; }
.marv-composer:focus-within { border-color: var(--moh-text-muted); }
.marv-input { background: transparent !important; border: 0 !important; box-shadow: none !important; padding: 0 !important; font-size: 18px; line-height: 1.6; resize: vertical; min-height: 86px; }
.marv-input:focus-visible { outline: 2px solid var(--moh-focus-ring-strong); outline-offset: 4px; }
.marv-submit { background: var(--moh-text) !important; color: var(--moh-surface-0) !important; border-color: var(--moh-text) !important; min-height: 44px; font-weight: 600; }
.marv-quick-asks { display: flex; flex-wrap: wrap; gap: 0 20px; }
.marv-quick-asks button { display: flex; align-items: center; gap: 6px; min-height: 44px; font-size: 12px; color: var(--moh-text-muted); cursor: pointer; text-align: left; }
.marv-quick-asks button:disabled { opacity: .45; cursor: default; }
.marv-quick-asks button:focus-visible { outline: 2px solid var(--moh-text); outline-offset: 4px; }
.marv-state { display: flex; flex-direction: column; gap: 12px; padding: 24px; border: 1px solid var(--moh-border); border-radius: 16px; background: var(--moh-surface-1); }
.marv-summary { min-height: 44px; align-content: center; cursor: pointer; }
@media (max-width: 640px) { .marv-board { padding: 16px; } .marv-input { font-size: 16px; } .marv-quick-asks { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0 12px; } }
</style>
