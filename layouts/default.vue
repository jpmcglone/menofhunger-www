<template>
  <div class="min-h-screen flex flex-col bg-white dark:bg-black">
    <!-- Top Navbar - full width -->
    <header class="bg-white dark:bg-black shadow-sm fixed w-full top-0 z-50 border-b border-gray-200 dark:border-zinc-800">
      <nav class="h-16 flex items-center justify-between px-4">
        <!-- Logo -->
        <div class="flex-shrink-0">
          <div class="flex items-center">
            <!-- Placeholder logo -->
            <img src="https://placehold.co/32x32" alt="Logo" class="h-8 w-auto">
          </div>
        </div>

        <!-- Navigation Links -->
        <div class="flex items-center space-x-4">
          <UButton 
            variant="ghost" 
            class="text-gray-700 dark:text-gray-100"
          >
            Sign In
          </UButton>
          <UButton 
            color="primary"
          >
            Enroll
          </UButton>
        </div>
      </nav>
    </header>

    <!-- Main Container - for sidebar and content -->
    <div class="flex flex-1 pt-16">
      <!-- Sidebar -->
      <aside class="w-64 fixed h-[calc(100vh-4rem)] bg-gray-50 dark:bg-zinc-900 border-r border-gray-200 dark:border-zinc-800">
        <nav class="p-4 space-y-2">
          <div class="space-y-2">
            <h3 class="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase">Menu</h3>
            <ul class="space-y-2">
              <li>
                <UButton
                  variant="ghost"
                  class="w-full justify-start"
                  icon="i-heroicons-home"
                >
                  Dashboard
                </UButton>
              </li>
              <li>
                <UButton
                  variant="ghost"
                  class="w-full justify-start"
                  icon="i-heroicons-user"
                >
                  Profile
                </UButton>
              </li>
              <li>
                <UButton
                  variant="ghost"
                  class="w-full justify-start"
                  icon="i-heroicons-cog"
                >
                  Settings
                </UButton>
              </li>
            </ul>
          </div>

          <!-- Theme Toggle at bottom of sidebar -->
          <div class="absolute bottom-4 left-4">
            <ClientOnly>
              <UButton
                :icon="isDark ? 'i-heroicons-moon-20-solid' : 'i-heroicons-sun-20-solid'"
                color="gray"
                variant="ghost"
                aria-label="Toggle theme"
                @click="isDark = !isDark"
              />
            </ClientOnly>
          </div>
        </nav>
      </aside>

      <!-- Main Content Area with its own footer -->
      <div class="flex-1 ml-64">
        <div class="min-h-[calc(100vh-4rem)] flex flex-col">
          <!-- Content -->
          <main class="flex-1 p-6">
            <slot />
          </main>

          <!-- Footer (only for content area) -->
          <footer class="bg-gray-50 dark:bg-zinc-900 border-t border-gray-200 dark:border-zinc-800 p-4">
            <div class="text-center text-sm text-gray-500 dark:text-gray-400">
              <p>&copy; {{ new Date().getFullYear() }} Your Company. All rights reserved.</p>
            </div>
          </footer>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
const colorMode = useColorMode()

// Force dark mode on initial load
onMounted(() => {
  if (colorMode.value !== 'dark' && colorMode.value !== 'light') {
    colorMode.preference = 'dark'
  }
})

const isDark = computed({
  get() {
    return colorMode.value === 'dark'
  },
  set() {
    // Toggle only between dark and light
    colorMode.preference = isDark.value ? 'light' : 'dark'
  }
})
</script>
