import type { CallType } from '~/types/api'
import { callMediaLog, callMediaTrackInfo } from '../callMediaLog'
import { acquireAudioTrack, acquireCallMedia, acquireVideoTrack, canScreenShare, shouldStartCallWithCamera, stopTrack } from '../useCallDevices'
import { localScreenStream, localStream, rt } from './callSessionRuntime'
import type { CallSessionStateContext } from './useCallSessionState'

/** Local capture: acquire/release, mic and camera toggles, device switching and screen share. */
export function useCallMedia(s: CallSessionStateContext) {
  const {
    isMicEnabled,
    isCameraEnabled,
    micError,
    cameraError,
    facingMode,
    audioDeviceId,
    videoDeviceId,
    speakerDeviceId,
    isScreenSharing,
    presence,
    toast,
    meId,
    phase,
    call,
  } = s

  // ─── Local media ────────────────────────────────────────────────────────────

  function localAudioTrack(): MediaStreamTrack | null {
    return localStream.value?.getAudioTracks()[0] ?? null
  }
  function localVideoTrack(): MediaStreamTrack | null {
    return localStream.value?.getVideoTracks()[0] ?? null
  }
  function localScreenTrack(): MediaStreamTrack | null {
    return localScreenStream.value?.getVideoTracks()[0] ?? null
  }

  function otherPresenterId(): string | null {
    const me = meId.value
    return call.value?.participants.find((p) => p.screenSharing && p.userId !== me)?.userId ?? null
  }

  function releaseLocalMedia() {
    const s = localStream.value
    if (s) for (const t of s.getTracks()) stopTrack(t)
    localStream.value = null
    const share = localScreenStream.value
    if (share) for (const t of share.getTracks()) stopTrack(t)
    localScreenStream.value = null
  }

  async function acquireForCall(type: CallType, joining = false): Promise<boolean> {
    const media = await acquireCallMedia({
      audio: true,
      video: shouldStartCallWithCamera(type === 'video', joining),
      audioDeviceId: audioDeviceId.value,
      videoDeviceId: videoDeviceId.value,
      facingMode: facingMode.value,
    })
    localStream.value = media.stream
    micError.value = media.micError
    cameraError.value = media.cameraError
    isMicEnabled.value = Boolean(media.audioTrack)
    isCameraEnabled.value = Boolean(media.videoTrack)
    callMediaLog('acquire', {
      type,
      joining,
      camera: callMediaTrackInfo(media.videoTrack),
      cameraError: media.cameraError,
      mic: callMediaTrackInfo(media.audioTrack),
    })
    if (media.micError && !media.audioTrack) {
      toast.push({ title: media.micError, message: 'You can still listen, but others won’t hear you.', tone: 'error', durationMs: 6000 })
    }
    if (type === 'video' && media.cameraError && !media.videoTrack) {
      toast.push({ title: media.cameraError, message: 'Joining with audio only.', durationMs: 5000 })
    }
    return true
  }


  async function toggleMic(): Promise<void> {
    const current = call.value
    let track = localAudioTrack()
    if (!track) {
      const got = await acquireAudioTrack({ audioDeviceId: audioDeviceId.value })
      if (!got.track) {
        micError.value = got.error
        toast.push({ title: got.error ?? 'Couldn’t access your microphone.', tone: 'error' })
        return
      }
      track = got.track
      micError.value = null
      ;(localStream.value ?? (localStream.value = new MediaStream())).addTrack(track)
      isMicEnabled.value = true
      await rt.transport?.setLocalTrack('audio', track)
    } else {
      isMicEnabled.value = !isMicEnabled.value
      track.enabled = isMicEnabled.value
    }
    if (current) presence.emitCallsState(current.id, { micEnabled: isMicEnabled.value })
  }

  async function toggleCamera(): Promise<void> {
    const current = call.value
    callMediaLog('toggle-camera', {
      from: isCameraEnabled.value,
      callId: current?.id ?? null,
    })
    if (isCameraEnabled.value) {
      // Stop publishing entirely (privacy + bandwidth) rather than sending black frames.
      const track = localVideoTrack()
      await rt.transport?.setLocalTrack('video', null)
      if (track) {
        localStream.value?.removeTrack(track)
        stopTrack(track)
      }
      localStream.value = localStream.value ? new MediaStream(localStream.value.getTracks()) : null
      isCameraEnabled.value = false
    } else {
      const got = await acquireVideoTrack({ videoDeviceId: videoDeviceId.value, facingMode: facingMode.value })
      if (!got.track) {
        cameraError.value = got.error
        toast.push({ title: got.error ?? 'Couldn’t access your camera.', tone: 'error' })
        return
      }
      cameraError.value = null
      const s = new MediaStream(localStream.value?.getTracks() ?? [])
      s.addTrack(got.track)
      localStream.value = s
      isCameraEnabled.value = true
      await rt.transport?.setLocalTrack('video', got.track)
    }
    if (current) presence.emitCallsState(current.id, { cameraEnabled: isCameraEnabled.value })
    callMediaLog('camera-state', { cameraEnabled: isCameraEnabled.value, callId: current?.id ?? null })
  }

  async function replaceVideoTrack(next: MediaStreamTrack) {
    const prev = localVideoTrack()
    const s = new MediaStream(localStream.value?.getTracks().filter((t) => t !== prev) ?? [])
    s.addTrack(next)
    localStream.value = s
    stopTrack(prev)
    await rt.transport?.setLocalTrack('video', next)
  }

  async function switchCamera(): Promise<void> {
    if (!isCameraEnabled.value) return
    const nextFacing = facingMode.value === 'user' ? 'environment' : 'user'
    videoDeviceId.value = null
    const got = await acquireVideoTrack({ facingMode: nextFacing })
    if (!got.track) {
      toast.push({ title: got.error ?? 'Couldn’t switch camera.', tone: 'error' })
      return
    }
    facingMode.value = nextFacing
    await replaceVideoTrack(got.track)
  }

  async function setCameraDevice(deviceId: string): Promise<void> {
    videoDeviceId.value = deviceId
    if (!isCameraEnabled.value) return
    const got = await acquireVideoTrack({ videoDeviceId: deviceId })
    if (!got.track) {
      toast.push({ title: got.error ?? 'Couldn’t switch camera.', tone: 'error' })
      return
    }
    await replaceVideoTrack(got.track)
  }

  async function setMicrophoneDevice(deviceId: string): Promise<void> {
    audioDeviceId.value = deviceId
    const got = await acquireAudioTrack({ audioDeviceId: deviceId })
    if (!got.track) {
      toast.push({ title: got.error ?? 'Couldn’t switch microphone.', tone: 'error' })
      return
    }
    const prev = localAudioTrack()
    got.track.enabled = isMicEnabled.value
    const s = new MediaStream(localStream.value?.getTracks().filter((t) => t !== prev) ?? [])
    s.addTrack(got.track)
    localStream.value = s
    stopTrack(prev)
    await rt.transport?.setLocalTrack('audio', got.track)
  }

  function setSpeakerDevice(deviceId: string): void {
    speakerDeviceId.value = deviceId
  }

  async function startScreenShare(): Promise<void> {
    if (!canScreenShare() || isScreenSharing.value) return
    if (otherPresenterId()) {
      toast.push({ title: 'Someone is already presenting.', durationMs: 3000 })
      return
    }
    let display: MediaStream
    try {
      display = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: { max: 15 } }, audio: false })
    } catch (err) {
      const name = err instanceof DOMException ? err.name : ''
      if (name !== 'NotAllowedError' && name !== 'AbortError') {
        toast.push({ title: 'Couldn’t share your screen.', tone: 'error' })
      }
      return
    }
    const track = display.getVideoTracks()[0]
    if (!track) return
    if (otherPresenterId()) {
      stopTrack(track)
      toast.push({ title: 'Someone is already presenting.', durationMs: 3000 })
      return
    }
    try {
      track.contentHint = 'detail'
    } catch {
      // Older browsers ignore contentHint.
    }
    localScreenStream.value = new MediaStream([track])
    isScreenSharing.value = true
    track.onended = () => {
      void stopScreenShare()
    }
    await rt.transport?.setLocalTrack('screen', track)
    const current = call.value
    if (current) presence.emitCallsState(current.id, { screenSharing: true })
  }

  async function stopScreenShare(): Promise<void> {
    if (!isScreenSharing.value) return
    const stream = localScreenStream.value
    // Release capture before awaiting WebRTC. A stalled sender must never keep the
    // browser's screen-capture session running after the user presses Stop.
    localScreenStream.value = null
    isScreenSharing.value = false
    for (const track of stream?.getTracks() ?? []) {
      track.onended = null
      stopTrack(track)
    }
    const current = call.value
    if (current) presence.emitCallsState(current.id, { screenSharing: false })
    await rt.transport?.setLocalTrack('screen', null)
  }

  async function toggleScreenShare(): Promise<void> {
    if (isScreenSharing.value) await stopScreenShare()
    else await startScreenShare()
  }


  /** iOS stops camera/mic tracks when the page is frozen; grab them again if they died. */
  async function restoreLocalTracks() {
    if (phase.value !== 'in_call' && phase.value !== 'outgoing') return
    if (isMicEnabled.value) {
      const audio = localAudioTrack()
      if (!audio || audio.readyState === 'ended') {
        const got = await acquireAudioTrack({ audioDeviceId: audioDeviceId.value })
        if (got.track) {
          got.track.enabled = true
          const prev = localAudioTrack()
          const s = new MediaStream(localStream.value?.getTracks().filter((t) => t !== prev) ?? [])
          s.addTrack(got.track)
          localStream.value = s
          stopTrack(prev)
          await rt.transport?.setLocalTrack('audio', got.track)
        }
      }
    }
    if (isCameraEnabled.value && !isScreenSharing.value) {
      const video = localVideoTrack()
      if (!video || video.readyState === 'ended') {
        const got = await acquireVideoTrack({ videoDeviceId: videoDeviceId.value, facingMode: facingMode.value })
        if (got.track) await replaceVideoTrack(got.track)
      }
    }
  }

  return {
    localAudioTrack,
    localVideoTrack,
    localScreenTrack,
    otherPresenterId,
    releaseLocalMedia,
    acquireForCall,
    toggleMic,
    toggleCamera,
    replaceVideoTrack,
    switchCamera,
    setCameraDevice,
    setMicrophoneDevice,
    setSpeakerDevice,
    startScreenShare,
    stopScreenShare,
    toggleScreenShare,
    restoreLocalTracks,
  }
}

export type CallMediaContext = ReturnType<typeof useCallMedia>
