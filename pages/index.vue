<template>
  <div class="w-full flex flex-col items-center justify-center">
    <AppLogo
      :alt="siteConfig.name"
      class="mb-8 rounded-lg"
      :width="400"
      :height="400"
    />
    <p class="mt-4 sm:mt-6 md:mt-8 text-2xl font-medium tracking-wider text-gray-500 dark:text-gray-500">
      <span class="text-gray-800 dark:text-gray-200">Updates coming soon.</span>
    </p>
    <p class="mt-2 text-lg font-light tracking-widest text-gray-400 dark:text-gray-600">
      Stay tuned. Stay hungry.
    </p>
    <div class="mt-6 h-[1px] w-32 mx-auto bg-gradient-to-r from-transparent via-gray-400 dark:via-gray-600 to-transparent"/>

    <!-- Roanoke meetup: simple link + bottom sheet -->
    <div class="mt-8">
      <button
        type="button"
        class="text-sm font-medium text-gray-700 underline underline-offset-4 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-50"
        @click="isRoanokeOpen = true"
      >
        Looking for the Roanoke meetup?
      </button>
    </div>

    <Dialog
      v-model:visible="isRoanokeOpen"
      header="Roanoke meetup"
      modal
      dismissable-mask
      position="bottom"
      :style="{ width: '36rem', maxWidth: '100vw' }"
      :breakpoints="{ '960px': '100vw', '640px': '100vw' }"
    >
      <div class="space-y-4">
        <div class="space-y-2">
          <p class="text-sm font-medium text-gray-900 dark:text-gray-50">
            Men of Hunger: Roanoke
          </p>
          <p class="text-sm text-gray-700 dark:text-gray-200">
            Men of Hunger is a men’s group for ambitious builders, leaders, and growth-minded men who refuse to drift.
            We meet to think clearly, speak honestly, and help one another move our missions forward.
          </p>
          <p class="text-sm text-gray-700 dark:text-gray-200">
            Events range from open discussions (like <span class="font-medium">Estuary</span>) to learning sessions, service projects, and accountability groups.
          </p>
          <p class="text-xs text-gray-500 dark:text-gray-400">
            See Meetup for the latest events and details.
          </p>
        </div>

        <div class="flex flex-col gap-2">
          <a :href="roanokeMeetupUrl" target="_blank" rel="noopener noreferrer" class="inline-flex w-full">
            <Button label="Open meetup.com" icon="pi pi-external-link" icon-pos="right" class="w-full rounded-full" />
          </a>
        </div>
      </div>
    </Dialog>
  </div>
</template>

<script setup>
import { siteConfig } from '~/config/site'

definePageMeta({
  layout: 'empty'
})

// TODO: Paste the real Roanoke meetup URL here.
const roanokeMeetupUrl = 'https://www.meetup.com/menofhunger/'
const isRoanokeOpen = ref(false)

useHead({
  title: siteConfig.meta.title,
  meta: [
    { charset: 'utf-8' },
    { name: 'viewport', content: 'width=device-width, initial-scale=1' },
    { name: 'description', content: siteConfig.meta.description },
    // Open Graph / Facebook
    { property: 'og:type', content: 'website' },
    { property: 'og:url', content: siteConfig.url },
    { property: 'og:title', content: siteConfig.meta.title },
    { property: 'og:description', content: siteConfig.meta.description },
    { property: 'og:image', content: `${siteConfig.url}/images/logo-white-bg.png` },
    // Twitter
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:url', content: siteConfig.url },
    { name: 'twitter:title', content: siteConfig.meta.title },
    { name: 'twitter:description', content: siteConfig.meta.description },
    { name: 'twitter:image', content: `${siteConfig.url}/images/logo-white-bg.png` },
    { name: 'twitter:creator', content: siteConfig.social.twitter },
    // Additional SEO
    { name: 'keywords', content: siteConfig.meta.keywords },
    { name: 'author', content: siteConfig.name }
  ],
  htmlAttrs: {
    lang: 'en'
  },
  link: [
    { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' }
  ]
})
</script>
