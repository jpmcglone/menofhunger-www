<template>
  <div class="px-4">
    <AppPageHeader :title="title" :icon="icon" :description="description">
      <template #leading>
        <Button
          text
          severity="secondary"
          aria-label="Back to user overview"
          @click="navigateTo(`/admin/users/${encodedUsername}`)"
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
        label="View public profile"
        size="small"
        severity="secondary"
        outlined
        @click="navigateTo(`/u/${encodedUsername}`)"
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

