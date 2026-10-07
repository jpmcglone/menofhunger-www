<template>
  <AppConfirmDialog
    :visible="open"
    header="Save draft?"
    message="You have a post started. Do you want to save it as a draft before leaving?"
    confirm-label="Save draft"
    confirm-severity="primary"
    @update:visible="!$event && choose('cancel')"
    @confirm="choose('save')"
    @cancel="choose('cancel')"
  >
    <template #extra-actions>
      <button
        type="button"
        class="moh-tap moh-focus rounded-lg px-4 py-2 text-sm font-medium moh-text-muted hover:moh-text transition-colors"
        @click="choose('discard')"
      >
        Discard
      </button>
    </template>
  </AppConfirmDialog>
</template>

<script setup lang="ts">
import type { UnsavedDraftPromptChoice } from '~/composables/useUnsavedDraftPrompt'

const { open, choose: choosePrompt } = useUnsavedDraftPrompt()

function choose(choice: UnsavedDraftPromptChoice) {
  choosePrompt(choice)
}
</script>
