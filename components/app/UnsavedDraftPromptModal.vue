<template>
  <Dialog
    v-model:visible="open"
    modal
    header="Save draft?"
    :draggable="false"
    class="w-[min(30rem,calc(100vw-2rem))]"
    aria-label="Save draft prompt"
  >
    <p class="text-sm moh-text-muted">
      You have a post started. Do you want to save it as a draft before leaving?
    </p>

    <template #footer>
      <Button label="Cancel" severity="secondary" text @click="choose('cancel')" />
      <Button label="Discard" severity="secondary" text @click="choose('discard')" />
      <Button label="Save draft" @click="choose('save')" />
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import type { UnsavedDraftPromptChoice } from '~/composables/useUnsavedDraftPrompt'

const { open, choose: choosePrompt } = useUnsavedDraftPrompt()

function choose(choice: UnsavedDraftPromptChoice) {
  choosePrompt(choice)
}
</script>

