import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

function readFromRepo(rel: string): string {
  return readFileSync(resolve(process.cwd(), rel), 'utf8')
}

describe('notification live list + view-as-read', () => {
  it('applies notifications:new even when the viewer is not on /notifications', () => {
    const src = readFromRepo('composables/useNotifications.ts')
    const onNew = src.slice(src.indexOf('onNew: (payload)'), src.indexOf('onDeleted:'))
    expect(onNew).not.toMatch(/if \(!isNotificationsPage\.value\) return\s+\/\/ Silent/)
    expect(onNew).toContain('pendingRefresh.value = true')
    expect(onNew).toContain('if (!isNotificationsPage.value) return')
    expect(src).toContain('if (!n?.id || !notificationMatchesActiveKind(n)) return false')
    expect(src).not.toContain('if (groupedKinds.has(n.kind')
    expect(src).toContain("activeKind.value === 'followed_post'")
    expect(src).toContain("activeKind.value === 'comment'")
    expect(src).toContain('notificationIsReply')
  })

  it('refetches All when a badge arrived or a live row was missed off-page', () => {
    const page = readFromRepo('pages/notifications.vue')
    const syncStart = page.indexOf('function syncNotificationsOnEntry()')
    const sync = page.slice(syncStart, page.indexOf('onMounted(() =>', syncStart))
    expect(sync).toContain('badgeCountAtEntry > 0 || missedWhileAway')
    expect(sync).toContain('pendingRefresh.value')
    expect(page).toContain("if (route.path !== '/notifications') return")
  })

  it('marks post and reply notifications read when a view is recorded', () => {
    const permalink = readFromRepo('pages/p/[id].vue')
    const apiViews = readFromRepo('../menofhunger-api/src/modules/post-views/post-views.service.ts')
    const readState = readFromRepo('../menofhunger-api/src/modules/notifications/notification-read-state.service.ts')

    expect(permalink).toContain('markReadBySubject({ post_id: pid })')
    expect(apiViews).toContain('await this.notifications.markReadBySubjects(uid, expanded)')
    expect(readState).toContain('or.push({ subjectPostId: postId })')
    expect(readState).toContain('or.push({ actorPostId: postId })')
  })
})
