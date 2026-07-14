import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

function readFromRepo(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), 'utf8')
}

describe('useAuth hydration guardrails (structural)', () => {
  it('keeps badge hydration in one layout-owned composable', () => {
    const auth = readFromRepo('composables/useAuth.ts')
    const hydration = readFromRepo('composables/useBadgeHydration.ts')
    const layout = readFromRepo('layouts/app.vue')
    expect(auth).not.toMatch(/notifications-undelivered-count|messages-unread-counts/)
    expect(layout.match(/useBadgeHydration\(\)/g)).toHaveLength(1)
    expect(hydration).toMatch(/notificationUndeliveredCount/)
    expect(hydration).toMatch(/messageUnreadCounts/)
    expect(hydration).toMatch(/notificationUnreadCommentCount/)
    expect(hydration).toMatch(/groupsUnread/)
    expect(hydration).toMatch(/crewInviteInboxCount/)
  })

  it('keeps badge display composables free of automatic recovery side effects', () => {
    for (const path of [
      'composables/useNotificationsBadge.ts',
      'composables/useMessagesBadge.ts',
      'composables/useGroupsBadge.ts',
      'composables/useCrewInvitesBadge.ts',
    ]) {
      const src = readFromRepo(path)
      expect(src).not.toMatch(/\bwatch\(/)
      expect(src).not.toMatch(/visibilitychange/)
      expect(src).not.toMatch(/isSocketConnected/)
    }
  })

  it('never renders a badge or indicator on the Home navigation item', () => {
    const tabBar = readFromRepo('components/app/TabBar.vue')
    const leftRail = readFromRepo('components/app/layout/LeftRail.vue')

    expect(tabBar).not.toMatch(/item\.key === ['"]home['"]/)
    expect(leftRail).not.toMatch(/item\.key === ['"]home['"]/)
    expect(`${tabBar}\n${leftRail}`).not.toMatch(/AppHomeBadge/)
  })

  it('does not call useState inside me() after awaiting /auth/me', () => {
    const src = readFromRepo('composables/useAuth.ts')
    const meBlock =
      src.match(/async function me\(\): Promise<AuthUser \| null> \{[\s\S]*?\n {2}\}\n\n {2}async function ensureLoaded/)?.[0] ?? ''
    expect(meBlock).toContain(`await apiFetch<AuthUser | null>('/auth/me'`)
    expect(meBlock).not.toMatch(/useState<|useState\(/)
  })

  it('keeps SSR auth init cookie-gated before /auth/me fetch', () => {
    const src = readFromRepo('composables/useAuth.ts')
    expect(src).toMatch(/if \(import\.meta\.server\) \{/)
    expect(src).toMatch(/const cookieHeader = useRequestHeaders\(\['cookie'\]\)\.cookie/)
    expect(src).toMatch(/if \(!cookieHeader\?\.includes\('moh_session='\)\) \{\s*didAttempt\.value = true/)
    expect(src).toMatch(/await ensureLoaded\(\)/)
  })
})

