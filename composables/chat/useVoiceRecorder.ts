import { ref, type Ref } from 'vue'

export const VOICE_NOTE_MAX_SECONDS = 120
const WAV_SAMPLE_RATE = 16_000

export function pickVoiceRecorderMime(): string | null {
  if (!import.meta.client || typeof MediaRecorder === 'undefined') return null
  if (MediaRecorder.isTypeSupported('audio/mp4')) return 'audio/mp4'
  if (MediaRecorder.isTypeSupported('audio/mp4;codecs=mp4a.40.2')) return 'audio/mp4'
  return null
}

/** 16-bit mono PCM WAV — universal playback when MediaRecorder can't do mp4. */
export function encodeWav(samples: Float32Array, sampleRate: number): Blob {
  const bytes = samples.length * 2
  const buffer = new ArrayBuffer(44 + bytes)
  const view = new DataView(buffer)
  const write = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i += 1) view.setUint8(offset + i, text.charCodeAt(i))
  }
  write(0, 'RIFF')
  view.setUint32(4, 36 + bytes, true)
  write(8, 'WAVE')
  write(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  write(36, 'data')
  view.setUint32(40, bytes, true)
  let offset = 44
  for (let i = 0; i < samples.length; i += 1) {
    const s = Math.max(-1, Math.min(1, samples[i] ?? 0))
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true)
    offset += 2
  }
  return new Blob([buffer], { type: 'audio/wav' })
}

export function downsampleToRate(input: Float32Array, fromRate: number, toRate: number): Float32Array {
  if (fromRate === toRate || fromRate <= 0) return input
  const ratio = fromRate / toRate
  const outLength = Math.max(1, Math.round(input.length / ratio))
  const out = new Float32Array(outLength)
  for (let i = 0; i < outLength; i += 1) {
    const src = i * ratio
    const i0 = Math.floor(src)
    const i1 = Math.min(input.length - 1, i0 + 1)
    const t = src - i0
    out[i] = (input[i0] ?? 0) * (1 - t) + (input[i1] ?? 0) * t
  }
  return out
}

export type VoiceRecorder = {
  recording: Ref<boolean>
  elapsed: Ref<number>
  level: Ref<number>
  start: () => Promise<void>
  stop: () => Promise<{ file: File; durationSeconds: number } | null>
  cancel: () => void
}

export function useVoiceRecorder(): VoiceRecorder {
  const recording = ref(false)
  const elapsed = ref(0)
  const level = ref(0)

  let media: MediaRecorder | null = null
  let chunks: Blob[] = []
  let stream: MediaStream | null = null
  let ctx: AudioContext | null = null
  let analyser: AnalyserNode | null = null
  let pcm: Float32Array[] = []
  let processor: ScriptProcessorNode | null = null
  let timer: ReturnType<typeof setInterval> | null = null
  let startedAt = 0
  let mime: string | null = null
  let stopResolve: ((value: { file: File; durationSeconds: number } | null) => void) | null = null

  function clearTimer() {
    if (timer) clearInterval(timer)
    timer = null
  }

  function teardownTracks() {
    stream?.getTracks().forEach((t) => t.stop())
    stream = null
    try {
      processor?.disconnect()
    } catch {
      // ignore
    }
    processor = null
    analyser = null
    if (ctx) {
      void ctx.close().catch(() => {})
      ctx = null
    }
    media = null
    chunks = []
    pcm = []
    recording.value = false
    level.value = 0
    clearTimer()
  }

  function tick() {
    elapsed.value = Math.min(VOICE_NOTE_MAX_SECONDS, (Date.now() - startedAt) / 1000)
    if (analyser) {
      const buf = new Float32Array(analyser.fftSize)
      analyser.getFloatTimeDomainData(buf)
      let sum = 0
      for (let i = 0; i < buf.length; i += 1) sum += (buf[i] ?? 0) ** 2
      level.value = Math.sqrt(sum / buf.length)
    }
    if (elapsed.value >= VOICE_NOTE_MAX_SECONDS) void stop()
  }

  async function start() {
    if (!import.meta.client || recording.value) return
    stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    mime = pickVoiceRecorderMime()
    startedAt = Date.now()
    elapsed.value = 0
    recording.value = true

    const Ctor =
      (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext
      ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (Ctor) {
      ctx = new Ctor()
      const source = ctx.createMediaStreamSource(stream)
      analyser = ctx.createAnalyser()
      analyser.fftSize = 1024
      source.connect(analyser)
      if (!mime) {
        processor = ctx.createScriptProcessor(4096, 1, 1)
        processor.onaudioprocess = (e) => {
          pcm.push(new Float32Array(e.inputBuffer.getChannelData(0)))
        }
        const mute = ctx.createGain()
        mute.gain.value = 0
        analyser.connect(processor)
        processor.connect(mute)
        mute.connect(ctx.destination)
      }
    }

    if (mime) {
      chunks = []
      media = new MediaRecorder(stream, { mimeType: mime })
      media.ondataavailable = (e) => {
        if (e.data.size) chunks.push(e.data)
      }
      media.onstop = () => {
        const durationSeconds = Math.max(1, Math.round((Date.now() - startedAt) / 1000))
        const blob = new Blob(chunks, { type: mime ?? 'audio/mp4' })
        const file = new File([blob], `voice-${Date.now()}.m4a`, { type: mime ?? 'audio/mp4' })
        stopResolve?.({ file, durationSeconds })
        stopResolve = null
        teardownTracks()
      }
      media.start(250)
    }

    timer = setInterval(tick, 100)
  }

  function stop(): Promise<{ file: File; durationSeconds: number } | null> {
    if (!recording.value) return Promise.resolve(null)
    return new Promise((resolve) => {
      if (media && media.state !== 'inactive') {
        stopResolve = resolve
        media.stop()
        return
      }
      const durationSeconds = Math.max(1, Math.round((Date.now() - startedAt) / 1000))
      const rate = ctx?.sampleRate ?? WAV_SAMPLE_RATE
      const total = pcm.reduce((n, c) => n + c.length, 0)
      const merged = new Float32Array(total)
      let offset = 0
      for (const chunk of pcm) {
        merged.set(chunk, offset)
        offset += chunk.length
      }
      const samples = downsampleToRate(merged, rate, WAV_SAMPLE_RATE)
      const blob = encodeWav(samples, WAV_SAMPLE_RATE)
      const file = new File([blob], `voice-${Date.now()}.wav`, { type: 'audio/wav' })
      teardownTracks()
      resolve({ file, durationSeconds })
    })
  }

  function cancel() {
    stopResolve?.(null)
    stopResolve = null
    if (media && media.state !== 'inactive') {
      try {
        media.onstop = null
        media.stop()
      } catch {
        // ignore
      }
    }
    teardownTracks()
    elapsed.value = 0
  }

  return { recording, elapsed, level, start, stop, cancel }
}
