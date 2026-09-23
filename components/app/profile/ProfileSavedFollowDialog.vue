<template>
  <!-- Figma: https://www.figma.com/design/YnuRSJB7p90n9jEY4mb4RN?node-id=830-706 -->
  <AppModal
    :model-value="modelValue"
    title="People to follow"
    subtitle="Profile saved. These men aren’t in your circle yet."
    max-width-class="max-w-[30rem]"
    body-class="p-0"
    @update:model-value="onVisibility"
  >
    <AppSubtleSectionLoader :loading="!hasLoaded && !error" :refreshing="loading && hasLoaded" min-height-class="min-h-[180px]">
      <div v-if="error" class="moh-gutter-x py-6 text-center" role="alert">
        <p>{{ error }}</p>
        <Button label="Try again" text class="mt-2" :disabled="loading" @click="loadSuggestions" />
      </div>
      <p v-else-if="hasLoaded && users.length === 0" class="moh-gutter-x py-6 text-center moh-text-muted">
        You’re all caught up. Check back later for more people to follow.
      </p>
      <div class="moh-divide">
        <div v-for="person in users" :key="person.id" class="moh-gutter-x">
          <AppWhoToFollowCompactRow :user="person" />
        </div>
      </div>
    </AppSubtleSectionLoader>
  </AppModal>
</template>

<script setup lang="ts">
/**
 * Opens after saving, while suggestions load. Errors can be retried without saving again.
 * Closing it does not undo the save.
 */
const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()

const suggestionLimit = 5
const { users, loading, hasLoaded, error, refresh } = useWhoToFollow({
  autoRefresh: false,
  defaultLimit: suggestionLimit,
})

function loadSuggestions() {
  return refresh({ force: true, limit: suggestionLimit })
}

watch(
  () => props.modelValue,
  (open) => { if (open) void loadSuggestions() },
  { immediate: true },
)

function onVisibility(open: boolean) {
  if (!open) emit('update:modelValue', false)
}
</script>
