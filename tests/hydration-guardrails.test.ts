import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

function readFromRepo(relativePath: string): string {
  // In the Nuxt Vitest environment, `import.meta.url` can be a virtual URL.
  // Use CWD (repo root in CI/local) to keep this stable.
  return readFileSync(resolve(process.cwd(), relativePath), 'utf8')
}

describe('hydration guardrails (structural)', () => {
  it('does not inject AdSense loader into initial HTML head', () => {
    const nuxtConfig = readFromRepo('nuxt.config.ts')
    expect(nuxtConfig).not.toMatch(/pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js/)
  })

  it('keeps rail ad mount point behind a client-only boundary', () => {
    const layout = readFromRepo('layouts/app.vue')
    expect(layout).toMatch(/<ClientOnly>[\s\S]*<AppAdSlot\s+placement="rail"\s*\/>/)
  })

  it('keeps AppAdSlot free of ClientOnly/Suspense and guards provider DOM behind onMounted', () => {
    const adSlot = readFromRepo('components/app/AdSlot.vue')
    expect(adSlot).not.toMatch(/<ClientOnly>/)
    expect(adSlot).toMatch(/v-if="mounted\s*&&\s*shouldShowAd\s*&&\s*adsenseEnabled"/)
    expect(adSlot).toMatch(/onMounted\(\(\)\s*=>\s*{\s*[\s\S]*mounted\.value\s*=\s*true/)
  })

  it('does not use module-scope topic options caches as render inputs', () => {
    const useTopicOptions = readFromRepo('composables/useTopicOptions.ts')
    expect(useTopicOptions).not.toMatch(/TOPIC_OPTIONS_CACHE/)
    expect(useTopicOptions).toMatch(/useState<.*>\('moh\.topicOptions\.v1'/)
  })

  it('gates mention tier inference until after mount (prevents SSR/client first-render drift)', () => {
    const useMention = readFromRepo('composables/useMentionAutocomplete.ts')
    expect(useMention).toMatch(/const mounted = ref\(false\)/)
    expect(useMention).toMatch(/onMounted\(\(\)\s*=>\s*{\s*[\s\S]*mounted\.value\s*=\s*true/)
    expect(useMention).toMatch(/if\s*\(!mounted\.value\)\s*return/)
  })
})

