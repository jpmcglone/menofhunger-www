<template>
  <footer class="bg-gray-50 dark:bg-zinc-900 border-t border-gray-200 dark:border-zinc-800 p-4">
    <div class="flex items-center justify-between">
      <p class="text-sm text-gray-500 dark:text-gray-400">
        &copy; {{ new Date().getFullYear() }} Your Company. All rights reserved.
      </p>
      <ClientOnly>
        <UButton
          :icon="isDark ? 'i-heroicons-moon-20-solid' : 'i-heroicons-sun-20-solid'"
          color="gray"
          variant="ghost"
          @click="isDark = !isDark"
        />
      </ClientOnly>
    </div>
  </footer>
</template>

<script setup>
const colorMode = useColorMode()
const isDark = computed({
  get: () => colorMode.value === 'dark',
  set: () => colorMode.preference = isDark.value ? 'light' : 'dark'
})
</script> 