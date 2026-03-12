export default defineNuxtRouteMiddleware(async () => {
  const { ensureLoaded, user } = useAuth()
  await ensureLoaded()

  const isPremium = Boolean(user.value?.premium) || Boolean(user.value?.premiumPlus)
  if (!isPremium) {
    return navigateTo('/articles', { replace: true })
  }
})
