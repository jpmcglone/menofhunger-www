import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const source = readFileSync(resolve(process.cwd(), 'pages/groups/index.vue'), 'utf8')

describe('groups hub lock-screen clear', () => {
  it('clears group APNs when the hub is opened, not the notifications inbox', () => {
    expect(source).toContain("clearLockScreen('groups')")
    expect(source).not.toContain("clearLockScreen('inbox')")
    expect(source).toContain('onMounted')
    expect(source).toContain('onActivated')
  })
})
