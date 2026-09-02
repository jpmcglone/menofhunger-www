import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pickVoicemailRecorderMime, VOICEMAIL_MAX_SECONDS } from '../../composables/calls/callVoicemail'

const root = resolve(import.meta.dirname, '../..')
const read = (p: string) => readFileSync(resolve(root, p), 'utf8')

describe('voicemail recorder', () => {
  it('prefers mp4 and caps at 60 seconds', () => {
    expect(VOICEMAIL_MAX_SECONDS).toBe(60)
    const src = read('composables/calls/callVoicemail.ts')
    expect(src).toContain('video/mp4;codecs=avc1')
    expect(pickVoicemailRecorderMime()).toMatch(/^video\//)
  })
})

describe('missed-call voicemail chrome', () => {
  it('offers leave-a-message to the caller and renders attached video', () => {
    const row = read('components/app/chat/ChatMessageCallRow.vue')
    expect(row).toContain('call-leave-voicemail')
    expect(row).toContain("outcome === 'missed'")
    expect(row).toContain('Left you a video message')
    expect(row).toContain('object-contain')
    const host = read('components/app/calls/CallHost.vue')
    expect(host).toContain('CallVoicemailRecorder')
    expect(host).toContain('pendingVoicemail')
  })
})
