<template>
  <div>
    <AppLinksUnavailable v-if="!page" />

    <template v-else>
      <AppLinksHero :user="page.user" />

      <div v-if="isOwner" class="mt-4 flex items-center justify-center gap-2">
        <Button as="NuxtLink" to="/settings/links" label="Edit links" severity="secondary" rounded class="min-h-11" />
        <ClientOnly>
          <Button label="Share" severity="secondary" rounded class="min-h-11" @click="shareOpen = true" />
        </ClientOnly>
      </div>

      <div class="mt-8 space-y-7">
        <section v-if="page.connectedAccounts.length" aria-labelledby="links-connected-heading">
          <h2 id="links-connected-heading" class="mb-2 px-1 text-sm font-semibold moh-text-muted">Connected accounts</h2>
          <ul class="space-y-2">
            <li v-for="account in page.connectedAccounts" :key="account.network">
              <AppLinksConnectedAccountRow :account="account" />
            </li>
          </ul>
        </section>

        <section v-if="page.links.length" aria-labelledby="links-custom-heading">
          <h2 id="links-custom-heading" class="mb-2 px-1 text-sm font-semibold moh-text-muted">Links</h2>
          <ul class="space-y-2">
            <li v-for="link in page.links" :key="link.id">
              <AppLinksLinkButton :link="link" />
            </li>
          </ul>
        </section>

        <p
          v-if="!page.connectedAccounts.length && !page.links.length"
          class="py-6 text-center text-sm moh-text-muted"
        >
          {{ firstName }} hasn't added any links yet.
        </p>

        <AppLinksRecentList
          v-if="page.recent.length"
          :items="page.recent"
          :username="page.user.username"
          :first-name="firstName"
        />

        <AppLinksJoinCard
          v-if="!isAuthed"
          :user="page.user"
          :first-name="firstName"
          :join-href="joinHref"
        />

        <AppLinksFooter :is-authed="isAuthed" @report="onReport" />
      </div>

      <ClientOnly>
        <AppLinksShareLinksPageDialog
          v-if="isOwner"
          v-model="shareOpen"
          :username="page.user.username"
          :name="page.user.name"
          :bio="page.user.bio"
        />
        <AppReportDialog
          v-model:visible="reportOpen"
          target-type="user"
          :subject-user-id="page.user.id"
          :subject-label="`@${page.user.username}`"
        />
      </ClientOnly>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { LinksPage } from '~/types/api'
import { linksPageJoinHref } from '~/utils/profile-link-icons'
import { linksPageSeo } from '~/utils/links-page-seo'

definePageMeta({
  layout: 'links',
  title: 'Links',
})

const route = useRoute()
const { apiFetchData } = useApiClient()
const { isAuthed, user: authUser } = useAuth()
const requestEvent = import.meta.server ? useRequestEvent() : undefined

const username = computed(() => String(route.params.username ?? '').trim().toLowerCase())

const { data, error } = await useAsyncData(
  () => `links-page:${username.value}`,
  () => apiFetchData<LinksPage>(`/users/${encodeURIComponent(username.value)}/links`, { method: 'GET' }),
  {
    watch: [username],
    // Reuse the SSR payload while hydrating so the first client render matches the server markup.
    getCachedData: (key, nuxtApp) => nuxtApp.payload.data[key] ?? nuxtApp.static.data[key],
  },
)

const page = computed<LinksPage | null>(() => (error.value ? null : (data.value ?? null)))

if (import.meta.server && requestEvent && !page.value) {
  const status = Number((error.value as { statusCode?: number; status?: number } | null)?.statusCode ?? 0)
  // 404 and every "not available" reason look identical to visitors; transport failures are retryable.
  setResponseStatus(requestEvent, status >= 500 || status === 0 ? 503 : 404)
}

const firstName = computed(() => {
  const u = page.value?.user
  if (!u) return ''
  return (u.name?.trim().split(/\s+/)[0]) || `@${u.username}`
})

const isOwner = computed(() =>
  Boolean(page.value && authUser.value?.id && authUser.value.id === page.value.user.id),
)

const joinHref = computed(() => linksPageJoinHref(page.value?.referralCode))
// The top bar lives in the layout; share the referral-aware link with it.
const layoutJoinHref = useState<string>('links-page-join-href', () => linksPageJoinHref(null))
watchEffect(() => {
  layoutJoinHref.value = joinHref.value
})

const shareOpen = ref(false)
const reportOpen = ref(false)
function onReport() {
  if (!isAuthed.value) {
    void navigateTo({ path: '/login', query: { redirect: route.path } })
    return
  }
  reportOpen.value = true
}

const seo = computed(() => linksPageSeo(page.value, username.value))
usePageSeo({
  title: computed(() => seo.value.title),
  description: computed(() => seo.value.description),
  canonicalPath: computed(() => seo.value.canonicalPath),
  image: computed(() => seo.value.image),
  imageAlt: computed(() => seo.value.imageAlt),
  imageWidth: computed(() => seo.value.imageWidth),
  imageHeight: computed(() => seo.value.imageHeight),
  author: computed(() => seo.value.author),
  twitterCard: 'summary_large_image',
  ogType: computed(() => seo.value.ogType),
  noindex: computed(() => seo.value.noindex),
  webPageType: computed(() => seo.value.webPageType),
  mainEntityId: computed(() => seo.value.mainEntityId),
  jsonLdGraph: computed(() => seo.value.jsonLdGraph),
})
</script>
