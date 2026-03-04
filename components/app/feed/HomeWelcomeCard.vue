<template>
  <Transition
    enter-active-class="transition-all duration-300 ease-out"
    enter-from-class="opacity-0 -translate-y-1"
    enter-to-class="opacity-100 translate-y-0"
    leave-active-class="transition-all duration-200 ease-in"
    leave-from-class="opacity-100 translate-y-0"
    leave-to-class="opacity-0 -translate-y-1"
  >
    <div v-if="!dismissed" class="px-3 pt-3 pb-1 sm:px-4 sm:pt-4">
      <div class="rounded-2xl border moh-border moh-surface overflow-hidden">

        <!-- Header -->
        <div class="px-4 pt-4 pb-3 flex items-start justify-between gap-3">
          <div>
            <div class="text-base font-bold moh-text leading-snug">Welcome to Men of Hunger.</div>
            <div class="mt-0.5 text-sm moh-text-muted">{{ subtitle }}</div>
          </div>
          <button
            type="button"
            class="shrink-0 mt-0.5 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors moh-text-muted"
            aria-label="Dismiss"
            @click="dismiss"
          >
            <Icon name="tabler:x" class="text-sm" aria-hidden="true" />
          </button>
        </div>

        <div class="h-px moh-divide" />

        <!-- Step 1: Follow people -->
        <div class="px-4 py-3">
          <div class="flex items-center gap-2 mb-2.5">
            <div class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100 dark:bg-zinc-800 text-[11px] font-bold moh-text-muted">1</div>
            <div class="text-sm font-semibold moh-text">Follow a few members</div>
          </div>

          <div v-if="wtfLoading && wtfUsers.length === 0" class="flex justify-center py-3">
            <AppLogoLoader compact />
          </div>

          <div v-else-if="wtfUsers.length > 0" class="space-y-0">
            <AppWhoToFollowCompactRow
              v-for="u in wtfUsers.slice(0, 4)"
              :key="u.id"
              :user="u"
              @followed="onFollowed(u.id)"
            />
          </div>

          <NuxtLink
            to="/who-to-follow"
            class="mt-2 inline-flex items-center gap-1 text-xs font-medium moh-text-muted hover:underline underline-offset-2"
          >
            See all suggestions
            <Icon name="tabler:arrow-right" class="text-[10px]" aria-hidden="true" />
          </NuxtLink>
        </div>

        <div class="h-px moh-divide" />

        <!-- Step 2: Unverified — get verified first -->
        <div v-if="!isVerified" class="px-4 py-3">
          <div class="flex items-center gap-2 mb-2">
            <div class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100 dark:bg-zinc-800 text-[11px] font-bold moh-text-muted">2</div>
            <div class="text-sm font-semibold moh-text">Verify your identity</div>
          </div>
          <p class="text-xs moh-text-muted leading-relaxed">
            Men of Hunger is identity-verified. Verification unlocks public posting, daily check-ins, and posting streaks.
          </p>
          <div class="mt-3">
            <Button label="Get verified" size="small" severity="secondary" rounded @click="navigateTo('/verification')">
              <template #icon>
                <Icon name="tabler:shield-check" aria-hidden="true" />
              </template>
            </Button>
          </div>
        </div>

        <!-- Step 2: Verified — post daily and build a streak -->
        <div v-else class="px-4 py-3">
          <div class="flex items-center gap-2 mb-2">
            <div class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100 dark:bg-zinc-800 text-[11px] font-bold moh-text-muted">2</div>
            <div class="text-sm font-semibold moh-text">Post every day to build your streak</div>
          </div>
          <p class="text-xs moh-text-muted leading-relaxed">
            <template v-if="isPremium">
              Any post — text, photos, video, or a daily check-in — keeps your streak alive. Post consistently to earn coins and unlock milestone badges.
            </template>
            <template v-else>
              Any post — a reply, a thought, or a daily check-in — keeps your streak alive. Post consistently to earn coins and unlock milestone badges.
            </template>
          </p>

          <!-- Today's check-in prompt embed (only when user hasn't posted today) -->
          <div
            v-if="showCheckinCta"
            class="mt-3 flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5"
            style="background-color: var(--moh-checkin-soft); border-color: rgba(var(--moh-checkin-rgb), 0.3)"
          >
            <div class="min-w-0">
              <div class="text-xs font-semibold" style="color: var(--moh-checkin)">Today's prompt</div>
              <div class="mt-0.5 text-xs moh-text leading-snug line-clamp-2">{{ checkinPrompt }}</div>
            </div>
            <Button
              label="Check in"
              size="small"
              rounded
              class="shrink-0 !h-7 !min-h-7 !px-2.5 !py-0 !text-xs !leading-none whitespace-nowrap moh-btn-scope moh-btn-tone"
              @click="$emit('check-in')"
            />
          </div>
        </div>

        <!-- Footer -->
        <div class="h-px moh-divide" />
        <div class="px-4 py-3 flex justify-end">
          <Button label="I'm all set" severity="secondary" size="small" rounded @click="dismiss">
            <template #icon>
              <Icon name="tabler:arrow-right" aria-hidden="true" />
            </template>
          </Button>
        </div>

      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
defineProps<{
  showCheckinCta?: boolean
  checkinPrompt?: string
}>()

defineEmits<{
  (e: 'check-in'): void
}>()

const { isVerified, isPremium, isPremiumPlus } = useAuth()
const { dismissed, dismiss } = useWelcomeCard()

const subtitle = computed(() => {
  if (isPremiumPlus.value) return "You have full access. Here's how to get started."
  if (isPremium.value) return "You have Premium access. Here's how to get started."
  if (isVerified.value) return "You're verified. Here's how to get the most out of it."
  return "Here's how to get started."
})

const followedCount = ref(0)

const { users: wtfUsers, loading: wtfLoading, removeUserById: wtfRemoveUser } = useWhoToFollow({ defaultLimit: 4 })

function onFollowed(userId: string) {
  wtfRemoveUser(userId)
  followedCount.value++
  if (followedCount.value >= 3) {
    setTimeout(() => dismiss(), 600)
  }
}
</script>
