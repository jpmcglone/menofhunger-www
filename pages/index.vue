<template>
  <div class="flex items-center justify-center py-20">
    <div class="text-center">
      <img 
        src='@/assets/images/logo-black-bg.png'
        :alt="siteConfig.name" 
        class="mx-auto mb-8 w-[400px] rounded-lg select-none"
        draggable="false"
        style="-webkit-user-drag: none; user-select: none; -moz-user-select: none; -webkit-user-select: none; -ms-user-select: none;"
      >
      <p class="mt-8 text-2xl font-medium tracking-wider text-gray-500 dark:text-gray-500">
        <span class="text-gray-800 dark:text-gray-200">Coming soon</span>
      </p>
      <p class="mt-2 text-lg font-light tracking-widest text-gray-400 dark:text-gray-600">
        Stay tuned. Stay hungry.
      </p>
      <div class="mt-6 h-[1px] w-32 mx-auto bg-gradient-to-r from-transparent via-gray-400 dark:via-gray-600 to-transparent"/>
    </div>
  </div>
</template>

<script setup>
import { siteConfig } from '~/config/site'

definePageMeta({
  layout: 'empty'
})

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
    { property: 'og:image', content: `${siteConfig.url}/images/logo-black-bg.png` },
    // Twitter
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:url', content: siteConfig.url },
    { name: 'twitter:title', content: siteConfig.meta.title },
    { name: 'twitter:description', content: siteConfig.meta.description },
    { name: 'twitter:image', content: `${siteConfig.url}/images/logo-black-bg.png` },
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
