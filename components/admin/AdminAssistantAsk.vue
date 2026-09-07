<template>
  <article class="marv-entry" :aria-labelledby="`ask-${turn.id}`">
    <div class="flex flex-wrap items-center justify-between gap-2 text-xs moh-text-muted">
      <time :datetime="turn.createdAt">{{ adminAskDate(turn.createdAt) }}</time>
      <span class="flex items-center gap-2"><AppMarvMark v-if="turn.status === 'running'" :size="14" loading />{{ statusLabel }}</span>
    </div>
    <h2 :id="`ask-${turn.id}`" class="text-xl font-semibold leading-snug break-words whitespace-pre-wrap">{{ turn.question }}</h2>
    <div v-if="expanded" class="space-y-4">
      <AppMarvMarkdown v-if="turn.answer" :text="turn.answer" />
      <p v-else class="text-sm moh-text-muted" role="status">{{ turn.status === 'interrupted' ? 'This request was interrupted. Check any proposals below, then ask again.' : 'Checking the admin tools… You can leave this screen and return to check the result.' }}</p>
          <details v-if="turn.sources.length" class="text-sm moh-text-muted">
            <summary class="cursor-pointer">Sources checked ({{ turn.sources.length }})</summary>
            <ul class="mt-2 space-y-1"><li v-for="(source, index) in turn.sources" :key="index">{{ source.tool }} · {{ adminAskDate(source.fetchedAt) }}<a v-if="adminSourceUrl(source.url)" :href="adminSourceUrl(source.url)!" target="_blank" rel="noopener noreferrer" class="block break-all text-xs underline">{{ source.url }}</a></li></ul>
          </details>
          <div v-for="action in turn.actions" :key="action.id" class="marv-review space-y-3">
            <p v-if="action.status === 'pending'" class="text-xs font-medium moh-text-muted">REVIEW REQUIRED</p>
            <p class="font-semibold">{{ action.title }}</p>
            <p class="text-sm moh-text-muted">{{ action.status }} · Expires {{ adminAskDate(action.expiresAt) }}</p>
            <details :open="action.changes === '{}'"><summary class="cursor-pointer text-sm">Review current item</summary><dl class="mt-2 space-y-2"><div v-for="field in adminReviewFields(action.before)" :key="field.label"><dt class="text-xs moh-text-muted">{{ field.label }}</dt><dd class="whitespace-pre-wrap break-words text-sm">{{ field.value }}</dd></div></dl></details>
            <p v-if="action.changes !== '{}'" class="text-xs font-medium moh-text-muted">Proposed changes</p>
            <dl class="space-y-2"><div v-for="field in adminReviewFields(action.changes)" :key="field.label"><dt class="text-xs moh-text-muted">{{ field.label }}</dt><dd class="whitespace-pre-wrap break-words text-sm">{{ field.value }}</dd></div></dl>
            <div class="flex flex-wrap items-center gap-2">
              <template v-if="action.status === 'pending'">
                <Button class="marv-apply" label="Apply this change" :loading="deciding === action.id" :disabled="!!deciding" @click="emit('decide', action, 'confirm')" ><template #loadingicon><AppMarvMark :size="18" loading /></template></Button>
                <Button label="Cancel" text severity="secondary" :disabled="!!deciding" @click="emit('decide', action, 'cancel')" />
              </template>
              <NuxtLink :to="action.path" class="text-sm underline">Open admin tool</NuxtLink>
            </div>
            <p v-if="action.resultMessage" class="text-sm moh-text-muted">{{ action.resultMessage }}</p>
          </div>

    </div>
    <p v-else class="text-sm moh-text-muted line-clamp-2 whitespace-pre-wrap">{{ preview }}</p>
    <button type="button" class="marv-disclosure text-sm moh-text-muted" :aria-expanded="expanded" @click="emit('toggle')">
      {{ expanded ? 'Hide answer' : 'Read answer' }}<Icon :name="expanded ? 'tabler:chevron-up' : 'tabler:chevron-down'" aria-hidden="true" />
    </button>
  </article>
</template>

<script setup lang="ts">
import type { AdminAssistantActionDto, AdminAssistantTurnDto } from '~/types/api'
import { adminAskDate, adminReviewFields, adminSourceUrl, adminAnswerPreview } from '~/utils/admin-assistant'
const props = defineProps<{ turn: AdminAssistantTurnDto; expanded: boolean; deciding: string | null }>()
const emit = defineEmits<{ toggle: []; decide: [action: AdminAssistantActionDto, decision: 'confirm' | 'cancel'] }>()
const preview = computed(() => adminAnswerPreview(props.turn.answer) || 'Open this ask to see its progress.')
const statusLabel = computed(() => props.turn.actions.some(action => action.status === 'pending') ? 'Review required' : ({ complete: 'Answer ready', running: 'Working', interrupted: 'Interrupted' }[props.turn.status] ?? props.turn.status))
</script>

<style scoped>
.marv-entry { display: flex; flex-direction: column; gap: 16px; padding: 24px; border: 1px solid var(--moh-border); border-radius: 16px; background: var(--moh-surface-1); min-width: 0; }
.marv-review { display: flex; flex-direction: column; gap: 12px; padding: 20px; border: 1px solid var(--moh-border); border-radius: 12px; background: var(--moh-surface-2); }
.marv-apply { background: var(--moh-text) !important; color: var(--moh-surface-0) !important; border-color: var(--moh-text) !important; min-height: 44px; }
.marv-disclosure { display: flex; align-items: center; gap: 8px; align-self: flex-start; min-height: 44px; cursor: pointer; }
.marv-disclosure:focus-visible { outline: 2px solid var(--moh-text); outline-offset: 4px; border-radius: 4px; }
@media (max-width: 640px) { .marv-entry { padding: 20px; } .marv-review { display: flex; flex-direction: column; gap: 12px; padding: 16px; } }
</style>
