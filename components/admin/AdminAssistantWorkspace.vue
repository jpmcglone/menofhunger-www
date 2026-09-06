<template>
  <section class="flex min-h-full flex-col">
    <AppPageHeader class="px-4 pt-4 pb-3" title="Ask MARV" description="Your private admin workspace.">
      <template #trailing>
        <Button label="Refresh" text severity="secondary" :loading="loading" @click="refresh()" />
      </template>
    </AppPageHeader>
    <div class="px-4 pb-3 text-xs moh-text-muted">
      <span v-if="workspace">{{ workspace.environment }}</span>
      <span class="block mt-1">MARV reads live data and prepares changes for your review. Only you can apply them.</span>
    </div>
    <div v-if="error" class="px-4 pb-3"><AppInlineAlert severity="danger">{{ error }}</AppInlineAlert></div>
    <div v-if="loading && !workspace" class="px-4 py-8 moh-text-muted" role="status">Loading your workspace…</div>
    <template v-if="workspace">
      <details class="mx-4 py-3 border-y moh-border">
        <summary class="cursor-pointer font-semibold py-1">All admin tools</summary>
        <div class="moh-divide mt-2">
          <div v-for="capability in workspace.capabilities.filter(item => item.id !== 'assistant')" :key="capability.id" class="py-3">
            <NuxtLink v-if="capability.path" :to="capability.path" class="font-semibold hover:underline">{{ capability.title }}</NuxtLink>
            <div v-else class="font-semibold">{{ capability.title }}</div>
            <p class="text-sm moh-text-muted">{{ capability.summary }}</p>
            <p class="text-xs moh-text-muted mt-1">{{ capability.id === 'local-artifacts' ? 'Available on your computer only' : capability.tools.length ? 'MARV can help investigate this area' : 'Use the dedicated admin controls' }}</p>
          </div>
        </div>
      </details>
      <div v-if="!workspace.configured" class="px-4 py-4 moh-text-muted">
        MARV is unavailable. <NuxtLink to="/admin/marv" class="underline">Open MARV settings</NuxtLink>. Your admin tools are still available above.
      </div>
      <div v-if="workspace.turns.length === 0" class="px-4 py-6 space-y-3">
        <p class="font-semibold">What needs your attention?</p>
        <div class="flex flex-col items-start gap-2">
          <Button v-for="prompt in prompts" :key="prompt" :label="prompt" text severity="secondary" class="!text-left" @click="draft = prompt" />
        </div>
      </div>
      <div class="moh-divide flex-1" aria-live="polite" aria-relevant="additions text">
        <article v-for="turn in workspace.turns" :key="turn.id" class="px-4 py-5 space-y-4">
          <div><div class="text-xs moh-text-muted mb-1">You</div><p class="whitespace-pre-wrap break-words font-semibold">{{ turn.question }}</p></div>
          <div><div class="text-xs moh-text-muted mb-1">MARV · {{ turn.status }}</div><AppMarvMarkdown v-if="turn.answer" :text="turn.answer" /><p v-else class="whitespace-pre-wrap break-words">{{ (turn.status === 'interrupted' ? 'This request was interrupted. Check any proposals below, then ask again.' : 'Checking the admin tools… You can leave this screen and return to check the result.') }}</p></div>
          <details v-if="turn.sources.length" class="text-sm moh-text-muted">
            <summary class="cursor-pointer">Sources checked ({{ turn.sources.length }})</summary>
            <ul class="mt-2 space-y-1"><li v-for="(source, index) in turn.sources" :key="index">{{ source.tool }} · {{ source.fetchedAt }}<span v-if="source.url" class="block break-all text-xs">{{ source.url }}</span></li></ul>
          </details>
          <div v-for="action in turn.actions" :key="action.id" class="border-l-2 moh-border pl-4 space-y-3">
            <p class="font-semibold">{{ action.title }}</p>
            <p class="text-sm moh-text-muted">{{ action.status }} · Expires {{ action.expiresAt }}</p>
            <details :open="action.changes === '{}'"><summary class="cursor-pointer text-sm">Review current item</summary><dl class="mt-2 space-y-2"><div v-for="field in adminReviewFields(action.before)" :key="field.label"><dt class="text-xs moh-text-muted">{{ field.label }}</dt><dd class="whitespace-pre-wrap break-words text-sm">{{ field.value }}</dd></div></dl></details>
            <dl class="space-y-2"><div v-for="field in adminReviewFields(action.changes)" :key="field.label"><dt class="text-xs moh-text-muted">{{ field.label }}</dt><dd class="whitespace-pre-wrap break-words text-sm">{{ field.value }}</dd></div></dl>
            <div class="flex flex-wrap items-center gap-2">
              <template v-if="action.status === 'pending'">
                <Button label="Apply this change" :loading="deciding === action.id" :disabled="!!deciding" @click="decide(action, 'confirm')" />
                <Button label="Cancel" text severity="secondary" :disabled="!!deciding" @click="decide(action, 'cancel')" />
              </template>
              <NuxtLink :to="action.path" class="text-sm underline">Open admin tool</NuxtLink>
            </div>
            <p v-if="action.resultMessage" class="text-sm moh-text-muted">{{ action.resultMessage }}</p>
          </div>
        </article>
      </div>
      <div ref="answerEnd" />
      <form class="sticky bottom-0 border-t moh-border moh-bg px-4 py-3 space-y-2" @submit.prevent="submit">
        <label for="admin-marv-message" class="sr-only">Ask MARV about Men of Hunger</label>
        <Textarea id="admin-marv-message" v-model="draft" class="w-full" rows="3" maxlength="6000" placeholder="Ask about Men of Hunger, or describe a change…" :disabled="sending || !workspace.configured" />
        <div class="flex justify-between items-center gap-3">
          <span class="text-xs moh-text-muted">Changes require review. Sending a question does not approve an action.</span>
          <Button type="submit" label="Ask MARV" :loading="sending" :disabled="!draft.trim() || sending || !workspace.configured" />
        </div>
      </form>
    </template>
  </section>
</template>

<script setup lang="ts">
import { adminReviewFields } from '~/utils/admin-assistant'
const { workspace, error, loading, sending, deciding, refresh, send, decide } = useAdminAssistant()
const draft = ref('')
const answerEnd = ref<HTMLElement | null>(null)
const prompts = ['What needs my attention today?', 'How did growth and retention change this week?', 'Review feedback, reports, and verification requests.', 'Help me draft the next lodge newsletter.']
async function submit() {
  const message = draft.value
  if (await send(message)) {
    if (draft.value === message) draft.value = ''
    await nextTick()
    answerEnd.value?.scrollIntoView({ block: 'end' })
  }
}
</script>
