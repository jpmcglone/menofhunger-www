export default defineNuxtPlugin((nuxtApp) => {
  // Dev-only: reduce known Nuxt DevTools noise so real hydration warnings stand out.
  if (!import.meta.dev) return

  const app = nuxtApp.vueApp
  const prev = app.config.warnHandler

  app.config.warnHandler = (msg, instance, trace) => {
    const m = String(msg ?? '')

    // Vue core warning emitted whenever Suspense is used (Nuxt/DevTools can trigger this).
    if (m.includes('<Suspense> is an experimental feature')) return

    // Nuxt DevTools component inspector overlay injects style attrs onto a VueElement root,
    // which can trigger this warning. It's not an app bug.
    if (
      m.includes('Extraneous non-props attributes (style)') &&
      (m.includes('<VueElement') || (instance as any)?.type?.name === 'VueElement')
    ) {
      return
    }

    if (typeof prev === 'function') return prev(msg, instance, trace)
    // Fallback to default behavior (warn + trace).
    // eslint-disable-next-line no-console
    console.warn(m + (trace ?? ''))
  }
})

