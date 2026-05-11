<template>
  <Transition
    enter-active-class="transition-[opacity,transform] duration-300 ease-out"
    enter-from-class="opacity-0 -translate-y-1"
    enter-to-class="opacity-100 translate-y-0"
    leave-active-class="transition-[opacity,transform] duration-200 ease-in"
    leave-from-class="opacity-100 translate-y-0"
    leave-to-class="opacity-0 -translate-y-1"
  >
    <div v-if="!dismissed" class="px-3 pt-3 pb-1 sm:px-4 sm:pt-4">
      <div class="rounded-2xl border moh-border moh-surface overflow-hidden">

        <!-- Header -->
        <div class="px-4 pt-4 pb-3 flex items-start justify-between gap-3">
          <div>
            <div class="text-base font-bold moh-text leading-snug">{{ VOICE.welcome.heading }}</div>
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

        <div class="h-px bg-black/6 dark:bg-white/6" />

        <!-- Step 1: Follow people -->
        <div class="px-4 py-3">
          <div class="flex items-center gap-2 mb-2.5">
            <div class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gray-100 dark:bg-zinc-800 text-[11px] font-black moh-text-muted">1</div>
            <div class="text-sm font-semibold moh-text">{{ VOICE.welcome.step1Heading }}</div>
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
            class="mt-2 flex items-center justify-between gap-2 group"
          >
            <span class="text-xs font-medium moh-text-muted group-hover:moh-text transition-colors">See all suggestions</span>
            <Icon name="tabler:chevron-right" class="text-[10px] moh-text-muted shrink-0" aria-hidden="true" />
          </NuxtLink>
        </div>

        <div class="h-px bg-black/6 dark:bg-white/6" />

        <!-- Step 2: Unverified — get verified first -->
        <div v-if="!isVerified" class="px-4 py-3">
          <div class="flex items-center gap-2 mb-2">
            <div class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gray-100 dark:bg-zinc-800 text-[11px] font-black moh-text-muted">2</div>
            <div class="text-sm font-semibold moh-text">{{ VOICE.welcome.step2HeadingVerify }}</div>
          </div>
          <p class="text-xs moh-text-muted leading-relaxed">
            {{ VOICE.welcome.step2BodyVerify }}
          </p>
          <div class="mt-3">
            <Button as="NuxtLink" to="/verification" label="Get verified" size="small" rounded>
              <template #icon>
                <Icon name="tabler:shield-check" aria-hidden="true" />
              </template>
            </Button>
          </div>
        </div>

        <!-- Step 2: Verified — post daily and build a streak -->
        <div v-else class="px-4 py-3">
          <div class="flex items-center gap-2 mb-2">
            <div class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gray-100 dark:bg-zinc-800 text-[11px] font-black moh-text-muted">2</div>
            <div class="text-sm font-semibold moh-text">{{ VOICE.welcome.step2HeadingStreak }}</div>
          </div>
          <p class="text-xs moh-text-muted leading-relaxed">
            {{ VOICE.welcome.step2BodyStreak }}
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
        <div class="h-px bg-black/6 dark:bg-white/6" />
        <div class="px-4 py-3 flex justify-end">
          <Button :label="VOICE.welcome.dismiss" severity="secondary" size="small" rounded @click="dismiss">
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
import { VOICE } from '~/config/voice'

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
  if (isPremiumPlus.value) return VOICE.welcome.subtitleFullAccess
  if (isPremium.value) return VOICE.welcome.subtitlePremium
  if (isVerified.value) return VOICE.welcome.subtitleVerified
  return VOICE.welcome.subtitleDefault
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
