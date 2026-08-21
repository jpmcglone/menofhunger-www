import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

function readFromRepo(rel: string): string {
  return readFileSync(resolve(process.cwd(), rel), 'utf8')
}

describe('unique people + total views', () => {
  it('measures feed visibility against the middle scroller, not the window', () => {
    const tracker = readFromRepo('composables/usePostViewTracker.ts')
    const postRow = readFromRepo('components/app/PostRow.vue')
    const feedRow = readFromRepo('components/app/FeedPostRow.vue')
    const checkinDay = readFromRepo('pages/check-ins/day/[dayKey].vue')
    const checkinSort = readFromRepo('pages/check-ins/[sort].vue')

    expect(tracker).toContain('VISIBILITY_THRESHOLD = 0.5')
    expect(tracker).toContain('entry.intersectionRatio >= VISIBILITY_THRESHOLD')
    expect(tracker).toContain('entry.intersectionRect.height >= VISIBLE_PX_FALLBACK')
    expect(tracker).toContain('root: opts?.root ?? null')
    expect(postRow).toContain('root: middleScrollerEl.value ?? null')
    expect(feedRow).toContain('root: middleScrollerEl.value ?? null')
    expect(checkinDay).toContain('AppFeedPostRow')
    expect(checkinSort).toContain('AppFeedPostRow')
  })

  it('re-reports after 30s and applies HTTP view acks', () => {
    const tracker = readFromRepo('composables/usePostViewTracker.ts')
    expect(tracker).toContain('REREPORT_INTERVAL_MS = 30_000')
    expect(tracker).toContain('applyAcks')
    expect(tracker).toContain('ack.totalCounted')
    expect(tracker).toContain('ack.uniqueCounted')
    expect(tracker).toContain('delta.totalViewCount')
  })

  it('keeps the view chip under the body with person/eye icons', () => {
    const postRow = readFromRepo('components/app/PostRow.vue')
    const actionBar = readFromRepo('components/app/post/PostRowActionBar.vue')
    const chip = readFromRepo('components/app/post/PostRowViewerBreakdown.vue')

    expect(postRow).toContain('AppPostRowViewerBreakdown')
    expect(postRow).toContain('class="mt-3.5 flex items-center justify-between gap-3"')
    expect(postRow).toContain('border-t moh-border')
    expect(actionBar).not.toContain('AppPostRowViewerBreakdown')
    expect(actionBar).not.toContain('tabler:eye')
    expect(chip).toContain('tabler:user')
    expect(chip).toContain('tabler:eye')
    expect(chip).toContain('people')
    expect(chip).toContain('total views')
    expect(chip).toContain("peopleVerb: 'saw this'")
    expect(chip).toContain('onViewerCountClick')
    expect(chip).toContain('isCoarsePointer')
    expect(chip).toContain('@click.stop.prevent="onViewerCountClick"')
  })

  it('uses landing headline totals with unique available on hover', () => {
    const landing = readFromRepo('pages/index.vue')
    expect(landing).toContain('total views')
    expect(landing).toContain("label: 'Unique views'")
    expect(landing).toContain('s.unique ?? s.total')
  })

  it('shows people and total views in admin analytics', () => {
    const analytics = readFromRepo('pages/admin/analytics.vue')
    expect(analytics).toContain('People')
    expect(analytics).toContain('uniqueViewCount')
    expect(analytics).toContain('uniqueViewsInRange')
    expect(analytics).toContain('first-time viewers')
  })
})
