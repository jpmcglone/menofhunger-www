<template>
  <div class="min-h-screen moh-bg moh-text">
    <header class="sticky top-0 z-20 border-b moh-border moh-frosted backdrop-blur">
      <div class="mx-auto flex h-14 w-full max-w-[560px] items-center justify-between gap-3 px-4">
        <NuxtLink
          :to="isAuthed ? '/home' : '/'"
          class="inline-flex min-h-11 items-center text-xs font-semibold uppercase tracking-[0.14em] text-gray-900 dark:text-gray-50"
        >
          {{ siteConfig.name }}
        </NuxtLink>
        <Button
          v-if="isAuthed"
          as="NuxtLink"
          to="/home"
          label="Back to Men of Hunger"
          rounded
          class="min-h-11 shrink-0 whitespace-nowrap text-sm"
        />
        <Button
          v-else
          as="NuxtLink"
          :to="joinHref"
          label="Join free"
          rounded
          class="min-h-11"
        />
      </div>
    </header>

    <main class="mx-auto w-full max-w-[560px] px-4 pb-16">
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
import { siteConfig } from '~/config/site'
import { primaryTintCssForUser } from '~/utils/theme-tint'
import { linksPageJoinHref } from '~/utils/profile-link-icons'

const { initAuth, isAuthed, user } = useAuth()

// Public routes skip the auth middleware. Resolve cookie-backed identity on the
// server; on the client, initAuth defers its work until mount to preserve hydration.
if (import.meta.server) {
  await initAuth()
} else {
  void initAuth().catch(() => undefined)
}
/** The page publishes its owner's referral-aware join link; the bar mirrors it. */
const joinHref = useState<string>('links-page-join-href', () => linksPageJoinHref(null))

const primaryCssVars = computed(() => primaryTintCssForUser(user.value ?? null))
useHead({
  style: [{ key: 'moh-primary-tint', textContent: primaryCssVars }],
})
</script>
