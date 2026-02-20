export default defineNuxtPlugin((nuxtApp) => {
  const hydrated = useState<boolean>('moh-hydrated', () => false)
  nuxtApp.hook('app:mounted', () => {
    hydrated.value = true
  })
})

