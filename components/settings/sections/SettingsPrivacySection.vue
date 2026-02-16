<template>
  <div class="space-y-6">
    <div class="space-y-2">
      <div class="text-sm font-semibold text-gray-900 dark:text-gray-50">Follow visibility</div>
      <div class="text-sm text-gray-600 dark:text-gray-300">
        Choose who can see your follower/following counts and lists.
      </div>
    </div>

    <Select
      :model-value="followVisibilityInput"
      :options="followVisibilityOptions"
      optionLabel="label"
      optionValue="value"
      placeholder="Select..."
      class="w-full"
      :disabled="privacySaving"
      @update:model-value="$emit('update:followVisibilityInput', ($event ?? 'all') as FollowVisibility)"
    />

    <div class="space-y-2">
      <div class="text-sm font-semibold text-gray-900 dark:text-gray-50">Birthday visibility</div>
      <div class="text-sm text-gray-600 dark:text-gray-300">
        Control whether your profile shows your full birthday, month/day only, or nothing.
      </div>
    </div>

    <Select
      :model-value="birthdayVisibilityInput"
      :options="birthdayVisibilityOptions"
      optionLabel="label"
      optionValue="value"
      placeholder="Select..."
      class="w-full"
      :disabled="privacySaving"
      @update:model-value="$emit('update:birthdayVisibilityInput', ($event ?? 'monthDay') as BirthdayVisibility)"
    />

    <div class="flex items-center gap-3">
      <Button
        label="Save"
        severity="secondary"
        :loading="privacySaving"
        :disabled="privacySaving || !privacyDirty"
        @click="$emit('save')"
      >
        <template #icon>
          <Icon name="tabler:check" aria-hidden="true" />
        </template>
      </Button>
      <div v-if="privacySaved" class="text-sm text-green-700 dark:text-green-300">Saved.</div>
    </div>

    <div v-if="privacyError" class="text-sm text-red-700 dark:text-red-300">
      {{ privacyError }}
    </div>
  </div>
</template>

<script setup lang="ts">
type FollowVisibility = 'all' | 'verified' | 'premium' | 'none'
type BirthdayVisibility = 'none' | 'monthDay' | 'full'

defineProps<{
  followVisibilityInput: FollowVisibility
  birthdayVisibilityInput: BirthdayVisibility
  followVisibilityOptions: Array<{ label: string; value: FollowVisibility }>
  birthdayVisibilityOptions: Array<{ label: string; value: BirthdayVisibility }>
  privacySaving: boolean
  privacyDirty: boolean
  privacySaved: boolean
  privacyError: string | null
}>()

defineEmits<{
  (e: 'update:followVisibilityInput', value: FollowVisibility): void
  (e: 'update:birthdayVisibilityInput', value: BirthdayVisibility): void
  (e: 'save'): void
}>()
</script>

