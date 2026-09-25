<template>
  <!-- Figma: YnuRSJB7p90n9jEY4mb4RN / 881:524. -->
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
        <button v-if="step.action" type="button" class="guide-button" :class="{ 'guide-primary': !step.done }" @click="act(step.action)">{{ step.label }}</button>
      </section>
      <button v-if="approved && showCheckinCta && checkinPrompt && !progress.contributed" type="button" class="text-left min-h-11" @click="track('onboarding_action_clicked', 'checkin'); $emit('check-in')">
        <AppCheckinPromptContext :prompt="checkinPrompt" compact />
        <span class="font-semibold">Answer →</span>
      </button>
    </template>
    <button v-if="!approved" type="button" class="guide-button" @click="addPhoto">Add a photo or profile details</button>
    <button type="button" class="guide-button" @click="dismiss">{{ complete ? 'Back to feed' : 'I’ll explore first' }}</button>
    <AppModal v-model="modalOpen" :title="modalTitle" title-wrap body-class="p-6">
      <SettingsSectionsSettingsVerificationSection v-if="active === 'verification'" embedded @changed="sync" @done="active = null" />
      <AppFeedActivationPeople v-else-if="active === 'people'" @followed="sync" />
      <AppFeedActivationConversations v-else-if="active === 'conversations'" @reply="reply" />
      <AppFeedActivationCompletion v-else-if="active === 'complete'" @done="active = null" />
    </AppModal>
  </section>
</template>

<script setup lang="ts">
import { MOH_COMPOSER_OPEN_KEY } from '~/utils/injection-keys'
import type { FeedPost } from '~/types/api'
import AppCheckinPromptContext from '~/components/app/CheckinPromptContext.vue'
const { addPhoto, step: profileStep } = useFirstRunFlow()
const composerOpen = inject(MOH_COMPOSER_OPEN_KEY, ref(false))
const props = defineProps<{ showCheckinCta?: boolean; checkinPrompt?: string; hasPosted?: boolean }>()
const emit = defineEmits<{ 'check-in': []; compose: [] }>()
const { progress, phase, dismissed, completedCount, syncError, sync, dismiss, track } = useActivationGuide()
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
const celebrationKey = computed(() => `moh.activation.celebrated.v1.${user.value?.id}.${phase.value}`)
const celebrated = ref(false)
const modalOpen = computed({ get: () => active.value !== null, set: (open) => { if (!open) active.value = null } })
const modalTitle = computed(() => ({ verification: 'Verification', people: 'Find your people', conversations: 'Find a conversation', complete: 'Good work. You’re all set.' })[active.value ?? ''] ?? '')
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
function restoreCelebration() {
  active.value = null
  try { celebrated.value = localStorage.getItem(celebrationKey.value) === '1' } catch { celebrated.value = false }
}
function celebrate() {
  if (!complete.value || dismissed.value || celebrated.value || active.value || replyModal.open.value || composerOpen.value || profileStep.value !== 'none') return
  try { if (localStorage.getItem(celebrationKey.value) === '1') { celebrated.value = true; return } } catch { /* Storage is optional. */ }
  celebrated.value = true
  try { localStorage.setItem(celebrationKey.value, '1') } catch { /* Retain for this session. */ }
  active.value = 'complete'
}
onMounted(() => { restoreCelebration(); celebrate() })
watch(celebrationKey, restoreCelebration)
watch([complete, active, dismissed, replyModal.open, composerOpen, profileStep], celebrate, { flush: 'post' })
watch(active, (value, previous) => { if (!value && previous) void sync() })
const unregisterReply = replyModal.registerOnReplyPosted(() => { void sync() })
onBeforeUnmount(unregisterReply)
</script>

<style scoped>
.activation-guide { display: flex; flex-direction: column; gap: 16px; padding: 24px; background: var(--moh-bg); border-bottom: 1px solid var(--moh-border); }
.guide-button { display: flex; width: 100%; justify-content: center; align-items: center; min-height: 46px; padding: 12px 20px; border-radius: 999px; font-size: 15px; font-weight: 600; }
.guide-primary { background: var(--moh-text); color: var(--moh-bg); }
button:focus-visible, a:focus-visible { outline: 2px solid var(--moh-brass); outline-offset: 3px; }
</style>
