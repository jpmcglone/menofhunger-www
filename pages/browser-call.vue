<template>
  <div>
    <AppPageHeader title="Verification call" description="Meet with the Men of Hunger team." />
    <AppPageContent>
      <div class="moh-gutter-x mx-auto max-w-xl py-8">
        <div aria-live="polite" class="space-y-4">
          <p v-if="loading && !conversation" class="text-sm text-[var(--moh-text-muted)]">Getting your call ready…</p>
          <template v-else-if="error">
            <p role="alert" class="text-sm">{{ error }}</p>
            <AppKitActionButton label="Try again" kind="secondary" :loading="loading" @click="refresh" />
          </template>
          <template v-else-if="conversation">
            <h2 class="text-xl font-semibold">{{ heading }}</h2>
            <p class="text-sm leading-relaxed text-[var(--moh-text-muted)]">{{ description }}</p>
            <AppKitActionButton v-if="inThisCall" label="Show call" class="w-full" @click="callSession.minimized.value = false" />
            <AppKitActionButton
              v-else-if="state === 'ready'"
              label="Join call"
              class="w-full"
              :disabled="!canJoin || !presence.isSocketConnected.value || busyElsewhere"
              :loading="joining"
              @click="join"
            />
            <p v-if="busyElsewhere" class="text-sm text-[var(--moh-text-muted)]">Finish your current call before joining.</p>
            <p v-if="permissionProblem" class="text-sm text-[var(--moh-text-muted)]">Allow microphone and camera access in your browser to take part. You can adjust them using the call controls.</p>
            <p v-if="!presence.isSocketConnected.value" class="text-sm text-[var(--moh-text-muted)]">Reconnecting. Your call will update when the connection returns.</p>
          </template>
        </div>
        <NuxtLink to="/settings/verification" class="mt-8 inline-flex min-h-11 items-center text-sm underline underline-offset-4">Back to verification</NuxtLink>
      </div>
    </AppPageContent>
  </div>
</template>

<script setup lang="ts">
import type { CallSession, MessageConversation } from '~/types/api'
import { useCallSession } from '~/composables/calls/useCallSession'
import { useCallGating } from '~/composables/calls/useCallGating'
import { usePresenceCallback } from '~/composables/presence/usePresenceCallback'
import { browserCallState } from '~/utils/browser-call'
import { getErrorStatus, getSafeUserErrorMessage } from '~/utils/api-error'

definePageMeta({ layout: 'app', title: 'Verification call', hideTopBar: true })
usePageSeo({ title: 'Verification call', description: 'Join your Men of Hunger verification call.', canonicalPath: '/browser-call', noindex: true })

const route = useRoute()
const { user } = useAuth()
const { apiFetchData } = useApiClient()
const presence = usePresence()
const callSession = useCallSession()
const gating = useCallGating()
const conversationId = computed(() => typeof route.query.c === 'string' && route.query.c.trim() ? route.query.c : null)
const conversation = shallowRef<MessageConversation | null>(null)
const activeCall = shallowRef<CallSession | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)
const joining = ref(false)
const state = computed(() => conversation.value ? browserCallState(conversation.value, activeCall.value, user.value?.id ?? '') : 'waiting')
const canJoin = computed(() => Boolean(activeCall.value && gating.canJoin(activeCall.value)))
const inThisCall = computed(() => Boolean(callSession.call.value && callSession.call.value.conversationId === conversationId.value))
const busyElsewhere = computed(() => !inThisCall.value && !['idle', 'incoming', 'in_call_elsewhere'].includes(callSession.phase.value))
const permissionProblem = computed(() => Boolean(callSession.micError.value || callSession.cameraError.value))
const heading = computed(() => inThisCall.value ? 'Your call is open' : ({ waiting: 'Waiting for the team', ready: 'Your call is ready', ended: 'This call has ended', unavailable: 'This call is unavailable' })[state.value])
const description = computed(() => ({
  waiting: 'Keep this page open. When the team starts your video call, you can join here.',
  ready: 'Join when you are ready. Your browser will ask for microphone and camera access.',
  ended: 'You can return to the app. Your verification status updates when the team confirms it.',
  unavailable: 'Return to verification to arrange a call with the team.',
})[state.value])

let mounted = false
let request = 0
let callRevision = 0
let refreshQueued = false
let fetching = false

async function refresh() {
  if (!mounted) return
  if (fetching) { refreshQueued = true; return }
  const id = conversationId.value
  const viewerId = user.value?.id
  const sequence = ++request
  const revision = callRevision
  if (!id || !viewerId) {
    error.value = viewerId ? 'This call link is incomplete. Open verification from the app again.' : 'Sign in again to join your verification call.'
    loading.value = false
    return
  }
  fetching = true
  loading.value = true
  error.value = null
  try {
    const data = await apiFetchData<{ conversation: MessageConversation }>(`/messages/conversations/${encodeURIComponent(id)}`)
    if (!mounted || sequence !== request || id !== conversationId.value || viewerId !== user.value?.id) return
    if (data.conversation.id !== id) throw new Error('Conversation details unavailable')
    conversation.value = data.conversation
    if (revision === callRevision && (data.conversation.activeCall || activeCall.value?.status !== 'ended')) activeCall.value = data.conversation.activeCall ?? null
  } catch (cause) {
    if (!mounted || sequence !== request || id !== conversationId.value || viewerId !== user.value?.id) return
    const status = getErrorStatus(cause)
    error.value = getSafeUserErrorMessage(cause, status === 403 || status === 404 ? 'This call is unavailable. Return to verification to arrange a call.' : 'Could not load your call. Please try again.')
    conversation.value = null
    activeCall.value = null
  } finally {
    fetching = false
    if (sequence === request) loading.value = false
    if (refreshQueued && mounted) { refreshQueued = false; void refresh() }
  }
}

function updateCall(call: CallSession) {
  if (!mounted || !user.value?.id || call.conversationId !== conversationId.value) return
  if (activeCall.value && Date.parse(call.startedAt) < Date.parse(activeCall.value.startedAt)) return
  callRevision++
  activeCall.value = call
}
usePresenceCallback('Calls', { onIncoming: payload => updateCall(payload.call), onUpdated: payload => updateCall(payload.call) }, { activate: true })

async function join() {
  const call = activeCall.value
  if (!call || state.value !== 'ready' || !canJoin.value || busyElsewhere.value || joining.value || !presence.isSocketConnected.value) return
  joining.value = true
  error.value = null
  try {
    await callSession.joinCall(call, { participants: conversation.value?.participants.map(participant => participant.user) ?? [] })
  } catch (cause) {
    error.value = getSafeUserErrorMessage(cause, 'Could not join your call. Please try again.')
  } finally { joining.value = false }
}

function activate() { if (mounted) return; mounted = true; void refresh() }
function deactivate() { mounted = false; request++; refreshQueued = false }
function onVisible() { if (document.visibilityState === 'visible') void refresh() }
watch([conversationId, () => user.value?.id], () => { request++; callRevision++; conversation.value = null; activeCall.value = null; error.value = null; loading.value = true; void refresh() })
watch(presence.isSocketConnected, (connected, previous) => { if (connected && previous === false) void refresh() })
onMounted(() => { activate(); document.addEventListener('visibilitychange', onVisible) })
onActivated(activate)
onDeactivated(deactivate)
onBeforeUnmount(() => { deactivate(); document.removeEventListener('visibilitychange', onVisible) })
</script>
