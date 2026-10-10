import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, unref } from 'vue'
import { mount, type VueWrapper } from '@vue/test-utils'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { siteConfig } from '../config/site'
import { usePageSeo } from '../composables/usePageSeo'

const capture = vi.hoisted(() => ({ seo: vi.fn(), head: vi.fn(), path: '/' }))
mockNuxtImport('useSeoMeta', () => capture.seo)
mockNuxtImport('useHead', () => capture.head)
mockNuxtImport('useRoute', () => () => ({ path: capture.path, fullPath: capture.path, meta: {}, query: {} }))
mockNuxtImport('useRuntimeConfig', () => () => ({ public: {} }))
let wrapper: VueWrapper | undefined
beforeEach(() => { capture.path = '/'; capture.seo.mockClear(); capture.head.mockClear() })
afterEach(() => { wrapper?.unmount() })
function render(options: Parameters<typeof usePageSeo>[0]) {
  wrapper = mount(defineComponent({ setup() { usePageSeo(options); return () => null } }))
  return capture.seo.mock.calls[0]![0]
}

describe('homepage sharing', () => {
  it('emits the invitation and absolute artwork URL for both Open Graph and X', () => {
    const seo = render({ ...siteConfig.homeShare, description: siteConfig.meta.description, canonicalPath: '/' })
    expect(unref(seo.title)).toBe(siteConfig.homeShare.title)
    for (const key of ['ogTitle', 'twitterTitle']) expect(unref(seo[key])).toBe(siteConfig.homeShare.title)
    for (const key of ['ogImage', 'twitterImage']) expect(unref(seo[key])).toBe('https://menofhunger.com/images/social/home-v1.png')
    for (const key of ['ogDescription', 'twitterDescription']) expect(unref(seo[key])).toBe(siteConfig.meta.description)
    expect(unref(seo.twitterCard)).toBe('summary_large_image')
    expect(unref(seo.ogImageAlt)).toBe(siteConfig.homeShare.imageAlt)
    const head = capture.head.mock.calls[0]![0]
    expect(unref(head.link)[0].href).toBe('https://menofhunger.com/')
    expect(unref(head.meta)).toEqual(expect.arrayContaining([
      { property: 'og:image:width', content: '1200' },
      { property: 'og:image:height', content: '630' },
    ]))
  })

  it('keeps the default homepage title and other page suffixes intact', () => {
    expect(unref(render({}).title)).toBe('Men of Hunger')
    wrapper?.unmount()
    capture.seo.mockClear()
    capture.path = '/about'
    expect(unref(render({ title: 'About' }).title)).toBe('About | Men of Hunger')
  })

  it('ships a real PNG matching the declared unfurl dimensions', () => {
    const png = readFileSync(resolve(process.cwd(), `public${siteConfig.homeShare.image}`))
    expect(png.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a')
    expect(png.readUInt32BE(16)).toBe(siteConfig.homeShare.imageWidth)
    expect(png.readUInt32BE(20)).toBe(siteConfig.homeShare.imageHeight)
    expect(png.length).toBeLessThan(1_000_000)
  })
})
