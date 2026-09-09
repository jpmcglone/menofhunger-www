export default defineNuxtRouteMiddleware((to) => {
  if (to.hash === '#conversations') {
    return navigateTo({ path: '/admin/attention/conversations', query: to.query }, { replace: true })
  }
})
