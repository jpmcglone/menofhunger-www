<template>
  <!-- Figma: YnuRSJB7p90n9jEY4mb4RN / 840:161 (shared guide), 841:275 (approved). -->
  <section v-if="!dismissed" class="activation-guide moh-text" aria-label="Getting started">
    <p class="text-[13px] uppercase moh-text-muted">{{ approved ? 'Your first days here' : 'Getting started' }}</p>
    <h2 class="text-[28px] leading-9 font-semibold">{{ heading }}</h2>
    <p class="text-[15px] leading-[22px] moh-text-muted">{{ summary }}</p>
    <p v-if="progress" class="text-[13px] moh-text-muted" aria-live="polite">{{ completedCount }} of {{ approved ? 3 : 2 }} complete</p>
    <p v-else-if="!syncError" class="text-sm moh-text-muted" role="status">Loading your progress…</p>
    <div v-if="syncError" class="text-sm moh-text-muted" role="status">
      Couldn’t refresh progress. <button type="button" class="min-h-11 underline" @click="sync">Try again</button>
    </div>
    <template v-if="progress">
      <section v-for="(step, index) in steps" :key="step.title" class="space-y-2">
        <h3 class="text-[15px] leading-[22px] font-semibold">{{ step.done ? '✓' : `0${index + 1}` }} · {{ step.title }}</h3>
        <p class="text-[15px] leading-[22px] moh-text-muted">{{ step.body }}</p>
      </section>
      <template v-if="!approved && !progress.followed">
        <div v-if="wtfLoading && !wtfUsers.length" role="status" class="text-sm moh-text-muted">Loading suggestions…</div>
        <div v-else-if="wtfError" class="text-sm moh-text-muted" role="status">Couldn’t load suggestions. <button class="min-h-11 underline" @click="refreshSuggestions({ force: true })">Try again</button></div>
        <AppFeedHomeWelcomePersonRow v-for="person in wtfUsers.slice(0, 2)" :key="person.id" :user="person" @followed="sync" />
        <NuxtLink to="/who-to-follow" class="min-h-11 flex items-center font-semibold" @click="track('onboarding_action_clicked', 'find_people')">See all suggestions →</NuxtLink>
      </template>
      <button v-if="approved && showCheckinCta && checkinPrompt && !progress.contributed" type="button" class="text-left min-h-11" @click="track('onboarding_action_clicked', 'checkin'); $emit('check-in')">
        <AppCheckinPromptContext :prompt="checkinPrompt" compact />
        <span class="font-semibold">Answer →</span>
      </button>
      <NuxtLink v-if="primaryHref" :to="primaryHref" class="guide-button guide-primary" @click="track('onboarding_action_clicked', primaryAction)">{{ primaryTitle }}</NuxtLink>
      <button v-else type="button" class="guide-button guide-primary" @click="primaryClick">{{ primaryTitle }}</button>
    </template>
    <button type="button" class="guide-button" @click="dismiss">I’ll explore first</button>
  </section>
</template>

<script setup lang="ts">
import AppCheckinPromptContext from '~/components/app/CheckinPromptContext.vue'
const props = defineProps<{ showCheckinCta?: boolean; checkinPrompt?: string; hasPosted?: boolean }>()
const emit = defineEmits<{ 'check-in': []; compose: [] }>()
const { progress, phase, dismissed, completedCount, syncError, sync, dismiss, track } = useActivationGuide()
const approved = computed(() => phase.value === 'approved')
const enabled = computed(() => !dismissed.value && !approved.value && progress.value?.followed === false)
const { users: wtfUsers, loading: wtfLoading, error: wtfError, refresh: refreshSuggestions } = useWhoToFollow({ enabled, defaultLimit: 2 })
watch(() => props.hasPosted, () => { void sync() })
const heading = computed(() => !approved.value ? progress.value?.verificationPending ? 'Your request is in.' : 'Find your people.'
  : completedCount.value === 3 ? 'You’ve made a start.' : !progress.value?.contributed ? 'You’re approved. Join in.'
    : !progress.value.replied ? 'Keep the conversation going.' : 'A reason to return.')
const summary = computed(() => !approved.value ? progress.value?.verificationPending
  ? 'An admin will contact you here to arrange your video call.' : 'Request verification to join the conversation. Explore while you wait.'
  : completedCount.value === 3 ? 'Keep the conversations going. Your next step is yours.'
    : !progress.value?.contributed ? 'Start a conversation. Give another man a reason to reply.'
      : !progress.value.replied ? 'You’ve taken the first step. Make a connection with another man.' : 'Read your replies and keep showing up for each other.')
const steps = computed(() => approved.value ? [
  { title: 'Share what you’re working on', body: 'A post, reply, or check-in is a good place to start.', done: progress.value?.contributed },
  { title: 'Reply to another man', body: 'Ask a question, offer encouragement, or share your experience.', done: progress.value?.replied },
  { title: 'Come back and follow through', body: 'Participate on another day. Tell us how it went.', done: progress.value?.returned },
] : [
  { title: progress.value?.verificationRequested ? 'Verification requested' : 'Request verification', body: 'Meet an admin in a video call here in the app.', done: progress.value?.verificationRequested },
  { title: 'Find your people', body: 'Explore beyond your starter follows. Choose men whose conversations resonate with you.', done: progress.value?.followed },
])
const primaryAction = computed(() => !approved.value ? 'verification' : completedCount.value === 3 ? 'complete' : !progress.value?.contributed ? 'contribute' : !progress.value.replied ? 'find_conversation' : 'notifications')
const primaryHref = computed(() => ({ verification: '/verification', find_conversation: '/explore', notifications: '/notifications' } as Record<string, string>)[primaryAction.value])
const primaryTitle = computed(() => ({ verification: progress.value?.verificationPending ? 'View verification' : 'Request verification', complete: 'Back to your feed', contribute: 'Introduce yourself', find_conversation: 'Find a conversation', notifications: 'View notifications' })[primaryAction.value])
function primaryClick() {
  track('onboarding_action_clicked', primaryAction.value)
  if (primaryAction.value === 'complete') dismiss()
  else emit('compose')
}
</script>

<style scoped>
.activation-guide { display: flex; flex-direction: column; gap: 16px; padding: 24px; background: var(--moh-bg); border-bottom: 1px solid var(--moh-border); }
.guide-button { display: flex; width: 100%; justify-content: center; align-items: center; min-height: 46px; padding: 12px 20px; border-radius: 999px; font-size: 15px; font-weight: 600; }
.guide-primary { background: var(--moh-text); color: var(--moh-bg); }
button:focus-visible, a:focus-visible { outline: 2px solid var(--moh-brass); outline-offset: 3px; }
</style>
