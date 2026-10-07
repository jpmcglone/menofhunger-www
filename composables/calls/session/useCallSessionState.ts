import type { CallSession, WsCallsIncomingPayload } from '~/types/api'
import { mediaFocus } from '~/utils/mediaFocus'
import { usePresence } from '~/composables/usePresence'
import { useUsersStore } from '~/composables/useUsersStore'
import type { CallReaction } from '../callReactions'
import type { CallPhase, CallSessionState } from '../callSessionReducer'
import { qualityBarsFor, type IcePathKind } from '../callQuality'
import type { PeerMediaState } from '../transport/CallTransport'

/** Shared (useState) call session state plus derived views. Every instance sees the same values. */
export function useCallSessionState() {
  const state = useState<CallSessionState>('call-session-state', () => ({ phase: 'idle', call: null, incoming: null }))
  const isMicEnabled = useState<boolean>('call-mic-enabled', () => true)
  const isCameraEnabled = useState<boolean>('call-camera-enabled', () => false)
  const micError = useState<string | null>('call-mic-error', () => null)
  const cameraError = useState<string | null>('call-camera-error', () => null)
  const peerStates = useState<Record<string, PeerMediaState>>('call-peer-states', () => ({}))
  /** userId → currently talking (self included), with hysteresis so it doesn't flicker. */
  const speakingIds = useState<Record<string, number>>('call-speaking-ids', () => ({}))
  const qualityTier = useState<number>('call-quality-tier', () => 0)
  /** userId → selected ICE path. Admin tiles only. */
  const icePaths = useState<Record<string, IcePathKind>>('call-ice-paths', () => ({}))
  const facingMode = useState<'user' | 'environment'>('call-facing-mode', () => 'user')
  const audioDeviceId = useState<string | null>('call-audio-device', () => null)
  const videoDeviceId = useState<string | null>('call-video-device', () => null)
  const speakerDeviceId = useState<string | null>('call-speaker-device', () => null)
  /** Overlay collapsed into the mini bar so the user can browse while on the call. */
  const minimized = useState<boolean>('call-overlay-minimized', () => false)
  /** Elapsed-time anchor for the in-call timer (ms epoch when this tab connected). */
  const connectedAt = useState<number | null>('call-connected-at', () => null)
  const pendingVoicemail = useState<{ conversationId: string; messageId: string } | null>(
    'call-pending-voicemail',
    () => null,
  )
  /** Direct call we started: who we're ringing (not yet a participant). */
  const outgoingCalleeId = useState<string | null>('call-outgoing-callee', () => null)
  const isScreenSharing = useState<boolean>('call-screen-sharing', () => false)
  const reactions = useState<CallReaction[]>('call-reactions', () => [])

  const { user } = useAuth()
  const presence = usePresence()
  const toast = useAppToast()
  const usersStore = useUsersStore()
  const router = useRouter()

  const meId = computed(() => user.value?.id ?? '')
  const phase = computed<CallPhase>(() => state.value.phase)
  const call = computed<CallSession | null>(() => state.value.call)
  const incoming = computed<WsCallsIncomingPayload | null>(() => state.value.incoming)
  const isEngaged = computed(() => phase.value === 'outgoing' || phase.value === 'joining' || phase.value === 'in_call' || phase.value === 'requesting_media')
  watch(isEngaged, (engaged) => {
    mediaFocus.setCallActive(engaged)
  }, { immediate: true, flush: 'sync' })
  const remoteParticipants = computed(() => (call.value ? call.value.participants.filter((p) => p.userId !== meId.value) : []))
  const qualityBars = computed(() => qualityBarsFor(qualityTier.value))

  return {
    state,
    isMicEnabled,
    isCameraEnabled,
    micError,
    cameraError,
    peerStates,
    speakingIds,
    qualityTier,
    icePaths,
    facingMode,
    audioDeviceId,
    videoDeviceId,
    speakerDeviceId,
    minimized,
    connectedAt,
    pendingVoicemail,
    outgoingCalleeId,
    isScreenSharing,
    reactions,
    user,
    presence,
    toast,
    usersStore,
    router,
    meId,
    phase,
    call,
    incoming,
    isEngaged,
    remoteParticipants,
    qualityBars,
  }
}

export type CallSessionStateContext = ReturnType<typeof useCallSessionState>
