import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('email unsubscribe page', () => {
  const page = readFileSync(resolve(process.cwd(), 'pages/email/unsubscribe.vue'), 'utf8')

  it('asks before unsubscribing and does not fire on mount', () => {
    expect(page).not.toMatch(/onMounted/)
    expect(page).toMatch(/label="Unsubscribe from newsletters"/)
    expect(page).toMatch(/to="\/settings\/notifications"/)
    expect(page).toMatch(/Weekly digest and other emails stay on/)
  })
})
