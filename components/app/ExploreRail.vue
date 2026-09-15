<template>
  <div class="p-6 space-y-6">
    <section class="space-y-3">
      <h2 class="text-xs font-semibold uppercase moh-text-muted">Your topics</h2>
      <p v-if="!topics.length" class="text-sm moh-text-muted">Choose topics to make Explore feel more like you.</p>
      <div v-else class="flex flex-wrap gap-2">
        <NuxtLink
v-for="topic in topics.slice(0, 6)" :key="topic.value" :to="categories ? `/explore?category=${encodeURIComponent(topic.value)}` : `/topics/${encodeURIComponent(topic.value)}`"
          class="inline-flex min-h-11 items-center px-4 rounded-full border moh-border text-sm font-semibold moh-focus">{{ topic.label }}</NuxtLink>
      </div>
      <Button v-if="isAuthed" label="Manage interests" text severity="secondary" @click="$emit('interests')" />
    </section>
    <section class="border-t moh-border pt-6 space-y-3">
      <h2 class="text-xl font-semibold moh-text">A place to show up</h2>
      <p class="text-[15px] moh-text-muted">Follow people and topics you care about. Join a group and keep the conversation going.</p>
      <NuxtLink to="/groups/explore" class="inline-flex min-h-11 items-center rounded-full border moh-border px-4 text-sm font-semibold moh-focus">Browse groups</NuxtLink>
    </section>
    <section v-if="!isPageAccount" class="border-t moh-border pt-6 space-y-3">
      <h2 class="text-xs font-semibold uppercase text-[var(--moh-checkin)]">Daily check-in</h2>
      <p class="font-semibold moh-text">{{ isOpen ? 'Check-ins are open' : 'Check-ins open at 5pm ET' }}</p>
      <p class="text-sm moh-text-muted">A fresh question every day. Answers close at midnight ET.</p>
      <NuxtLink to="/check-ins" class="inline-flex min-h-11 items-center text-sm font-semibold moh-focus">View check-ins</NuxtLink>
    </section>
  </div>
</template>
<script setup lang="ts">
defineProps<{ categories?: boolean; topics: Array<{ value: string; label: string }> }>()
defineEmits<{ interests: [] }>()
const { isAuthed, isPageAccount } = useAuth()
const { isOpen } = useCheckinWindow()
</script>
