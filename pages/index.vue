<template>
  <div class="min-h-screen bg-gray-50 dark:bg-black">
    <!-- Tailwind Section -->
    <section class="px-6 lg:px-8 py-12">
      <div class="max-w-[90rem] mx-auto">
        <h2 class="text-3xl font-bold mb-6 text-gray-900 dark:text-white">Tailwind CSS Components</h2>
        <div class="bg-white dark:bg-zinc-900 rounded-lg shadow p-8 space-y-6">
          <!-- Buttons -->
          <div class="space-y-4">
            <!-- Basic Buttons -->
            <div class="space-x-4">
              <button 
                class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                @click="showAlert('Primary button clicked!')">
                Primary
              </button>
              <button 
                class="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
                @click="logAction('Secondary action')">
                Secondary
              </button>
              <button 
                class="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-full"
                @click="count++">
                Clicked {{ count }} times
              </button>
            </div>

            <!-- Outlined Buttons -->
            <div class="space-x-4">
              <button 
                class="border-2 border-blue-500 dark:border-blue-400 text-blue-500 dark:text-blue-400 hover:bg-blue-500 hover:text-white font-bold py-2 px-4 rounded transition-colors"
                @click="toggleOutline = !toggleOutline">
                {{ toggleOutline ? 'Toggled On' : 'Toggled Off' }}
              </button>
              <button 
                class="border-2 border-red-500 dark:border-red-400 text-red-500 dark:text-red-400 hover:bg-red-500 hover:text-white font-bold py-2 px-4 rounded transition-colors"
                @click="showAlert('Danger action triggered!')">
                Danger
              </button>
              <button 
                class="border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 font-bold py-2 px-4 rounded transition-colors"
                @click="logAction('Light action')">
                Light
              </button>
            </div>

            <!-- Sized Buttons -->
            <div class="space-x-4">
              <button class="bg-purple-500 hover:bg-purple-700 text-white font-bold py-1 px-2 rounded text-sm">
                Small
              </button>
              <button class="bg-purple-500 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded text-lg">
                Large
              </button>
            </div>

            <!-- Icon Buttons -->
            <div class="space-x-4">
              <button class="bg-blue-500 hover:bg-blue-700 text-white font-bold p-2 rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </button>
              <button class="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded inline-flex items-center space-x-2">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                <span>Download</span>
              </button>
            </div>
          </div>

          <!-- Alert -->
          <div class="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4" role="alert">
            <p class="font-bold">Warning</p>
            <p>This is a Tailwind alert component.</p>
          </div>

          <!-- Links Section -->
          <div class="space-y-4">
            <div class="space-y-2">
              <h3 class="text-lg font-semibold mb-2 text-gray-900 dark:text-white">Link Styles</h3>
              <!-- Basic Links -->
              <div class="space-x-4">
                <a href="#" class="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline">
                  Basic Link
                </a>
                <a href="#" class="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 font-medium">
                  Bold Link
                </a>
                <a href="#" class="text-purple-600 hover:text-purple-800 underline">
                  Underlined Link
                </a>
              </div>
              
              <!-- Fancy Links -->
              <div class="space-x-4">
                <a href="#" class="relative text-blue-600 after:content-[''] after:absolute after:w-full after:scale-x-0 after:h-0.5 after:bottom-0 after:left-0 after:bg-blue-600 after:transition-transform after:duration-300 hover:after:scale-x-100">
                  Animated Underline
                </a>
                <a href="#" class="inline-flex items-center space-x-1 text-indigo-600 hover:text-indigo-800">
                  <span>Link with Icon</span>
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </a>
              </div>

              <!-- Button-like Links -->
              <div class="space-x-4">
                <a href="#" class="inline-block px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors">
                  Button Link
                </a>
                <a href="#" class="inline-block px-4 py-2 border-2 border-green-500 text-green-500 rounded hover:bg-green-500 hover:text-white transition-colors">
                  Outline Link
                </a>
              </div>
            </div>
          </div>

          <!-- Card -->
          <div class="border dark:border-zinc-800 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow bg-white dark:bg-zinc-900">
            <h3 class="text-xl font-semibold mb-2 text-gray-900 dark:text-white">Card Title</h3>
            <p class="text-gray-600 dark:text-gray-300">This is a card component built with Tailwind.</p>
          </div>

          <!-- Badge and Tags -->
          <div class="space-x-2">
            <span class="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded">Badge</span>
            <span class="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded-full">Tag</span>
          </div>

          <!-- Form Elements -->
          <div class="space-y-4">
            <input
              type="text" 
              placeholder="Input field" 
              class="w-full px-4 py-2 border dark:border-zinc-800 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-zinc-900 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
            >
            <select class="w-full px-4 py-2 border dark:border-zinc-800 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-zinc-900 text-gray-900 dark:text-white">
              <option>Select option</option>
              <option>Option 1</option>
              <option>Option 2</option>
            </select>
          </div>
        </div>
      </div>
    </section>

    <!-- Nuxt UI Section -->
    <section class="px-6 lg:px-8 py-12">
      <div class="max-w-[90rem] mx-auto">
        <h2 class="text-3xl font-bold mb-6 text-gray-900 dark:text-white">Nuxt UI Components</h2>
        <div class="bg-white dark:bg-zinc-900 rounded-lg shadow p-8 space-y-6">
          <!-- Buttons -->
          <div class="space-y-4">
            <!-- Basic Buttons -->
            <div class="space-x-4">
              <UButton color="primary" @click="showAlert('Nuxt UI Primary clicked!')">
                Primary
              </UButton>
              <UButton color="gray" @click="logAction('Nuxt UI Secondary')">
                Secondary
              </UButton>
              <UButton color="green" @click="count++">
                Clicked {{ count }} times
              </UButton>
            </div>

            <!-- Button Variants -->
            <div class="space-x-4">
              <UButton 
                variant="solid" 
                color="primary"
                :loading="loading"
                @click="loading = true; setTimeout(() => loading = false, 2000)"
              >
                Click to Load
              </UButton>
            </div>
          </div>

          <!-- Alert -->
          <UCard>
            <template #header>
              <h3 class="text-xl font-semibold">Card Title</h3>
            </template>
            <p>This is a card component from Nuxt UI.</p>
          </UCard>

          <!-- Badges -->
          <div class="space-x-2">
            <UBadge color="primary">Badge</UBadge>
            <UBadge color="green" variant="soft">Soft Badge</UBadge>
          </div>

          <!-- Form Elements -->
          <div class="space-y-4">
            <UInput placeholder="Input field" />
            <USelect placeholder="Select option" :options="['Option 1', 'Option 2', 'Option 3']" />
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
const count = ref(0)
const toggleOutline = ref(false)
const loading = ref(false)

const showAlert = (message) => {
  alert(message)
}

const logAction = (action) => {
  console.log(`Action performed: ${action}`)
}
</script>
