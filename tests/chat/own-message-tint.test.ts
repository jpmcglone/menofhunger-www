import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { ownMessageTintStyle } from '../../utils/user-tier'

const root = resolve(__dirname, '../..')
const read = (path: string) => readFileSync(resolve(root, path), 'utf8')

describe('ownMessageTintStyle', () => {
  it('washes the sender tier color rather than filling with it', () => {
    expect(ownMessageTintStyle('premium').backgroundColor).toBe(
      'color-mix(in srgb, var(--moh-premium) 14%, transparent)',
    )
    expect(ownMessageTintStyle('verified').backgroundColor).toBe(
      'color-mix(in srgb, var(--moh-verified) 14%, transparent)',
    )
    expect(ownMessageTintStyle('organization').backgroundColor).toBe(
      'color-mix(in srgb, var(--moh-org) 14%, transparent)',
    )
  })

  it('falls back to a neutral wash at the same strength for untiered senders', () => {
    expect(ownMessageTintStyle('normal').backgroundColor).toBe(
      'color-mix(in srgb, rgb(148 163 184) 14%, transparent)',
    )
  })
})

describe('own-message background is shared across chat surfaces', () => {
  it('both the DM bubble and the Spaces live chat row use the shared tint', () => {
    expect(read('components/app/chat/ChatMessageListRow.vue')).toContain('ownMessageTintStyle(')
    expect(read('components/app/radio/RadioLiveChatMessageRow.vue')).toContain(
      'ownMessageTintStyle(',
    )
  })

  it('outgoing DM bubbles no longer paint a solid tier fill', () => {
    const chatPage = read('pages/chat.vue')

    // A solid fill forced white body text, which the low-opacity wash cannot support.
    expect(chatPage).not.toContain('backdrop-blur-sm text-white')
    expect(chatPage).not.toContain('rgba(var(--moh-premium-rgb),0.72)')
    expect(chatPage).not.toContain('rgba(var(--moh-verified-rgb),0.72)')
    expect(chatPage).not.toContain('bg-gray-500/60')
  })

  it('drops the colored-background escape hatch that forced white mentions', () => {
    expect(read('components/app/chat/ChatMessageListRow.vue')).not.toContain(
      'on-colored-background',
    )
    expect(read('components/app/chat/ChatMessageRichBody.vue')).not.toContain(
      'onColoredBackground',
    )
  })
})
