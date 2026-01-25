export default defineNuxtRouteMiddleware(async () => {
  const { ensureLoaded, user } = useAuth()
  await ensureLoaded()

  // Hide existence of admin pages from non-admins (and logged-out users).
  if (!user.value?.siteAdmin) {
    throw createError({ statusCode: 404, statusMessage: 'Not Found' })
  }
})

