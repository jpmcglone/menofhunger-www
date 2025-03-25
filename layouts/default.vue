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
// Only need this for initial dark mode setting
const colorMode = useColorMode()

onMounted(() => {
  if (colorMode.value !== 'dark' && colorMode.value !== 'light') {
    colorMode.preference = 'dark'
  }
})
</script>
