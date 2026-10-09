import ToastService from 'primevue/toastservice'

export default defineNuxtPlugin((nuxtApp) => {
  // If ToastService is already installed (e.g. by @primevue/nuxt-module), don't install again.
  const gp = nuxtApp.vueApp.config.globalProperties as { $toast?: unknown }
  if (gp?.$toast) return

  // Avoid double-install in dev/HMR.
  const key = '__moh_primevue_toast_installed__'
  // Persist across HMR + app re-instantiation.
  const g = globalThis as unknown as Record<string, unknown>
  if (g[key]) return
  g[key] = true
  nuxtApp.vueApp.use(ToastService)
})

