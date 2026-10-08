<template>
  <AppPageContent bottom="standard" class="relative">
    <AppRefreshIndicator :loading="(loading && !loadingInitial) || (recentLoading && !recentLoadingInitial)" />
  <div class="w-full">
    <div class="px-4 pt-4 pb-0 sm:pb-6">
      <h1 class="flex items-center gap-2 text-xl font-bold tracking-tight text-green-600 dark:text-green-400">
        <span class="relative flex h-3 w-3 shrink-0" aria-hidden="true">
          <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-75" />
          <span class="relative inline-flex h-3 w-3 rounded-full bg-green-500" />
        </span>
        Online now
      </h1>
      <p class="mt-1 flex flex-wrap items-baseline text-sm text-gray-600 dark:text-gray-300">
        <span v-if="displayTotal !== null">{{ displayTotal }} {{ displayTotal === 1 ? 'person is' : 'people are' }} online now.</span>
        <span v-else>People currently active or recently around. Updates in real time.</span>
        <span
          v-if="anonymousOnline !== null && anonymousOnline > 0"
          class="moh-text-soft"
        > +{{ anonymousOnline }} {{ anonymousOnline === 1 ? 'guest' : 'guests' }}</span>
        <NuxtLink
          :to="{ path: '/map', query: { online: '1' } }"
          class="ml-auto font-semibold text-[var(--moh-link)] hover:underline underline-offset-2"
        >
          {{ membersVisible ? "See who's where" : 'See where' }}
        </NuxtLink>
      </p>
    </div>

    <!-- Signed-out and unverified viewers: the numbers, never names or faces. -->
    <section v-if="!membersVisible" class="border-t moh-border">
      <div class="moh-gutter-x py-8 text-center sm:text-left">
        <p class="text-6xl font-bold tabular-nums tracking-tight moh-text">{{ formatCount(displayTotal ?? 0) }}</p>
        <p class="mt-1 text-base font-medium moh-text-muted">{{ displayTotal === 1 ? 'man is' : 'men are' }} online right now</p>
        <p v-if="displayGuests > 0" class="mt-3 text-sm moh-text-soft">
          Plus {{ formatCount(displayGuests) }} {{ displayGuests === 1 ? 'guest' : 'guests' }} browsing.
        </p>
      </div>
      <div class="moh-gutter-x border-t moh-border bg-[rgba(var(--moh-brass-rgb),0.05)] py-5">
        <AppMembersLockedCta title="See who's online" />
      </div>
    </section>

    <div v-else-if="error" class="px-4">
      <AppInlineAlert severity="danger">
        {{ error }}
      </AppInlineAlert>
    </div>

    <div v-else-if="loadingInitial" class="px-4 py-8 flex justify-center">
      <AppLogoLoader />
    </div>

    <div v-else-if="users.length === 0" class="px-4 py-6 text-sm text-gray-500 dark:text-gray-400">
      No one here right now.
    </div>

    <TransitionGroup
      v-else
      name="online-users-list"
      tag="div"
      class="moh-divide transition-opacity duration-150"
    >
      <AppUserRow show-presence v-for="u in users" :key="u.id" :user="u" :show-follow-button="true" :platforms="u.platforms" :in-call="u.inCall === true" />
    </TransitionGroup>

    <!-- Recently / older online (verified viewers only) -->
    <template v-if="membersVisible && viewerCanSeeLastOnline">
      <div
        class="px-4"
        :class="recentlyOnlineUsers.length ? 'pt-8 pb-2' : 'pt-5 pb-3'"
      >
        <h2 class="text-base font-bold tracking-tight text-gray-900 dark:text-gray-50">
          Recently
        </h2>
        <p
          v-if="recentlyOnlineUsers.length"
          class="mt-1 text-sm text-gray-600 dark:text-gray-300"
        >
          Men who were online within the last hour.
        </p>
        <p
          v-else-if="!recentLoadingInitial && !recentError"
          class="mt-0.5 text-sm text-gray-500 dark:text-gray-400"
        >
          {{ recentUsers.length === 0 ? 'No one recently around.' : 'No one in the last hour.' }}
        </p>
      </div>

      <!-- Only take over the section when there is nothing to show. A failure while
           paginating keeps the rows already on screen and retries inline below. -->
      <div v-if="recentError && recentUsers.length === 0" class="px-4 pb-4">
        <AppInlineAlert severity="danger">
          {{ recentError }}
        </AppInlineAlert>
      </div>

      <div v-else-if="recentLoadingInitial" class="px-4 py-3 flex justify-center">
        <AppLogoLoader compact />
      </div>

      <template v-else-if="recentUsers.length > 0">
        <TransitionGroup
          v-if="recentlyOnlineUsers.length"
          name="online-users-list"
          tag="div"
          class="moh-divide transition-opacity duration-150"
        >
          <AppUserRow show-presence
            v-for="u in recentlyOnlineUsers"
            :key="u.id"
            :user="u"
            :show-follow-button="true"
            :name-meta="recentLastOnlineLabel(u.lastOnlineAt)"
          />
        </TransitionGroup>

        <div
          v-if="olderOnlineUsers.length"
          class="px-4 pb-2"
          :class="recentlyOnlineUsers.length ? 'pt-8' : 'pt-4'"
        >
          <h2 class="text-base font-bold tracking-tight text-gray-900 dark:text-gray-50">
            Older
          </h2>
          <p class="mt-1 text-sm text-gray-600 dark:text-gray-300">
            Men who were around earlier.
          </p>
        </div>

        <TransitionGroup
          v-if="olderOnlineUsers.length"
          name="online-users-list"
          tag="div"
          class="moh-divide transition-opacity duration-150"
        >
          <AppUserRow show-presence
            v-for="u in olderOnlineUsers"
            :key="u.id"
            :user="u"
            :show-follow-button="true"
            :name-meta="recentLastOnlineLabel(u.lastOnlineAt)"
          />
        </TransitionGroup>

        <!-- Auto-pagination sentinel. It sits one viewport ahead of the real bottom
             (useLoadMoreObserver's default rootMargin), so the next page is usually
             already in flight by the time the viewer gets there. -->
        <div
          v-if="recentNextCursor"
          class="relative flex justify-center items-center py-6 min-h-12"
        >
          <div
            ref="loadMoreSentinelEl"
            class="absolute bottom-0 left-0 right-0 h-px"
            aria-hidden="true"
          />
          <div v-if="recentLoadMoreFailed" class="flex flex-col items-center gap-2 px-4">
            <p class="text-sm text-gray-500 dark:text-gray-400">
              {{ recentError || 'Failed to load more.' }}
            </p>
            <Button label="Try again" severity="secondary" rounded @click="loadMoreRecent" />
          </div>
          <div
            v-else
            class="transition-opacity duration-150"
            :class="recentLoading ? 'opacity-100' : 'opacity-0 pointer-events-none'"
            :aria-hidden="!recentLoading"
          >
            <AppLogoLoader compact />
          </div>
        </div>
      </template>
    </template>
  </div>
  </AppPageContent>
</template>

<script setup lang="ts">
import { formatCount } from '~/utils/number-format'
import { useOnlinePage } from '~/composables/pages/useOnlinePage'

definePageMeta({
  layout: 'app',
  title: 'Online',
  hideTopBar: true,
})

const {
  recentLastOnlineLabel,
  loadMoreRecent,
  users,
  anonymousOnline,
  loading,
  error,
  displayTotal,
  displayGuests,
  viewerCanSeeLastOnline,
  recentlyOnlineUsers,
  olderOnlineUsers,
  recentLoadMoreFailed,
  loadMoreSentinelEl,
  loadingInitial,
  recentLoadingInitial,
  recentUsers,
  recentNextCursor,
  recentLoading,
  recentError,
  membersVisible,
} = await useOnlinePage()
</script>

<style scoped>
.online-users-list-enter-active,
.online-users-list-leave-active {
  transition: opacity 0.16s ease;
}

.online-users-list-enter-from,
.online-users-list-leave-to {
  opacity: 0;
}

.online-users-list-move {
  transition: transform 0.2s ease;
}
</style>
