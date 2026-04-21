<template>
  <div class="px-4">
    <AppPageHeader :title="title" :icon="icon" :description="description">
      <template #leading>
        <Button
          as="NuxtLink"
          :to="`/admin/users/${encodedUsername}`"
          text
          severity="secondary"
          aria-label="Back to user overview"
        >
          <template #icon>
            <Icon name="tabler:chevron-left" aria-hidden="true" />
          </template>
        </Button>
      </template>
    </AppPageHeader>
    <div class="mt-2">
      <Button
        v-if="username"
        as="NuxtLink"
        :to="`/u/${encodedUsername}`"
        label="View public profile"
        size="small"
        severity="secondary"
        outlined
      />
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  title: string
  icon?: string
  description?: string
  username: string
}>()

const encodedUsername = computed(() => encodeURIComponent(props.username))
</script>

