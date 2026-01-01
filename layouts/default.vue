<template>
  <div class="min-h-screen flex flex-col bg-white dark:bg-black">
    <!-- Header Component -->
    <AppHeader />

    <!-- Main Content Area -->
    <main class="flex-1 p-6 mt-16">
      <slot />
    </main>

    <!-- Footer Component -->
    <AppFooter />
  </div>
</template>

<script setup>
// No-op: color mode is handled globally by @nuxtjs/color-mode (default: system)
</script>
