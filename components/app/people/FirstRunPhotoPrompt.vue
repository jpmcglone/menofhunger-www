<template>
  <AppModal
    v-if="open"
    v-model="open"
    title="Add a photo?"
    max-width-class="max-w-sm"
    :dismissable-mask="false"
    :show-close="false"
    max-height="min(90vh, 28rem)"
  >
    <div class="moh-gutter-x py-5 flex flex-col items-center gap-4 text-center">
      <Icon name="tabler:user-circle" class="text-5xl text-[var(--moh-brass)]" aria-hidden="true" />
      <p class="text-sm moh-text-muted leading-relaxed">
        Profiles with a photo get more replies. You can always add one later in Settings.
      </p>
    </div>
    <template #footer>
      <div class="flex flex-col gap-2">
        <Button
          label="Add photo"
          class="w-full !bg-black !text-white !border-black dark:!bg-white dark:!text-black dark:!border-white"
          rounded
          @click="addPhoto"
        />
        <Button
          label="Skip for now"
          severity="secondary"
          text
          class="w-full"
          @click="skipPhoto"
        />
      </div>
    </template>
  </AppModal>
</template>

<script setup lang="ts">
const { step, addPhoto, skipPhoto } = useFirstRunFlow()
const open = computed({
  get: () => step.value === 'photo',
  set: () => {},
})
</script>
