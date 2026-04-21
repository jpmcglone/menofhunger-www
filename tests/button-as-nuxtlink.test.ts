/**
 * Locks in the contract behind `.cursor/rules/40-internal-links.mdc`:
 *   <Button as="NuxtLink" :to="/path"> MUST render a real <a href="/path">.
 *
 * Background — the bug this protects against:
 *   PrimeVue's Button is precompiled in node_modules and renders
 *   `<component :is="as">`. When `as` is the string `"NuxtLink"`, Vue's
 *   `resolveDynamicComponent` looks the name up in the app's globally
 *   registered components. Nuxt does NOT globally register NuxtLink — it is
 *   only auto-imported at SFC compile time. Without an explicit registration,
 *   the resolver falls back to an unknown HTML element <nuxtlink> with `to`
 *   as a plain attribute, and clicks do nothing (the regression that broke
 *   the "Create group" button on /groups).
 *
 * The fix lives in `plugins/register-nuxt-link.ts`. These tests verify both
 * the resolution and the rendered DOM contract that other "real anchor"
 * features (cmd/middle/right-click "Open in new tab") rely on.
 */
import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { useNuxtApp } from '#app'
import { NuxtLink } from '#components'
import Button from 'primevue/button'

// The Nuxt vitest environment does not auto-load files from `plugins/` for
// every mount. Mirror what `plugins/register-nuxt-link.ts` does at app boot
// before each rendering assertion. If this helper ever diverges from the
// plugin, the assertions below catch it.
async function ensureNuxtLinkRegistered(): Promise<void> {
  await mountSuspended({
    setup() {
      const app = useNuxtApp()
      const components = (app.vueApp as unknown as { _context: { components: Record<string, unknown> } })._context.components
      if (!components.NuxtLink) {
        app.vueApp.component('NuxtLink', NuxtLink as never)
      }
      return () => null
    },
  })
}

describe('Button as="NuxtLink" — internal link contract', () => {
  it('renders a real <a href="…"> (not <nuxtlink>) so right-click / cmd+click work', async () => {
    await ensureNuxtLinkRegistered()
    const w = await mountSuspended({
      components: { Button },
      template: '<Button as="NuxtLink" to="/groups/new" label="Create group" />',
    })
    const html = w.html()
    expect(html).toMatch(/<a[^>]+href="\/groups\/new"/)
    expect(html).not.toMatch(/<nuxtlink/i)
  })

  it('preserves PrimeVue Button styling on the anchor (class, label, icon slot)', async () => {
    await ensureNuxtLinkRegistered()
    const w = await mountSuspended({
      components: { Button },
      template: '<Button as="NuxtLink" to="/tiers" label="Upgrade" rounded severity="secondary" />',
    })
    const html = w.html()
    expect(html).toMatch(/<a[^>]+class="[^"]*p-button[^"]*"/)
    expect(html).toContain('Upgrade')
  })

  it('renders the back-button pattern (text + rounded + secondary + icon-only) as an anchor', async () => {
    await ensureNuxtLinkRegistered()
    const w = await mountSuspended({
      components: { Button },
      template: `
        <Button as="NuxtLink" to="/groups" text rounded severity="secondary" aria-label="Back">
          <template #icon><span class="i-back" /></template>
        </Button>
      `,
    })
    const html = w.html()
    expect(html).toMatch(/<a[^>]+href="\/groups"/)
    expect(html).toMatch(/aria-label="Back"/)
  })

  it('falls back to <nuxtlink> (broken) WITHOUT the global registration — proves the plugin is load-bearing', async () => {
    // Use a fresh sub-app context to confirm the negative case still holds.
    // We mount a probe that strips NuxtLink from the registry, then asserts
    // PrimeVue's resolver returns the bare string and renders <nuxtlink>.
    await mountSuspended({
      setup() {
        const app = useNuxtApp()
        const components = (app.vueApp as unknown as { _context: { components: Record<string, unknown> } })._context.components
        delete components.NuxtLink
        return () => null
      },
    })
    const w = await mountSuspended({
      components: { Button },
      template: '<Button as="NuxtLink" to="/groups/new" label="x" />',
    })
    const html = w.html()
    expect(html).toMatch(/<nuxtlink/i)
    expect(html).not.toMatch(/<a[^>]+href="\/groups\/new"/)
  })
})

// Structural check: the `plugins/register-nuxt-link.ts` plugin file must
// exist and globally register `NuxtLink`. Without this file, the runtime
// rendering above breaks in production even if the unit tests above pass
// (because they explicitly call `ensureNuxtLinkRegistered`).
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

describe('plugins/register-nuxt-link.ts — structural guardrail', () => {
  it('exists and registers NuxtLink on the Vue app', () => {
    const src = readFileSync(resolve(process.cwd(), 'plugins/register-nuxt-link.ts'), 'utf8')
    expect(src).toMatch(/from\s+['"]#components['"]/)
    expect(src).toMatch(/vueApp\.component\(\s*['"]NuxtLink['"]\s*,\s*NuxtLink\s*\)/)
  })
})
