<template>
  <AppPageContent bottom="standard">
  <div class="w-full">
    <div class="py-4 space-y-6">

      <!-- Arena-based suggestions row (only for authed users with interests) -->
      <section v-if="arenaUsers.length > 0" class="space-y-2">
        <div class="px-4 flex items-center justify-between gap-3">
          <div>
            <div class="text-sm font-semibold moh-text">Men in your arenas</div>
            <div class="text-xs moh-text-muted mt-0.5">
              Based on shared interests{{ arenaLabel ? ` · ${arenaLabel} and more` : '' }}
            </div>
          </div>
        </div>
        <div class="space-y-0">
          <AppUserRow
            v-for="u in arenaUsers"
            :key="u.id"
            :user="u"
            :show-follow-button="true"
            allow-logged-out-follow-button
            @followed="arenaFollows.removeUserById(u.id)"
          />
        </div>
      </section>

      <!-- Standard suggestions -->
      <section class="space-y-2">
        <div class="px-4 flex items-center justify-between gap-3">
          <div>
            <div v-if="arenaUsers.length > 0" class="text-sm font-semibold moh-text">More suggestions</div>
            <p v-else class="text-sm moh-text-muted">
              Suggestions based on who people you follow follow, plus a small fallback mix.
            </p>
          </div>
          <Button
            label="Refresh"
            text
            severity="secondary"
            :loading="loading"
            :disabled="loading"
            @click="refresh({ limit: 50, force: true })"
          />
        </div>

        <div v-if="error" class="px-4">
          <AppInlineAlert severity="warning">
            {{ error }}
          </AppInlineAlert>
        </div>

        <AppSubtleSectionLoader :loading="showInitialLoader" min-height-class="min-h-[220px]">
          <div v-if="users.length > 0" class="space-y-0 transition-opacity duration-150">
            <AppUserRow
              v-for="u in users"
              :key="u.id"
              :user="u"
              :show-follow-button="true"
              allow-logged-out-follow-button
            />
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
        </AppSubtleSectionLoader>
      </section>
    </div>
  </div>
  </AppPageContent>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'app',
  title: 'Who to follow',
  ssr: false,
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
const arenaFollows = useArenaFollowSuggestions({ limit: 6 })
const arenaUsers = arenaFollows.users
const arenaLabel = arenaFollows.arenaLabel

const showInitialLoader = computed(() => loading.value && users.value.length === 0)

onMounted(() => {
  void refresh({ limit: 50 })
})
</script>
