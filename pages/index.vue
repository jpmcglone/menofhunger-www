<template>
  <div class="min-h-screen flex items-center justify-center">
    <div class="text-center">
      <img 
        src="@/assets/images/logo-black-bg.png" 
        alt="Men of Hunger" 
        class="mx-auto mb-8 w-[400px] rounded-lg select-none"
        draggable="false"
        style="-webkit-user-drag: none; user-select: none; -moz-user-select: none; -webkit-user-select: none; -ms-user-select: none;"
      >
      <p class="mt-4 text-lg text-gray-600 dark:text-gray-400">
        Coming soon. Stay tuned. Stay hungry.
      </p>
    </div>
  </div>
</template>

<script setup>
const SITE_URL = 'https://menofhunger.com/'
const SITE_TITLE = "Men of Hunger - Coming soon"
const SITE_DESCRIPTION = "Men of Hunger — an online and offline brotherhood for driven men. Ambition isn't a flaw — it's fuel. We rise. We build. We lead."
const SOCIAL_IMAGE = '/images/logo-black-bg.png'
const TWITTER_HANDLE = '@MenOfHunger'

definePageMeta({
  layout: 'empty'
})

useHead({
  title: SITE_TITLE,
  meta: [
    { charset: 'utf-8' },
    { name: 'viewport', content: 'width=device-width, initial-scale=1' },
    { name: 'description', content: SITE_DESCRIPTION },
    // Open Graph / Facebook
    { property: 'og:type', content: 'website' },
    { property: 'og:url', content: SITE_URL },
    { property: 'og:title', content: SITE_TITLE },
    { property: 'og:description', content: SITE_DESCRIPTION },
    { property: 'og:image', content: SOCIAL_IMAGE },
    // Twitter
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:url', content: SITE_URL },
    { name: 'twitter:title', content: SITE_TITLE },
    { name: 'twitter:description', content: SITE_DESCRIPTION },
    { name: 'twitter:image', content: SOCIAL_IMAGE },
    { name: 'twitter:creator', content: TWITTER_HANDLE },
    // Additional SEO
    { 
      name: 'keywords', 
      content: 'men of hunger, brotherhood, ambition, driven men, leadership, personal growth, vision, purpose, masculine excellence, achievement' 
    },
    { name: 'author', content: 'Men of Hunger' }
  ],
  htmlAttrs: {
    lang: 'en'
  },
  link: [
    { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' }
  ]
})
</script>
