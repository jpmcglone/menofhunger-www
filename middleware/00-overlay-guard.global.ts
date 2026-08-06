/**
 * Runs at the very start of every client-side navigation — before `auth.global`
 * and before any named middleware — because Nuxt processes global middleware files
 * in alphabetical order and `00-` sorts first.
 *
 * Calls `notifyOverlayNavigationStart()` synchronously so the overlay back-button
 * guard is disarmed before any async middleware (e.g. `verified`) begins awaiting.
 * Without this, the deferred `history.back()` timer can fire while `verified` is
 * still awaiting, cancelling the navigation.
 */
import { notifyOverlayNavigationStart } from '~/composables/useOverlayDismiss'

export default defineNuxtRouteMiddleware((to) => {
  if (import.meta.client) {
    notifyOverlayNavigationStart(to.fullPath)
  }
})
