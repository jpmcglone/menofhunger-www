export default defineNuxtPlugin(() => {
  const { user } = useAuth()

  watchEffect(() => {
    const isOrg = Boolean(user.value?.isOrganization)
    document.documentElement.classList.toggle('org-theme', isOrg)
  })
})

