import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { downsampleToRate, encodeWav, pickVoiceRecorderMime } from '../../composables/chat/useVoiceRecorder'

const root = resolve(import.meta.dirname, '../..')
const read = (p: string) => readFileSync(resolve(root, p), 'utf8')

describe('voice recorder', () => {
  it('prefers audio/mp4 when the browser supports it', () => {
    const src = read('composables/chat/useVoiceRecorder.ts')
    expect(src).toContain("MediaRecorder.isTypeSupported('audio/mp4')")
    expect(src).toContain('encodeWav')
    expect(src).toContain('VOICE_NOTE_MAX_SECONDS = 120')
    expect(pickVoiceRecorderMime()).toBeNull()
  })

  it('encodes a mono 16-bit WAV header', () => {
    const samples = new Float32Array([0, 0.5, -0.5, 1])
    const blob = encodeWav(samples, 16_000)
    expect(blob.type).toBe('audio/wav')
    expect(blob.size).toBe(44 + samples.length * 2)
  })

  it('downsamples longer buffers to 16 kHz', () => {
    const input = new Float32Array(48_000)
    const out = downsampleToRate(input, 48_000, 16_000)
    expect(out.length).toBe(16_000)
  })
})

describe('voice note chrome', () => {
  it('shows a mic when the composer is empty and verified', () => {
    const composer = read('components/app/DmComposer.vue')
    expect(composer).toContain('chat-voice-mic')
    expect(composer).toContain('showMic')
    expect(composer).toContain('enqueueAudio')
    const media = read('composables/useComposerMedia.ts')
    expect(media).toContain("kind: 'audio'")
  })

  it('renders ChatAudioMessage for audio media', () => {
    const row = read('components/app/chat/ChatMessageListRow.vue')
    expect(row).toContain("media.kind === 'audio'")
    expect(row).toContain('ChatAudioMessage')
    const player = read('components/app/chat/ChatAudioMessage.vue')
    expect(player).toContain('chat-audio-message')
    expect(player).toContain('cycleRate')
  })
})
