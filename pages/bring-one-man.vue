<template>
  <section class="mx-auto flex w-full max-w-xl flex-col gap-6 px-5 py-12 text-center">
    <div class="flex flex-col items-center gap-3">
      <AppLogo :alt="siteConfig.name" :width="48" :height="48" />
      <div v-if="inviter" class="flex flex-col items-center gap-2">
        <AppUserAvatar :user="inviterAvatarUser" size-class="h-16 w-16" bg-class="moh-surface" :show-presence="false" />
        <p class="text-sm moh-text-muted">
          {{ inviter.name || `@${inviter.username}` }} invited you
        </p>
      </div>
    </div>

    <div class="space-y-3">
      <h1 class="text-3xl font-semibold tracking-tight moh-text text-balance">
        Bring one man.
      </h1>
      <p class="text-base leading-relaxed moh-text-muted text-pretty">
        Men of Hunger is a trusted, men-only community for real conversation and accountability.
        Join, verify, and you both get a free month of Premium.
      </p>
    </div>

    <div class="flex flex-col items-center gap-2">
      <Button as="NuxtLink" :to="joinTo" rounded size="large" class="min-h-11 w-full sm:w-auto">
        Join Men of Hunger
      </Button>
      <p class="text-xs moh-text-muted">Signup takes a minute. Verification unlocks the free month.</p>
    </div>

    <ul class="mx-auto max-w-sm space-y-2 text-left text-sm moh-text">
      <li class="flex gap-2"><Icon name="tabler:check" class="mt-0.5 shrink-0" aria-hidden="true" />Signal over noise.</li>
      <li class="flex gap-2"><Icon name="tabler:check" class="mt-0.5 shrink-0" aria-hidden="true" />Verified men, honest dialogue.</li>
      <li class="flex gap-2"><Icon name="tabler:check" class="mt-0.5 shrink-0" aria-hidden="true" />Daily check-ins and streaks.</li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import { siteConfig } from '~/config/site'

type PublicInviter = { username: string | null; name: string | null; avatarUrl: string | null }

definePageMeta({ layout: 'empty', title: 'Bring one man' })

const route = useRoute()
const { user, ensureLoaded } = useAuth()
const { apiFetchData } = useApiClient()

await ensureLoaded()
if (user.value) await navigateTo('/invite', { replace: true })

const refCode = computed(() => {
  const raw = route.query.ref
  return String(Array.isArray(raw) ? raw[0] : (raw ?? '')).trim().toUpperCase().slice(0, 50)
})

const { data: inviter } = await useAsyncData<PublicInviter | null>(
  () => `bring-one-man-inviter:${refCode.value}`,
  async () => {
    if (!refCode.value) return null
    try {
      return await apiFetchData<PublicInviter>(`/billing/referral/inviter/${encodeURIComponent(refCode.value)}`)
    } catch {
      return null
    }
  },
)

const inviterAvatarUser = computed(() => ({
  id: inviter.value?.username ?? 'inviter',
  username: inviter.value?.username ?? null,
  name: inviter.value?.name ?? null,
  avatarUrl: inviter.value?.avatarUrl ?? null,
}))

// The capture plugin has already stored ref/src/utm from this visit, so login only needs the tab.
const joinTo = '/login?tab=signup'

usePageSeo({
  title: 'Bring one man',
  description: 'Join Men of Hunger, verify, and you both get a free month of Premium.',
  canonicalPath: '/bring-one-man',
  ogType: 'website',
  image: '/images/banner.png',
})
</script>
