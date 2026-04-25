export default defineNuxtPlugin(() => {
  const route = useRoute()
  const { captureReferralFromRoute } = useReferralCapture()

  captureReferralFromRoute(route)

  watch(
    () => route.query.ref,
    () => {
      captureReferralFromRoute(route)
    },
  )
})
