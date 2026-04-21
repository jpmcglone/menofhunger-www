/**
 * Globally register NuxtLink on the Vue app so that the documented
 * `<Button as="NuxtLink" :to="...">` pattern (see
 * `.cursor/rules/40-internal-links.mdc`) actually resolves at runtime.
 *
 * Why this exists:
 *   Nuxt auto-imports NuxtLink at the SFC compile step — it is available as
 *   `<NuxtLink>` in `.vue` templates because the Vue compiler rewrites the
 *   tag. It is NOT registered as a global Vue component. So when a
 *   precompiled third-party component (PrimeVue Button) does
 *   `<component :is="'NuxtLink'">`, Vue's `resolveDynamicComponent` cannot
 *   find it and silently falls back to an unknown HTML element `<nuxtlink>`
 *   — which renders but has no router behavior, so clicks do nothing.
 *
 * Without this plugin, every `<Button as="NuxtLink" to="/…">` in the app
 * is a no-op on click. RouterLink is already registered globally by Vue
 * Router itself, so we only need to add NuxtLink here.
 *
 * Regression coverage: `tests/button-as-nuxtlink.test.ts`.
 */
import { NuxtLink } from '#components'

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.component('NuxtLink', NuxtLink)
})
