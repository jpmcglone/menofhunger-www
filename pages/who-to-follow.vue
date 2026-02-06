<template>
  <div class="w-full">
    <div class="py-4 space-y-4">
      <div class="px-4 flex items-center justify-between gap-3">
        <p class="text-sm moh-text-muted">
          Suggestions based on who people you follow follow, plus a small fallback mix.
        </p>
        <Button
          label="Refresh"
          text
          severity="secondary"
          :loading="loading"
          :disabled="loading"
          @click="refresh({ limit: 50 })"
        />
      </div>

      <div v-if="error" class="px-4">
        <AppInlineAlert severity="warning">
          {{ error }}
        </AppInlineAlert>
      </div>

      <div v-if="loading && users.length === 0" class="flex justify-center py-12">
        <AppLogoLoader />
      </div>

      <!-- Edge-to-edge list -->
      <div v-else-if="users.length > 0" class="space-y-0">
        <div class="space-y-0">
          <AppUserRow
            v-for="u in users"
            :key="u.id"
            :user="u"
            :show-follow-button="true"
          />
        </div>
      </div>

      <div v-else class="px-4">
        <div class="rounded-xl border moh-border bg-gray-50/50 dark:bg-zinc-900/30 px-4 py-6 text-center">
          <p class="text-sm moh-text-muted">
            No suggestions yet — try following a few people first.
          </p>
          <div class="mt-3">
            <NuxtLink to="/explore" class="font-medium hover:underline">
              Explore
            </NuxtLink>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'app',
  title: 'Who to follow',
})

usePageSeo({
  title: 'Who to follow',
  description: 'Suggested people to follow on Men of Hunger.',
  canonicalPath: '/who-to-follow',
  noindex: true,
  ogType: 'website',
  image: '/images/banner.png',
})

const { users, loading, error, refresh } = useWhoToFollow()

onMounted(() => {
  void refresh({ limit: 50 })
})
</script>

