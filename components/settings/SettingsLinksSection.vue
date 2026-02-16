<template>
  <div class="space-y-4">
    <div class="flex flex-col gap-3">
      <NuxtLink to="/about" class="inline-flex items-center gap-3 text-gray-800 hover:underline dark:text-gray-200">
        <Icon name="tabler:info-circle" class="text-gray-500 dark:text-gray-400" aria-hidden="true" />
        <span class="font-medium">About</span>
      </NuxtLink>
      <NuxtLink to="/privacy" class="inline-flex items-center gap-3 text-gray-800 hover:underline dark:text-gray-200">
        <Icon name="tabler:lock" class="text-gray-500 dark:text-gray-400" aria-hidden="true" />
        <span class="font-medium">Privacy</span>
      </NuxtLink>
      <NuxtLink to="/terms" class="inline-flex items-center gap-3 text-gray-800 hover:underline dark:text-gray-200">
        <Icon name="tabler:file-text" class="text-gray-500 dark:text-gray-400" aria-hidden="true" />
        <span class="font-medium">Terms</span>
      </NuxtLink>
      <NuxtLink to="/feedback" class="inline-flex items-center gap-3 text-gray-800 hover:underline dark:text-gray-200">
        <Icon name="tabler:message-circle" class="text-gray-500 dark:text-gray-400" aria-hidden="true" />
        <span class="font-medium">Send feedback</span>
      </NuxtLink>
    </div>
  </div>
</template>

