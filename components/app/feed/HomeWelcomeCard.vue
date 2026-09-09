<template>
  <div v-if="!dismissed" class="px-3 pt-3 pb-1 sm:px-4 sm:pt-4">
    <!-- Figma: YnuRSJB7p90n9jEY4mb4RN / 321:3, mobile 321:10019. -->
    <section class="welcome-card moh-text" aria-label="Getting started">
      <div v-if="completedCount === 2" class="welcome-complete" aria-live="polite">
        <div>
          <p class="welcome-eyebrow">Getting started · Complete</p>
          <h2 class="mt-2 text-2xl font-semibold">Day one is in the books.</h2>
          <p class="mt-2 text-sm moh-text-muted">Your feed is taking shape. Your streak has started.</p>
        </div>
        <button type="button" class="welcome-button welcome-primary" @click="dismiss">Back to your feed</button>
      </div>
      <template v-else>
        <header class="welcome-header">
          <div class="flex items-center justify-between gap-3">
            <p class="welcome-eyebrow">Welcome to Men of Hunger</p>
            <button type="button" class="welcome-close" aria-label="Dismiss getting started" @click="dismiss">
              <Icon name="tabler:x" class="size-4" aria-hidden="true" />
            </button>
          </div>
          <div>
            <h2 class="welcome-title"><span class="welcome-desktop-intro">You’re in. </span>Make it count.</h2>
            <p class="mt-2 text-[15px] leading-[22px] moh-text-muted">{{ subtitle }}</p>
          </div>
          <div class="flex items-center gap-3" role="progressbar" aria-label="Getting started" :aria-valuenow="completedCount" :aria-valuemin="0" :aria-valuemax="2">
            <div class="flex flex-1 gap-1.5" aria-hidden="true">
              <span class="welcome-progress" :class="{ 'is-complete': progress.followed }" />
              <span class="welcome-progress" :class="{ 'is-complete': progress.posted }" />
            </div>
            <span class="text-[13px] moh-text-muted" aria-live="polite">{{ completedCount }} of 2 complete</span>
          </div>
        </header>
        <div class="welcome-steps">
          <section class="welcome-step">
            <div class="flex items-center gap-3">
              <span class="text-[13px] moh-text-soft" aria-hidden="true">{{ progress.followed ? '✓' : '01' }}</span>
              <h3 class="text-xl leading-7 font-semibold">{{ progress.followed ? 'Your feed is taking shape.' : 'Find your people.' }}</h3>
            </div>
            <p class="welcome-follow-hint text-[15px] leading-[22px] moh-text-muted">A good feed starts with people worth following.</p>
            <div v-if="wtfLoading && !wtfUsers.length" class="space-y-4" role="status" aria-label="Loading suggestions">
              <div v-for="n in 2" :key="n" class="h-11 rounded-xl moh-surface-2 motion-safe:animate-pulse" />
            </div>
            <div v-else-if="wtfError" role="status" class="text-sm moh-text-muted">
              Couldn’t load suggestions.
              <button type="button" class="welcome-button" @click="refreshSuggestions({ force: true })">Try again</button>
            </div>
            <div v-else-if="wtfUsers.length" class="space-y-4">
              <AppFeedHomeWelcomePersonRow v-for="person in wtfUsers.slice(0, 2)" :key="person.id" :user="person" @followed="record({ followed: true })" />
            </div>
            <NuxtLink to="/who-to-follow" class="welcome-more">See all suggestions <span aria-hidden="true">→</span></NuxtLink>
          </section>
          <section class="welcome-step">
            <div class="flex items-center gap-3">
              <span class="text-[13px] moh-text-soft" aria-hidden="true">{{ progress.posted ? '✓' : '02' }}</span>
              <h3 class="text-xl leading-7 font-semibold">{{ !isVerified ? VOICE.welcome.step2HeadingVerify : progress.posted ? 'Your streak has started.' : 'Show up today.' }}</h3>
            </div>
            <p class="text-[15px] leading-[22px] moh-text-muted">{{ !isVerified ? VOICE.welcome.step2BodyVerify : 'A post, a reply, or a daily check-in starts your streak.' }}</p>
            <template v-if="isVerified">
              <div class="welcome-week" role="img" :aria-label="progress.posted ? 'First activity complete. Keep showing up each day.' : 'Your first week: day one is pending; days two to seven are ahead.'">
                <span v-for="day in 7" :key="day" :class="{ today: day === 1, done: day === 1 && progress.posted }" aria-hidden="true">{{ day === 1 && progress.posted ? '✓' : day }}</span>
              </div>
              <p class="text-[13px] moh-text-muted">{{ progress.posted ? 'Come back tomorrow. Keep it going.' : 'Day one starts with you.' }}</p>
              <button v-if="showCheckinCta && checkinPrompt && !progress.posted" type="button" class="welcome-prompt" @click="$emit('check-in')">
                <AppCheckinPromptContext :prompt="checkinPrompt" compact />
                <span class="shrink-0 text-sm font-semibold">Answer →</span>
              </button>
            </template>
          </section>
        </div>
        <footer class="welcome-actions">
          <button type="button" class="welcome-button welcome-explore" @click="dismiss">I’ll explore first</button>
          <NuxtLink v-if="!isVerified" to="/verification" class="welcome-button welcome-primary">Get verified</NuxtLink>
          <button v-else type="button" class="welcome-button welcome-primary" @click="$emit('compose')">{{ progress.posted ? 'Write a post' : 'Write your first post' }}</button>
        </footer>
        <div v-if="syncError" class="px-6 pb-4 text-xs moh-text-muted" role="status">Couldn’t refresh progress. <button type="button" class="min-h-11 underline" @click="sync">Try again</button></div>
      </template>
    </section>
  </div>
</template>

<script setup lang="ts">
import AppCheckinPromptContext from '~/components/app/CheckinPromptContext.vue'
import { VOICE } from '~/config/voice'
const props = defineProps<{ showCheckinCta?: boolean; checkinPrompt?: string; hasPosted?: boolean }>()
defineEmits<{ 'check-in': []; compose: [] }>()
const { isVerified, isPremium, isPremiumPlus } = useAuth()
const { dismissed, progress, completedCount, syncError, sync, record, dismiss } = useWelcomeCard()
const enabled = computed(() => !dismissed.value && completedCount.value < 2)
const { users: wtfUsers, loading: wtfLoading, error: wtfError, refresh: refreshSuggestions } = useWhoToFollow({ enabled, defaultLimit: 2 })
watch(() => props.hasPosted, posted => { if (posted) record({ posted: true }) }, { immediate: true })
const subtitle = computed(() => {
  if (isPremiumPlus.value) return 'Full access. Your first day starts here.'
  if (isPremium.value) return 'Premium access. Your first day starts here.'
  if (isVerified.value) return 'You’re verified. Your first day starts here.'
  return 'Find your people. Show up. Start here.'
})
</script>

<style scoped>
.welcome-card { container-type: inline-size; overflow: hidden; border: 1px solid var(--moh-border); border-radius: 24px; background: var(--moh-bg); }
.welcome-header { display: grid; gap: 16px; padding: 20px 24px 24px; border-bottom: 1px solid var(--moh-border); }
.welcome-eyebrow { font-size: 12px; line-height: 16px; font-weight: 600; letter-spacing: .08em; text-transform: uppercase; color: var(--moh-text-muted); }
.welcome-close { display: grid; place-items: center; flex-shrink: 0; width: 44px; height: 44px; border-radius: 50%; }
.welcome-title { font-size: 28px; line-height: 36px; font-weight: 700; text-wrap: balance; }
.welcome-desktop-intro, .welcome-follow-hint { display: none; }
.welcome-progress { flex: 1; height: 3px; border-radius: 2px; background: var(--moh-border); }
.welcome-progress.is-complete { background: var(--moh-brass); }
.welcome-step { display: flex; min-width: 0; flex-direction: column; gap: 16px; padding: 24px; }
.welcome-step + .welcome-step { border-top: 1px solid var(--moh-border); }
.welcome-more { display: flex; align-items: center; gap: 8px; min-height: 44px; font-size: 15px; font-weight: 600; }
.welcome-week { display: flex; gap: 8px; }
.welcome-week span { display: grid; place-items: center; width: 36px; max-width: calc((100cqw - 96px) / 7); height: 36px; border-radius: 50%; background: var(--moh-surface); color: var(--moh-text-soft); font-size: 13px; }
.welcome-week .today { background: var(--moh-surface-2); border: 1px solid var(--moh-brass); color: var(--moh-text); }
.welcome-week .done { background: var(--moh-brass); color: white; }
.welcome-actions { display: flex; flex-direction: column-reverse; gap: 12px; padding: 8px 24px 24px; }
.welcome-button { display: inline-flex; justify-content: center; align-items: center; min-height: 46px; padding: 12px 20px; border-radius: 999px; font-size: 15px; font-weight: 600; }
.welcome-primary { background: var(--moh-text); color: var(--moh-bg); }
.welcome-complete { display: flex; flex-direction: column; gap: 24px; padding: 24px; }
.welcome-prompt { display: flex; flex-direction: column; align-items: flex-start; gap: 16px; text-align: left; min-height: 44px; color: var(--moh-checkin); }
button:focus-visible, a:focus-visible { outline: 2px solid var(--moh-brass); outline-offset: 3px; }
.welcome-close:hover, .welcome-explore:hover { background: var(--moh-surface-2); }
@container (min-width: 760px) {
  .welcome-header { padding-inline: 32px; }
  .welcome-title { font-size: 48px; line-height: 56px; }
  .welcome-desktop-intro { display: inline; }
  .welcome-follow-hint { display: block; }
  .welcome-steps { display: grid; grid-template-columns: 1fr 1fr; }
  .welcome-step { padding-inline: 32px; }
  .welcome-step + .welcome-step { border-top: 0; border-left: 1px solid var(--moh-border); }
  .welcome-actions { flex-direction: row; justify-content: space-between; padding: 24px 32px; }
  .welcome-complete { flex-direction: row; align-items: center; justify-content: space-between; padding: 32px; }
}
</style>
