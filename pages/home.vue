<template>
  <div class="-mx-4">
    <!-- Composer -->
    <div class="border-b border-gray-200 px-4 py-4 dark:border-zinc-800">
      <div class="flex gap-3">
        <div class="h-10 w-10 shrink-0 rounded-full bg-gray-200 dark:bg-zinc-800" aria-hidden="true" />
        <div class="min-w-0 flex-1">
          <Textarea
            v-model="draft"
            autoResize
            rows="3"
            class="w-full"
            placeholder="What’s happening?"
          />
          <div class="mt-3 flex items-center justify-between">
            <div class="flex items-center gap-2 text-gray-500 dark:text-gray-400">
              <Button icon="pi pi-image" text rounded severity="secondary" aria-label="Media" />
              <Button icon="pi pi-face-smile" text rounded severity="secondary" aria-label="Emoji" />
              <Button icon="pi pi-map-marker" text rounded severity="secondary" aria-label="Location" />
            </div>
            <Button label="Post" rounded :disabled="!draft.trim()" @click="submit" />
          </div>
        </div>
      </div>
    </div>

    <!-- Posts -->
    <div>
      <div
        v-for="p in posts"
        :key="p.id"
        class="border-b border-gray-200 px-4 py-4 hover:bg-gray-50 dark:border-zinc-800 dark:hover:bg-zinc-950/40"
      >
        <div class="flex gap-3">
          <div class="h-10 w-10 shrink-0 rounded-full bg-gray-200 dark:bg-zinc-800" aria-hidden="true" />
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2">
              <span class="font-semibold">You</span>
              <span class="text-sm text-gray-500 dark:text-gray-400">@you</span>
              <span class="text-sm text-gray-500 dark:text-gray-400">·</span>
              <span class="text-sm text-gray-500 dark:text-gray-400">
                {{ new Date(p.createdAt).toLocaleString() }}
              </span>
            </div>
            <p class="mt-2 whitespace-pre-wrap text-gray-900 dark:text-gray-100">
              {{ p.body }}
            </p>

            <div class="mt-3 flex items-center text-gray-500 dark:text-gray-400">
              <div class="flex items-center gap-6">
                <Button icon="pi pi-comment" text rounded severity="secondary" aria-label="Reply" />
                <Button icon="pi pi-refresh" text rounded severity="secondary" aria-label="Repost" />
                <Button icon="pi pi-heart" text rounded severity="secondary" aria-label="Like" />
              </div>
              <div class="flex-1" />
              <Button icon="pi pi-share-alt" text rounded severity="secondary" aria-label="Share" />
            </div>
          </div>
          <Button icon="pi pi-ellipsis-h" text rounded severity="secondary" aria-label="More" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'app',
  title: 'Home'
})

usePageSeo({
  title: 'Home',
  description: 'Your Men of Hunger wall — share wins, goals, and updates in simple chronological order.'
})

const { posts, addPost } = useWallPosts()
const draft = ref('')

const submit = () => {
  addPost(draft.value)
  draft.value = ''
}
</script>

