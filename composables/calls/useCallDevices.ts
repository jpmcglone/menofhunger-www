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

/** 720p 30fps 16:9 is the top tier on desktop; the quality manager scales down from here. */
export const DEFAULT_VIDEO_CONSTRAINTS: MediaTrackConstraints = {
  width: { ideal: 1280 },
  height: { ideal: 720 },
  frameRate: { ideal: 30, max: 30 },
  aspectRatio: { ideal: 16 / 9 },
}

/** Phones reject 720p + 16:9 more often than they honor `ideal`. Ask for something they can actually start. */
export const MOBILE_VIDEO_CONSTRAINTS: MediaTrackConstraints = {
  width: { ideal: 640 },
  height: { ideal: 480 },
  frameRate: { ideal: 24, max: 30 },
  facingMode: { ideal: 'user' },
}

export function isCoarsePointer(): boolean {
  return import.meta.client && Boolean(window.matchMedia?.('(pointer: coarse)').matches)
}

/** Video-call starter publishes camera. Answer / late join keeps it off — mic stays live. */
export function shouldStartCallWithCamera(isVideo: boolean, joining: boolean): boolean {
  return isVideo && !joining
}

export function canScreenShare(): boolean {
  return import.meta.client && !isCoarsePointer() && Boolean(navigator.mediaDevices?.getDisplayMedia)
}

export const DEFAULT_AUDIO_CONSTRAINTS: MediaTrackConstraints = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
}

export function describeMediaError(err: unknown, kind: 'microphone' | 'camera'): string {
  const name = String((err as { name?: unknown } | null)?.name ?? '')
  if (name === 'NotAllowedError' || name === 'SecurityError') {
    return `${capitalize(kind)} is blocked. Allow it for this site in your browser settings, then tap again.`
  }
  if (name === 'OverconstrainedError') {
    return `Couldn't start the ${kind} on this device.`
  }
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
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

export function videoConstraints(req: CallMediaRequest, coarse = isCoarsePointer()): MediaTrackConstraints {
  const c: MediaTrackConstraints = { ...(coarse ? MOBILE_VIDEO_CONSTRAINTS : DEFAULT_VIDEO_CONSTRAINTS) }
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

/**
 * Grab just a camera track (camera re-enable, device switch, flip).
 * Phones often fail the first constraint set, or refuse video-only after an audio-only
 * getUserMedia — keep asking with simpler shapes, then audio+video (drop the extra mic).
 */
export async function acquireVideoTrack(req: Pick<CallMediaRequest, 'videoDeviceId' | 'facingMode'>): Promise<{ track: MediaStreamTrack | null; error: string | null }> {
  if (!import.meta.client || !navigator.mediaDevices?.getUserMedia) return { track: null, error: 'This browser cannot access media devices.' }
  const facing = req.facingMode ?? (isCoarsePointer() ? 'user' : undefined)
  const sized = { video: videoConstraints({ audio: false, video: true, videoDeviceId: req.videoDeviceId, facingMode: facing }) }
  const facingOnly: MediaStreamConstraints = { video: facing ? { facingMode: { ideal: facing } } : true }
  // Flip (facing, no deviceId): ask for facing only first. Sized 640×480 on Safari iOS
  // can stick the <video> element to the old aspect and letterbox after replaceTrack.
  const attempts: MediaStreamConstraints[] = req.videoDeviceId
    ? [sized, facingOnly, { audio: true, video: facing ? { facingMode: { ideal: facing } } : true }]
    : [facingOnly, sized, { audio: true, video: facing ? { facingMode: { ideal: facing } } : true }]
  let lastErr: unknown
  for (const constraints of attempts) {
    try {
      const s = await navigator.mediaDevices.getUserMedia(constraints)
      const track = s.getVideoTracks()[0] ?? null
      for (const extra of s.getAudioTracks()) stopTrack(extra)
      if (track) return { track, error: null }
    } catch (err) {
      lastErr = err
    }
  }
  return { track: null, error: describeMediaError(lastErr, 'camera') }
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
