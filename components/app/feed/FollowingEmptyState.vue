<template>
  <div class="px-3 sm:px-4 mt-4 space-y-3">
    <!-- Who to Follow -->
    <div class="rounded-xl border moh-border moh-surface p-4">
      <div class="text-sm font-semibold moh-text mb-3">
        Follow a few members to fill your feed
      </div>

      <div v-if="wtfLoading && wtfUsers.length === 0" class="flex justify-center py-4">
        <AppLogoLoader compact />
      </div>

      <div v-else-if="wtfUsers.length > 0" class="space-y-0">
        <AppWhoToFollowCompactRow
          v-for="u in wtfUsers.slice(0, 3)"
          :key="u.id"
          :user="u"
          @followed="() => wtfRemoveUser(u.id)"
        />
      </div>

      <NuxtLink
        to="/who-to-follow"
        class="mt-3 inline-flex items-center gap-1 text-sm font-medium hover:underline underline-offset-2 moh-text-muted"
      >
        See all suggestions
        <Icon name="tabler:arrow-right" class="text-xs" aria-hidden="true" />
      </NuxtLink>
    </div>

    <!-- Check-in CTA (only for verified users who haven't checked in today) -->
    <div v-if="showCheckinCta" class="rounded-xl border px-4 py-3" style="background-color: var(--moh-checkin-soft); border-color: rgba(var(--moh-checkin-rgb), 0.3)">
      <div class="flex items-center gap-3">
        <div
          class="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl"
          style="background-color: rgba(var(--moh-checkin-rgb), 0.18)"
        >
          <Icon name="tabler:calendar-check" class="text-sm" aria-hidden="true" style="color: var(--moh-checkin)" />
        </div>
        <div class="flex-1 min-w-0">
          <div class="text-sm font-semibold moh-text">Check in today</div>
          <div class="text-xs moh-text-muted mt-0.5">Join the brotherhood — share how today is going.</div>
        </div>
        <Button
          label="Check in"
          size="small"
          rounded
          class="shrink-0 !h-8 !min-h-8 !px-3 !py-0 !text-xs !leading-none whitespace-nowrap moh-btn-scope moh-btn-tone"
          @click="$emit('check-in')"
        />
      </div>
    </div>

    <!-- Verified: make your first post -->
    <div v-if="isVerified" class="rounded-xl border moh-border moh-surface p-4">
      <div class="flex items-center gap-3">
        <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gray-100 dark:bg-zinc-800">
          <Icon name="tabler:pencil" class="text-sm moh-text-muted" aria-hidden="true" />
        </div>
        <div class="flex-1 min-w-0">
          <div class="text-sm font-semibold moh-text">Post something</div>
          <div class="text-xs moh-text-muted mt-0.5">Share what's on your mind with the community.</div>
        </div>
        <Button
          label="Post"
          size="small"
          severity="secondary"
          rounded
          class="shrink-0 !h-8 !min-h-8 !px-3 !py-0 !text-xs !leading-none whitespace-nowrap"
          @click="$emit('find-people')"
        />
      </div>
    </div>

    <!-- Unverified: get verified to unlock posting & streaks -->
    <div v-else class="rounded-xl border moh-border moh-surface p-4">
      <div class="flex items-center gap-3">
        <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gray-100 dark:bg-zinc-800">
          <Icon name="tabler:shield-check" class="text-sm moh-text-muted" aria-hidden="true" />
        </div>
        <div class="flex-1 min-w-0">
          <div class="text-sm font-semibold moh-text">Verify your identity</div>
          <div class="text-xs moh-text-muted mt-0.5">Unlock public posting, daily check-ins, and posting streaks.</div>
        </div>
        <Button
          label="Verify"
          size="small"
          severity="secondary"
          rounded
          class="shrink-0 !h-8 !min-h-8 !px-3 !py-0 !text-xs !leading-none whitespace-nowrap"
          @click="navigateTo('/verification')"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  followingCount: number | null
  showCheckinCta?: boolean
}>()

defineEmits<{
  (e: 'find-people'): void
  (e: 'check-in'): void
}>()

const { isVerified } = useAuth()
const { users: wtfUsers, loading: wtfLoading, removeUserById: wtfRemoveUser } = useWhoToFollow({ defaultLimit: 3 })
</script>
