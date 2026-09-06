// @vitest-environment happy-dom
import { createSSRApp, defineComponent, h, nextTick, onMounted, ref, TransitionGroup } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createRouter, toRouteMatcher } from 'radix3'

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals() })

describe('SSR rendering contracts', () => {
  it('hydrates a mounted-only branch and a keyed transition list without mismatches', async () => {
    const component = defineComponent({
      setup() {
        const mounted = ref(false)
        onMounted(() => { mounted.value = true })
        return () => h('main', [
          mounted.value ? h('button', { id: 'client-picker' }, 'Add reaction') : null,
          h(TransitionGroup, { tag: 'ul' }, () => ['a', 'b'].map(id => h('li', { key: id }, id))),
        ])
      },
    })
    const html = await renderToString(createSSRApp(component))
    expect(html).not.toContain('client-picker')
    expect(html).toContain('<li>a</li>')
    const host = document.createElement('div')
    host.innerHTML = html
    document.body.append(host)
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const app = createSSRApp(component)
    try {
      app.mount(host)
      await nextTick()
      expect(host.querySelector('#client-picker')?.textContent).toBe('Add reaction')
      expect(host.querySelectorAll('li')).toHaveLength(2)
      expect(warning.mock.calls.flat().join(' ')).not.toMatch(/hydration/i)
      expect(error.mock.calls.flat().join(' ')).not.toMatch(/hydration/i)
    } finally {
      app.unmount()
      host.remove()
    }
  })

  it('uses private route overrides without disabling public group and discovery SSR', async () => {
    vi.stubGlobal('defineNuxtConfig', (config: unknown) => config)
    const { default: config } = await import('../nuxt.config')
    const matcher = toRouteMatcher(createRouter({ routes: config.routeRules }))
    const rule = (path: string) => Object.assign({}, ...matcher.matchAll(path))
    for (const path of ['/fitness', '/fitness/activities/123', '/scheduled', '/invite/payouts', '/g/example/settings', '/g/example/pending', '/g/example/invites']) {
      expect(rule(path).ssr, path).toBe(false)
      expect(rule(path).headers['X-Robots-Tag'], path).toContain('noindex')
    }
    for (const path of ['/g/example', '/p/example', '/u/example', '/explore', '/articles']) {
      expect(rule(path).ssr, path).toBe(true)
    }
  })
})
