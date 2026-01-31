import ToastService from 'primevue/toastservice'

export default defineNuxtPlugin((nuxtApp) => {
  // Avoid double-install in dev/HMR.
  const key = '__moh_primevue_toast_installed__'
  // Persist across HMR + app re-instantiation.
  const g = globalThis as any
  if (g[key]) return
  g[key] = true
  nuxtApp.vueApp.use(ToastService)
})

