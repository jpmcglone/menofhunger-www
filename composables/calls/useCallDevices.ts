import { useDevicesList } from '@vueuse/core'

export type CallMediaRequest = {
  audio: boolean
  video: boolean
  audioDeviceId?: string | null
  videoDeviceId?: string | null
  facingMode?: 'user' | 'environment'
}

export type CallMediaResult = {
  stream: MediaStream
  audioTrack: MediaStreamTrack | null
  videoTrack: MediaStreamTrack | null
  /** Set when the camera was requested but could not be used (denied, busy, missing). */
  cameraError: string | null
  /** Set when the microphone was requested but could not be used. Caller decides whether to continue listen-only. */
  micError: string | null
}

/** 720p 30fps 16:9 is the top tier; the quality manager scales down from here. */
export const DEFAULT_VIDEO_CONSTRAINTS: MediaTrackConstraints = {
  width: { ideal: 1280 },
  height: { ideal: 720 },
  frameRate: { ideal: 30, max: 30 },
  aspectRatio: { ideal: 16 / 9 },
}

export const DEFAULT_AUDIO_CONSTRAINTS: MediaTrackConstraints = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
}

export function describeMediaError(err: unknown, kind: 'microphone' | 'camera'): string {
  const name = String((err as { name?: unknown } | null)?.name ?? '')
  if (name === 'NotAllowedError' || name === 'SecurityError') {
    return `${capitalize(kind)} access was blocked. Allow it in your browser's site settings and try again.`
  }
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError' || name === 'OverconstrainedError') {
    return `No ${kind} was found.`
  }
  if (name === 'NotReadableError' || name === 'TrackStartError' || name === 'AbortError') {
    return `Your ${kind} is in use by another app.`
  }
  return `Couldn't access your ${kind}.`
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function videoConstraints(req: CallMediaRequest): MediaTrackConstraints {
  const c: MediaTrackConstraints = { ...DEFAULT_VIDEO_CONSTRAINTS }
  if (req.videoDeviceId) c.deviceId = { exact: req.videoDeviceId }
  else if (req.facingMode) c.facingMode = { ideal: req.facingMode }
  return c
}

function audioConstraints(req: CallMediaRequest): MediaTrackConstraints {
  const c: MediaTrackConstraints = { ...DEFAULT_AUDIO_CONSTRAINTS }
  if (req.audioDeviceId) c.deviceId = { exact: req.audioDeviceId }
  return c
}

/**
 * Ask for mic and camera together first (one permission prompt). If that fails and
 * camera was requested, fall back to audio-only so a broken webcam never blocks a
 * call. A failing microphone is reported but not fatal: the caller can still listen.
 */
export async function acquireCallMedia(req: CallMediaRequest): Promise<CallMediaResult> {
  if (!import.meta.client || typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    return { stream: new MediaStream(), audioTrack: null, videoTrack: null, micError: 'This browser cannot access media devices.', cameraError: req.video ? 'This browser cannot access media devices.' : null }
  }

  let cameraError: string | null = null
  let micError: string | null = null

  if (req.audio && req.video) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints(req), video: videoConstraints(req) })
      return { stream, audioTrack: stream.getAudioTracks()[0] ?? null, videoTrack: stream.getVideoTracks()[0] ?? null, cameraError, micError }
    } catch (err) {
      // Try each separately so we can tell which device failed.
      cameraError = describeMediaError(err, 'camera')
    }
  }

  const stream = new MediaStream()
  let audioTrack: MediaStreamTrack | null = null
  let videoTrack: MediaStreamTrack | null = null

  if (req.audio) {
    try {
      const a = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints(req) })
      audioTrack = a.getAudioTracks()[0] ?? null
      if (audioTrack) stream.addTrack(audioTrack)
    } catch (err) {
      micError = describeMediaError(err, 'microphone')
    }
  }

  if (req.video) {
    try {
      const v = await navigator.mediaDevices.getUserMedia({ video: videoConstraints(req) })
      videoTrack = v.getVideoTracks()[0] ?? null
      if (videoTrack) {
        stream.addTrack(videoTrack)
        cameraError = null
      }
    } catch (err) {
      cameraError = describeMediaError(err, 'camera')
    }
  }

  return { stream, audioTrack, videoTrack, cameraError, micError }
}

/** Grab just a camera track (camera re-enable, device switch, flip). */
export async function acquireVideoTrack(req: Pick<CallMediaRequest, 'videoDeviceId' | 'facingMode'>): Promise<{ track: MediaStreamTrack | null; error: string | null }> {
  if (!import.meta.client || !navigator.mediaDevices?.getUserMedia) return { track: null, error: 'This browser cannot access media devices.' }
  try {
    const s = await navigator.mediaDevices.getUserMedia({ video: videoConstraints({ audio: false, video: true, ...req }) })
    return { track: s.getVideoTracks()[0] ?? null, error: null }
  } catch (err) {
    return { track: null, error: describeMediaError(err, 'camera') }
  }
}

/** Grab just a microphone track (device switch). */
export async function acquireAudioTrack(req: Pick<CallMediaRequest, 'audioDeviceId'>): Promise<{ track: MediaStreamTrack | null; error: string | null }> {
  if (!import.meta.client || !navigator.mediaDevices?.getUserMedia) return { track: null, error: 'This browser cannot access media devices.' }
  try {
    const s = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints({ audio: true, video: false, ...req }) })
    return { track: s.getAudioTracks()[0] ?? null, error: null }
  } catch (err) {
    return { track: null, error: describeMediaError(err, 'microphone') }
  }
}

export function stopTrack(track: MediaStreamTrack | null | undefined): void {
  if (!track) return
  try {
    track.stop()
  } catch {
    // Already stopped.
  }
}

/**
 * Enumerated devices for the in-call device menu. `requestPermissions: false` — we
 * only ever prompt from an explicit start/accept/join, never on mount.
 */
export function useCallDevices() {
  const devices = useDevicesList({ requestPermissions: false })
  const supportsSpeakerSelection = computed(
    () => import.meta.client && typeof (HTMLMediaElement.prototype as { setSinkId?: unknown }).setSinkId === 'function',
  )
  return {
    microphones: devices.audioInputs,
    cameras: devices.videoInputs,
    speakers: devices.audioOutputs,
    ensureDeviceLabels: devices.ensurePermissions,
    supportsSpeakerSelection,
  }
}
