export default defineNuxtPlugin(() => {
  const route = useRoute()
  const { captureReferralFromRoute } = useReferralCapture()
  const attribution = useSignupAttribution()

  attribution.captureFromRoute(route)
  captureReferralFromRoute(route)

  watch(
    () => [route.query.ref, route.query.src, route.query.utm_source],
    () => {
      attribution.captureFromRoute(route)
      captureReferralFromRoute(route)
    },
  )
})
