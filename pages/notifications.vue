<template>
  <div class="-mx-4 sm:mx-0">
    <div class="flex justify-end px-4 py-2">
      <Button label="Mark all read" text severity="secondary" />
    </div>

    <div class="divide-y divide-gray-200 dark:divide-zinc-800">
      <button
        v-for="n in notifications"
        :key="n.id"
        type="button"
        class="w-full text-left"
      >
        <div
          :class="[
            'flex gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-zinc-900 transition-colors',
            n.read ? '' : 'bg-gray-50/80 dark:bg-zinc-900/40'
          ]"
        >
          <div class="mt-1 flex shrink-0 items-start">
            <span
              :class="[
                'mt-2 h-2 w-2 rounded-full',
                n.read ? 'bg-gray-300 dark:bg-zinc-700' : 'bg-blue-500'
              ]"
              aria-hidden="true"
            />
          </div>

          <div class="flex min-w-0 flex-1 items-start gap-3">
            <div class="h-10 w-10 rounded-full bg-gray-200 dark:bg-zinc-800 shrink-0" aria-hidden="true" />
            <div class="min-w-0 flex-1">
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <div :class="['truncate', n.read ? 'font-medium' : 'font-semibold']">
                    {{ n.title }}
                  </div>
                  <div class="mt-0.5 truncate text-sm text-gray-600 dark:text-gray-300">
                    {{ n.body }}
                  </div>
                </div>
                <div class="shrink-0 text-xs text-gray-500 dark:text-gray-400">
                  {{ n.when }}
                </div>
              </div>
              <div class="mt-2 text-xs text-gray-500 dark:text-gray-400">
                {{ n.context }}
              </div>
            </div>
          </div>
        </div>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'app',
  title: 'Notifications'
})

usePageSeo({
  title: 'Notifications',
  description: 'Notifications for Men of Hunger — replies, follows, and updates from your network.'
})

type FakeNotification = {
  id: string
  read: boolean
  title: string
  body: string
  when: string
  context: string
}

const notifications = ref<FakeNotification[]>([
  {
    id: '1',
    read: false,
    title: 'New reply from @johnlocke',
    body: '“Discipline is choosing what you want most…”',
    when: '2m',
    context: 'Replied to your post'
  },
  {
    id: '2',
    read: false,
    title: '@csl_responded followed you',
    body: '“Glad to be here — love the mission.”',
    when: '18m',
    context: 'New follower'
  },
  {
    id: '3',
    read: true,
    title: 'Group invite: Daily Discipline',
    body: 'You’ve been invited to join “Daily Discipline”.',
    when: '1h',
    context: 'Groups'
  },
  {
    id: '4',
    read: true,
    title: 'Mentioned by @stevejobs',
    body: '“Simplicity is the ultimate sophistication.”',
    when: '3h',
    context: 'Mention'
  },
  {
    id: '5',
    read: true,
    title: 'Reminder',
    body: 'Post your daily check-in to stay consistent.',
    when: 'Yesterday',
    context: 'System'
  }
])
</script>

