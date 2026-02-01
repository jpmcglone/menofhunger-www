<template>
  <div>
    <NuxtLoadingIndicator :color="loadingIndicatorColor" :height="4" />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </div>
</template>

<script setup lang="ts">
import { primaryColor500ForUser } from '~/utils/theme-tint'

const { user } = useAuth()
const loadingIndicatorColor = computed(() => primaryColor500ForUser(user.value ?? null))
</script>
