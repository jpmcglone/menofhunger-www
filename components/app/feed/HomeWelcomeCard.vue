<template>
  <!-- Figma: YnuRSJB7p90n9jEY4mb4RN / 881:524. -->
  <section v-if="showCard" class="activation-guide moh-text" aria-label="Getting started">
    <div class="flex items-baseline justify-between gap-3">
      <p class="moh-meta uppercase">{{ approved ? 'Your first days here' : 'Getting started' }}</p>
      <p v-if="progress" class="moh-meta shrink-0 tabular-nums" aria-live="polite">{{ completedCount }} of {{ approved ? 3 : 2 }} complete</p>
    </div>
    <div class="space-y-1">
      <h2 class="moh-h1">{{ heading }}</h2>
      <p class="text-[15px] leading-5 moh-text-muted text-pretty">{{ summary }}</p>
    </div>
    <div v-if="syncError" class="text-sm moh-text-muted" role="status">
      Couldn’t refresh progress. <button type="button" class="min-h-11 underline" @click="sync">Try again</button>
    </div>
    <ol v-if="progress" class="flex flex-col">
      <li v-for="(step, index) in steps" :key="step.title">
        <button v-if="step.done && step.action" type="button" class="step-row" @click="act(step.action)">
          <span class="step-mark" aria-hidden="true">✓</span>
          <span class="min-w-0 flex-1 truncate text-left">{{ step.title }}</span>
          <span class="shrink-0 font-semibold">{{ step.label }}</span>
        </button>
        <div v-else class="step-row" :class="index === currentIndex ? '' : 'moh-text-muted'">
          <span class="step-mark" aria-hidden="true">{{ step.done ? '✓' : index + 1 }}</span>
          <span :class="index === currentIndex ? 'font-semibold moh-text' : ''">{{ step.title }}</span>
        </div>
        <div v-if="index === currentIndex" class="step-detail">
          <p class="text-[15px] leading-5 moh-text-muted text-pretty">{{ step.body }}</p>
          <button v-if="step.action" type="button" class="guide-button guide-primary" @click="act(step.action)">{{ step.label }}</button>
          <button v-if="step.action === 'compose' && showCheckinCta && checkinPrompt" type="button" class="text-left min-h-11" @click="track('onboarding_action_clicked', 'checkin'); $emit('check-in')">
            <AppCheckinPromptContext :prompt="checkinPrompt" compact />
            <span class="font-semibold">Answer →</span>
          </button>
        </div>
      </li>
    </ol>
    <button v-if="!approved" type="button" class="explore" @click="addPhoto">Add a photo or profile details</button>
    <button type="button" class="explore" @click="dismiss">{{ complete ? 'Back to feed' : 'I’ll explore first' }}</button>
  </section>
  <AppModal v-if="!dismissed" v-model="modalOpen" :title="modalTitle" title-wrap body-class="p-6">
    <SettingsSectionsSettingsVerificationSection v-if="active === 'verification'" embedded @changed="sync" @done="active = null" />
    <AppFeedActivationPeople v-else-if="active === 'people'" @followed="sync" />
    <AppFeedActivationConversations v-else-if="active === 'conversations'" @reply="reply" />
    <AppFeedActivationCompletion v-else-if="active === 'complete'" @done="finishGuide" />
  </AppModal>
</template>

<script setup lang="ts">
import { MOH_COMPOSER_OPEN_KEY } from '~/utils/injection-keys'
import type { FeedPost } from '~/types/api'
import AppCheckinPromptContext from '~/components/app/CheckinPromptContext.vue'
const { addPhoto, step: profileStep } = useFirstRunFlow()
const composerOpen = inject(MOH_COMPOSER_OPEN_KEY, ref(false))
const props = defineProps<{ showCheckinCta?: boolean; checkinPrompt?: string; hasPosted?: boolean }>()
const emit = defineEmits<{ 'check-in': []; compose: [] }>()
const { progress, phase, dismissed, completedCount, syncError, sync, dismiss, track, claimCompletion } = useActivationGuide()
const approved = computed(() => phase.value === 'approved')
watch(() => props.hasPosted, () => { void sync() })
const heading = computed(() => !approved.value ? progress.value?.verificationPending ? 'Your request is in.' : 'You’re in. Take a look around.'
  : completedCount.value === 3 ? 'You’ve made a start.' : !progress.value?.contributed ? 'You’re approved. Join in.'
    : !progress.value.replied ? 'Keep the conversation going.' : 'A reason to return.')
const summary = computed(() => !approved.value ? progress.value?.verificationPending
  ? 'An admin will contact you here to arrange your video call.' : 'Browse now. Verify to post and message.'
  : completedCount.value === 3 ? 'Keep the conversations going. Your next step is yours.'
    : !progress.value?.contributed ? 'Start a conversation. Give another man a reason to reply.'
      : !progress.value.replied ? 'You’ve taken the first step. Make a connection with another man.' : 'Read your replies and keep showing up for each other.')
const steps = computed(() => approved.value ? [
  { title: 'Share what you’re working on', body: 'A post, reply, or check-in is a good place to start.', done: progress.value?.contributed, action: 'compose', label: 'Write a post' },
  { title: 'Reply to another man', body: 'Ask a question, offer encouragement, or share your experience.', done: progress.value?.replied, action: 'conversations', label: 'Find a conversation' },
  { title: 'Come back and follow through', body: 'Participate on another day. Tell us how it went.', done: progress.value?.returned, action: '', label: '' },
] : [
  { title: progress.value?.verificationRequested ? 'Verification requested' : 'Request verification', body: 'Meet an admin in a video call here in the app.', done: progress.value?.verificationRequested, action: 'verification', label: progress.value?.verificationRequested ? 'View request' : 'Request verification' },
  { title: 'Find your people', body: 'Explore beyond your starter follows. Choose men whose conversations resonate with you.', done: progress.value?.followed, action: 'people', label: 'Find people' },
])
const { user } = useAuth()
const replyModal = useReplyModal()
const active = ref<string | null>(null)
const complete = computed(() => Boolean(progress.value) && completedCount.value === (approved.value ? 3 : 2))
const currentIndex = computed(() => steps.value.findIndex(step => !step.done))
const arrivedComplete = ref(false)
const settled = ref(false)
const showCard = computed(() => !dismissed.value && !arrivedComplete.value && Boolean(progress.value || syncError.value))
function snapshotComplete(value: NonNullable<typeof progress.value>) {
  return approved.value
    ? Boolean(value.contributed && value.replied && value.returned)
    : Boolean(value.verificationRequested && value.followed)
}
watch(progress, (value) => {
  if (!value) {
    settled.value = false
    arrivedComplete.value = false
    return
  }
  if (settled.value) return
  settled.value = true
  if (!snapshotComplete(value)) return
  arrivedComplete.value = true
  if (!(approved.value && value.completionSeen === false)) dismiss()
}, { immediate: true })
const celebrationOwner = computed(() => `${user.value?.id}.${phase.value}`)
let claimingCompletion = false
let alive = true
const modalOpen = computed({ get: () => active.value !== null, set: (open) => { if (!open) { if (active.value === 'complete') finishGuide(); else active.value = null } } })
const modalTitle = computed(() => ({ verification: 'Verification', people: 'Find your people', conversations: 'Find a conversation', complete: 'Good work. You’re all set.' })[active.value ?? ''] ?? '')
function finishGuide() {
  active.value = null
  dismiss()
}
function act(action: string) {
  track('onboarding_action_clicked', action)
  if (action === 'compose') emit('compose')
  else active.value = action
}
async function reply(post: FeedPost) {
  active.value = null
  await nextTick()
  replyModal.show(post)
}
function canCelebrate() {
  return approved.value && complete.value && !dismissed.value && !active.value
    && !replyModal.open.value && !composerOpen.value && profileStep.value === 'none'
}
async function celebrate() {
  if (!canCelebrate() || claimingCompletion || progress.value?.completionSeen !== false) return
  claimingCompletion = true
  const owner = celebrationOwner.value
  try {
    const present = await claimCompletion()
    if (present && alive && owner === celebrationOwner.value && canCelebrate()) active.value = 'complete'
  } finally {
    claimingCompletion = false
    if (alive && owner !== celebrationOwner.value) void celebrate()
  }
}
watch(celebrationOwner, () => { active.value = null })
watch([progress, complete, active, dismissed, replyModal.open, composerOpen, profileStep], celebrate, { flush: 'post' })
watch(active, (value, previous) => { if (!value && previous) void sync() })
const unregisterReply = replyModal.registerOnReplyPosted(() => { void sync() })
onBeforeUnmount(() => { alive = false; unregisterReply() })
</script>

<style scoped>
.activation-guide { display: flex; flex-direction: column; gap: 8px; padding: 14px 20px 4px; background: var(--moh-bg); border-bottom: 1px solid var(--moh-border); }
.step-row { display: flex; width: 100%; align-items: center; gap: 10px; min-height: 32px; text-align: left; font-size: 15px; line-height: 20px; }
button.step-row { min-height: 44px; }
.step-mark { width: 16px; flex: none; text-align: center; font-size: 13px; font-weight: 650; }
.step-detail { display: flex; flex-direction: column; align-items: flex-start; gap: 8px; padding: 0 0 4px 26px; }
.guide-button { display: inline-flex; align-items: center; min-height: 44px; padding: 0 16px; border-radius: 999px; font-size: 15px; font-weight: 600; }
.guide-primary { background: var(--moh-text); color: var(--moh-bg); }
.explore { align-self: flex-start; min-height: 44px; font-size: 15px; font-weight: 600; color: var(--moh-text-muted); }
button:focus-visible, a:focus-visible { outline: 2px solid var(--moh-brass); outline-offset: 3px; }
</style>
