import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { postsFeedListQuery } from '~/composables/usePostsFeed'

function readFromRepo(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), 'utf8')
}

describe('home feed query shape', () => {
  it('distinguishes Posts and Replies by topLevelOnly', () => {
    const postsQuery = postsFeedListQuery({
      visibility: 'all',
      followingOnly: false,
      sort: 'new',
      forYou: false,
      cursor: null,
      topLevelOnly: true,
    })
    const repliesQuery = postsFeedListQuery({
      visibility: 'all',
      followingOnly: false,
      sort: 'new',
      forYou: false,
      cursor: null,
      topLevelOnly: false,
    })

    expect(postsQuery.topLevelOnly).toBe(true)
    expect(repliesQuery.topLevelOnly).toBeUndefined()
  })

  it('keeps media For You, Following, and All requests distinct', () => {
    const forYouMedia = postsFeedListQuery({
      visibility: 'all',
      followingOnly: false,
      sort: 'new',
      forYou: true,
      cursor: null,
      mediaOnly: true,
      limit: 40,
    })
    const followingMedia = postsFeedListQuery({
      visibility: 'all',
      followingOnly: true,
      sort: 'new',
      forYou: false,
      cursor: null,
      mediaOnly: true,
      limit: 40,
    })
    const allMedia = postsFeedListQuery({
      visibility: 'all',
      followingOnly: false,
      sort: 'new',
      forYou: false,
      cursor: null,
      mediaOnly: true,
      limit: 40,
    })

    expect(forYouMedia).toMatchObject({ mediaOnly: true, sort: 'forYou', limit: 40 })
    expect(followingMedia).toMatchObject({ mediaOnly: true, followingOnly: true, limit: 40 })
    expect(allMedia).toMatchObject({ mediaOnly: true, limit: 40 })
    expect(allMedia.sort).toBeUndefined()
    expect(allMedia.followingOnly).toBeUndefined()
  })

  it('sends trending sort for Following and All media', () => {
    const followingTrendingMedia = postsFeedListQuery({
      visibility: 'all',
      followingOnly: true,
      sort: 'trending',
      forYou: false,
      cursor: null,
      mediaOnly: true,
      limit: 40,
    })
    const allTrendingMedia = postsFeedListQuery({
      visibility: 'all',
      followingOnly: false,
      sort: 'trending',
      forYou: false,
      cursor: null,
      mediaOnly: true,
      limit: 40,
    })

    expect(followingTrendingMedia).toMatchObject({ mediaOnly: true, followingOnly: true, sort: 'trending' })
    expect(allTrendingMedia).toMatchObject({ mediaOnly: true, sort: 'trending' })
    expect(allTrendingMedia.followingOnly).toBeUndefined()
  })
})

describe('home feed refresh guardrails', () => {
  it('collapses the home composer chrome without unmounting the editor', () => {
    const home = readFromRepo('pages/home.vue')
    const composer = readFromRepo('components/app/PostComposer.vue')
    expect(home).toMatch(/<LazyAppPostComposer[\s\S]*?collapse-until-focus/)
    expect(composer).toContain('collapseUntilFocus?: boolean')
    expect(composer).toContain('v-show="!showCollapsedComposer"')
    expect(composer).toContain('if (props.collapseUntilFocus) composerExpanded.value = true')
    expect(composer).not.toMatch(/v-if="!showCollapsedComposer"/)
  })

  it('keeps signed-out home on the cacheable trending feed and pauses ad rows', () => {
    const src = readFromRepo('composables/useHomeFeed.ts')
    expect(src).toContain("const forYou = computed(() => isAuthed.value && feedScope.value === 'forYou')")
    expect(src).toContain('const showAds = computed(() => false)')
  })

  it('waits for the initial feed before fetching the groups onboarding count', () => {
    const src = readFromRepo('pages/home.vue')
    expect(src).toContain('[isAuthed, isPageAccount, initialFeedResolved, groupsNudgeDismissed]')
    expect(src).toContain('if (feedResolved && !dismissed && myGroupsCount.value === null)')
    expect(src).not.toMatch(/watch\(isAuthed,[\s\S]*refreshMyGroupsCount/)
  })

  it('refreshes from the canonical request key', () => {
    const src = readFromRepo('composables/usePostsFeed.ts')
    expect(src).toContain('() => [feedEnabled(), currentRequestKey()] as const')
  })

  it('re-reports already-viewed feed posts so For You lastSeenAt can move', () => {
    const feedRow = readFromRepo('components/app/FeedPostRow.vue')
    const postRow = readFromRepo('components/app/PostRow.vue')
    const tracker = readFromRepo('composables/usePostViewTracker.ts')

    expect(feedRow).not.toContain('.filter((p) => p.viewerHasViewed !== true)')
    expect(postRow).not.toMatch(/if \(postView\.value\.viewerHasViewed === true\) \{\s*noteAlreadyViewed\(postView\.value\.id\)\s*return/)
    expect(tracker).toContain('already-viewed posts still report once this page load')
  })

  it('clamps the collapsed reply footer count and only shows it when positive', () => {
    const src = readFromRepo('components/app/FeedPostRow.vue')
    // Count now comes from `threadCollapsedCount` (stamped by feed dedupe) via the
    // `collapsedSiblingRepliesCount` prop, not derived inside the row. It must be
    // clamped non-negative and the footer only renders when the count is > 0.
    expect(src).toContain('Math.max(0, Math.floor(props.collapsedSiblingRepliesCount ?? 0))')
    expect(src).toContain('collapsedSiblingRepliesCount.value > 0 && rootPostId.value')
  })

  it('keeps feed post rows clickable before child stop handlers can swallow clicks', () => {
    const postRow = readFromRepo('components/app/PostRow.vue')
    const linkPreview = readFromRepo('components/app/post/PostRowLinkPreview.vue')

    expect(postRow).toContain('withDefaults(defineProps<')
    expect(postRow).toContain('clickable: true')
    expect(postRow).toContain('@click.capture="onRowClick"')
    expect(postRow).toContain('@auxclick.capture="onRowAuxClick"')
    expect(postRow).toContain('raw instanceof Element')
    expect(postRow).toContain("raw?.parentElement ?? null")
    expect(postRow).toContain("'[data-post-row-interactive]'")
    expect(postRow).not.toContain('<div v-if="$slots.threadFooter" class="mt-1" @click.stop>')
    expect(linkPreview).toContain('data-post-row-interactive')
  })

  it('sends refresh=true only on cursor-less For You requests', () => {
    const refreshed = postsFeedListQuery({
      visibility: 'all',
      followingOnly: false,
      sort: 'new',
      forYou: true,
      cursor: null,
      refresh: true,
    })
    const paged = postsFeedListQuery({
      visibility: 'all',
      followingOnly: false,
      sort: 'new',
      forYou: true,
      cursor: 'abc',
      refresh: true,
    })
    const following = postsFeedListQuery({
      visibility: 'all',
      followingOnly: true,
      sort: 'new',
      forYou: false,
      cursor: null,
      refresh: true,
    })
    expect(refreshed).toMatchObject({ sort: 'forYou', refresh: true })
    expect(paged.refresh).toBeUndefined()
    expect(following.refresh).toBeUndefined()
  })

  it('hard-refreshes For You on activate and wires home pull-to-refresh', () => {
    const src = readFromRepo('pages/home.vue')
    expect(src).toContain(':seen-aware-collapse="forYou"')
    expect(src).toContain('if (forYou.value)')
    expect(src).toContain('void refresh({ forYouRefresh: true })')
    expect(src).toContain('onHomePullEnd')
    expect(src).toContain('refresh({ forYouRefresh: Boolean(forYou.value) })')
    expect(src).toContain('handleFeedScopeReselect')
  })
})
