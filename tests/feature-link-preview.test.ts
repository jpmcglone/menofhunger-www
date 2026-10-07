import { describe, expect, it } from 'vitest'
import { writeFileSync } from 'node:fs'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import FeatureLinkPreview from '~/components/app/content/FeatureLinkPreview.vue'
import { featurePageForPath, featurePages } from '~/utils/feature-pages'

describe('feature link previews', () => {
  it.each([
    ['/a', 'Articles'], ['/articles/', 'Articles'], ['/b?tag=hobbies', 'hobbies · Boards'],
    ['/b/thread/c/comment', 'Board comment'], ['/fitness/activities/id', 'Fitness activity'],
    ['/daily/word', 'Word of the day'], ['/map?state=va', 'VA · Member map'], ['/radio', 'Spaces'],
  ])('resolves %s without deriving labels from URL initials', (path, title) => {
    expect(featurePageForPath(path)?.title).toBe(title)
  })

  it('uses segment boundaries and rejects unrelated routes', () => {
    expect(featurePageForPath('/bogus')).toBeNull()
    expect(featurePageForPath('/articlesomething')).toBeNull()
    expect(featurePageForPath('/u/john')).toBeNull()
    expect(featurePageForPath('/map?state=<script>')?.image).toBe('/og/map.png')
  })

  it('every feature has a description and a usable image path', () => {
    for (const feature of featurePages) {
      expect(feature.description.length).toBeGreaterThan(10)
      expect(feature.image).toMatch(/^\/(images\/features\/.+-v1\.png|og\/map\.png)$/)
    }
  })

  it('renders a stable feature card before metadata arrives and keeps navigation on image failure', async () => {
    const wrapper = await mountSuspended(FeatureLinkPreview, { props: { path: '/b?tag=hobbies' } })
    expect(wrapper.get('a').attributes('href')).toBe('/b?tag=hobbies')
    expect(wrapper.text()).toContain('hobbies · Boards')
    expect(wrapper.get('img').attributes('src')).toBe('/images/features/boards-v1.png')
    if (process.env.MOH_PREVIEW_HTML) writeFileSync(process.env.MOH_PREVIEW_HTML, wrapper.html())
    await wrapper.get('img').trigger('error')
    expect(wrapper.find('img').exists()).toBe(false)
    expect(wrapper.text()).toContain('Discussion, questions, and ideas')
    expect(wrapper.get('a').attributes('href')).toBe('/b?tag=hobbies')
    await wrapper.setProps({ path: '/fitness' })
    expect(wrapper.get('img').attributes('src')).toBe('/images/features/fitness-v1.png')
    wrapper.unmount()
  })

  it('old B/login metadata cannot replace feature labels or artwork', async () => {
    const wrapper = await mountSuspended(FeatureLinkPreview, { props: {
      path: '/b', metadata: { url: 'https://menofhunger.com/b', title: 'B', description: null, imageUrl: null, siteName: 'Men of Hunger', socialPost: null, videoEmbed: null },
    } })
    expect(wrapper.get('a').attributes('aria-label')).toBe('Open Boards')
    expect(wrapper.get('img').attributes('src')).toContain('boards-v1.png')
    wrapper.unmount()
  })
})

describe('client-only feature share metadata', () => {
  it('puts Fitness artwork in the initial HTML without rendering private data', async () => {
    const { featureShareHead } = await import('../server/utils/feature-share-head')
    const head = featureShareHead('/fitness/activities/private-id', '')!
    expect(head).toContain('og:image')
    expect(head).toContain('/images/features/fitness-v1.png')
    expect(head).not.toContain('private-id')
    expect(head).toContain('summary_large_image')
  })

  it('preserves SSR content artwork and escapes user-controlled filter labels', async () => {
    const { featureShareHead } = await import('../server/utils/feature-share-head')
    expect(featureShareHead('/a/article', '<meta property="og:image" content="article.png">')).toBeNull()
    const head = featureShareHead('/b?tag=%22%3E%3Cscript%3E', '')!
    expect(head).not.toContain('<script>')
    expect(head).toContain('&lt;script&gt;')
    expect(featureShareHead('/settings', '')).toBeNull()
  })
})
