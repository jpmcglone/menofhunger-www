import { ref } from 'vue'
import data from '../fixtures/integration-provider.json'
import banner from '../fixtures/integration-banner.png?url'
export const fixtures: Record<string, any> = structuredClone(data)
const states = new Map<string, any>()
export function useState(key: string, initial: () => unknown) { if (!states.has(key)) states.set(key, ref(initial())); return states.get(key) }
export function definePageMeta() {}
export const calls: { path: string; body?: any }[] = []
export function useApiClient() {
  return { async apiFetchData(path: string, options: any = {}) {
    calls.push({ path, body: options.body })
    if (options.method === 'POST') {
      if (path.startsWith('/me/integrations/x/publishing/')) return { queued: true }
      if (path === '/admin/integrations/controls') {
        fixtures['/admin/integrations/operations'].control = { ...options.body, revision: options.body.expectedRevision + 1 }
        return fixtures['/admin/integrations/operations'].control
      }
      if (path.startsWith('/admin/integrations/usage/')) {
        fixtures['/admin/integrations/spend'].pending = []
        return { id: 'fixture:uncertain:1' }
      }
      throw new Error('Unmatched fixture mutation')
    }
    if (path === '/link-metadata') return { url: options.query.url, title: 'John Example', description: 'A public biography from the original website.', imageUrl: 'https://preview-fixture.example/banner.png',
      profile: options.query.url.includes('pickax.com') ? { platform: 'pickax', username: 'john', avatarUrl: 'https://preview-fixture.example/avatar.png', followers: 111, following: 22 } : null }
    if (!(path in fixtures)) throw new Error(`Unmatched fixture ${path}`)
    const result = structuredClone(fixtures[path])
    if (result?.bannerUrl) result.bannerUrl = banner
    return result
  } }
}
