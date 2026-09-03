import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

function readFromRepo(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), 'utf8')
}

describe('first-run coordinator', () => {
  it('sequences photo, profile, and email before location and announcements', () => {
    const overlays = readFromRepo('components/app/layout/GlobalOverlays.vue')
    const photoAt = overlays.indexOf('<AppFirstRunPhotoPrompt')
    const profileAt = overlays.indexOf('<AppFirstRunProfileSheet')
    const emailAt = overlays.indexOf('<AppAddEmailPrompt')
    const locationAt = overlays.indexOf('<AppLocationPromptModal')
    const announcementsAt = overlays.indexOf('<AppAnnouncementHost')
    expect(photoAt).toBeGreaterThan(-1)
    expect(profileAt).toBeGreaterThan(photoAt)
    expect(emailAt).toBeGreaterThan(profileAt)
    expect(locationAt).toBeGreaterThan(emailAt)
    expect(announcementsAt).toBeGreaterThan(locationAt)
    expect(overlays).toMatch(/consumeWelcomeQuery/)
  })

  it('blocks location and announcements while a first-run sheet is open', () => {
    const location = readFromRepo('components/app/AppLocationPromptModal.vue')
    const announcements = readFromRepo('composables/useAnnouncements.ts')
    expect(location).toContain('if (firstRunBlocked.value) return false')
    expect(announcements).toContain('if (firstRunBlocked.value) return false')
    expect(announcements).toContain('if (firstRunBlocked.value) return true')
  })

  it('treats ?welcome=1 as a photo interstitial, not a profile-edit jump', () => {
    const flow = readFromRepo('composables/useFirstRunFlow.ts')
    const login = readFromRepo('pages/login.vue')
    const gate = readFromRepo('components/app/OnboardingGate.vue')
    expect(flow).toMatch(/function consumeWelcomeQuery/)
    expect(flow).toMatch(/startAfterOnboarding\(\)/)
    expect(flow).toMatch(/step\.value = 'photo'/)
    expect(login).toMatch(/\/home\?welcome=1/)
    expect(login).not.toMatch(/pending-edit-profile/)
    expect(gate).toMatch(/startAfterOnboarding\(\)/)
    expect(gate).not.toMatch(/pending-edit-profile/)
  })

  it('keeps email recovery optional and skippable', () => {
    const email = readFromRepo('components/app/AddEmailPrompt.vue')
    expect(email).toMatch(/Account recovery/)
    expect(email).toMatch(/Add an email for account recovery/)
    expect(email).toMatch(/if you lose access to your phone number/)
    expect(email).toMatch(/label="Skip"/)
    expect(email).toMatch(/finishEmail/)
  })
})

describe('login first-run surfaces', () => {
  const login = readFromRepo('pages/login.vue')

  it('explains international phone entry and 18+ on the signup intro', () => {
    expect(login).toMatch(/start with \+ and your country code/)
    expect(login).toMatch(/You must be 18\+ to join/)
    expect(login).toMatch(/<NuxtLink to="\/terms"/)
    expect(login).toMatch(/<NuxtLink to="\/privacy"/)
    expect(login).not.toMatch(/https:\/\/menofhunger\.com\/(terms|privacy)/)
  })

  it('uses a full-viewport signup intro on mobile and a card on desktop', () => {
    expect(login).toMatch(/class="relative flex h-full w-full flex-col/)
    expect(login).toMatch(/sm:h-auto sm:max-h-\[min\(90vh,36rem\)\] sm:max-w-md sm:rounded-2xl/)
  })

  it('surfaces banned and deleted accounts on phone start and verify', () => {
    expect(login).toMatch(/account_banned/)
    expect(login).toMatch(/account_deleted/)
    expect(login).toMatch(/function showAccountNotice/)
    expect(login).toMatch(/This account was banned/)
    expect(login).toMatch(/Your account has been deleted/)
  })

  it('auto-submits a 6-digit OTP without a second Continue button', () => {
    const otpStart = login.indexOf('One-time code')
    const otp = otpStart >= 0 ? login.slice(otpStart, login.indexOf('<Teleport')) : ''
    expect(otp).toMatch(/maxlength="6"/)
    expect(login).toMatch(/digits\.length === 6/)
    expect(login).toMatch(/void submitCode\(\)/)
    expect(otp).not.toMatch(/label="Continue"/)
    expect(otp).not.toMatch(/aria-label="Continue"/)
  })
})
