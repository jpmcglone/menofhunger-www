import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, ref, unref } from 'vue'
import { mount, type VueWrapper } from '@vue/test-utils'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { usePageSeo } from '../composables/usePageSeo'

const capture = vi.hoisted(() => ({ seo: vi.fn(), head: vi.fn() }))
mockNuxtImport('useSeoMeta', () => capture.seo)
mockNuxtImport('useHead', () => capture.head)
mockNuxtImport('useRoute', () => () => ({ path: '/u/john/links', fullPath: '/u/john/links', meta: {}, query: {} }))
mockNuxtImport('useRuntimeConfig', () => () => ({ public: {} }))
let wrapper: VueWrapper | undefined
beforeEach(() => { capture.seo.mockClear(); capture.head.mockClear() })
afterEach(() => { wrapper?.unmount() })

describe('page metadata navigation and safe server serialization', () => {
  it('updates canonical, structured data, and OG type together when the route changes', () => {
    const canonicalPath = ref('/u/john/links')
    const mainEntityId = ref('https://menofhunger.com/u/john#identity')
    const jsonLdGraph = ref([{ '@type': 'Person', '@id': mainEntityId.value, name: 'John' }])
    const ogType = ref<'profile' | 'website'>('profile')
    const webPageType = ref<'ProfilePage' | 'WebPage'>('ProfilePage')
    wrapper = mount(defineComponent({ setup() {
      usePageSeo({ canonicalPath, mainEntityId, jsonLdGraph, ogType, webPageType })
      return () => null
    } }))
    const head = capture.head.mock.calls[0]![0]
    const meta = capture.seo.mock.calls[0]![0]
    expect(unref(head.link)[0].href).toBe('https://menofhunger.com/u/john/links')
    let graph = JSON.parse(unref(head.script)[0].innerHTML)['@graph']
    expect(graph[0]).toMatchObject({ '@type': 'ProfilePage', mainEntity: { '@id': mainEntityId.value } })

    canonicalPath.value = '/u/jane/links'
    mainEntityId.value = 'https://menofhunger.com/u/jane#identity'
    jsonLdGraph.value = [{ '@type': 'Person', '@id': mainEntityId.value, name: 'Jane' }]
    expect(unref(head.link)[0].href).toBe('https://menofhunger.com/u/jane/links')
    graph = JSON.parse(unref(head.script)[0].innerHTML)['@graph']
    expect(graph[0]).toMatchObject({ '@id': 'https://menofhunger.com/u/jane/links#webpage', mainEntity: { '@id': mainEntityId.value } })
    expect(graph[1].name).toBe('Jane')
    expect(JSON.stringify(graph)).not.toContain('/john')

    ogType.value = 'website'
    webPageType.value = 'WebPage'
    expect(unref(meta.ogType)).toBe('website')
    expect(JSON.parse(unref(head.script)[0].innerHTML)['@graph'][0]['@type']).toBe('WebPage')
  })

  it('escapes script terminators in public user text while retaining valid JSON', () => {
    const text = '</script><script>alert("user supplied")</script>'
    wrapper = mount(defineComponent({ setup() {
      usePageSeo({ jsonLdGraph: [{ '@type': 'Person', name: text }] })
      return () => null
    } }))
    const head = capture.head.mock.calls[0]![0]
    const serialized = unref(head.script)[0].innerHTML
    expect(serialized).not.toContain('<')
    expect(JSON.parse(serialized)['@graph'][1].name).toBe(text)
  })
})
