<template>
  <div class="h-[calc(100dvh-9rem)] sm:h-[calc(100dvh-6.5rem)]">
    <div class="grid h-full" :class="isTinyViewport ? 'grid-cols-1' : ''" :style="gridStyle">
      <!-- Left column: thread list -->
      <section
        v-if="showListPane"
        :class="[
          'h-full overflow-y-auto border-b border-gray-200 dark:border-zinc-800',
          // When both panes are visible, add the divider between them.
          !isTinyViewport ? 'border-b-0 border-r pr-4' : 'pr-0'
        ]"
      >
        <div class="flex items-center justify-between gap-3">
          <div class="text-lg font-semibold">Conversations</div>
          <Button label="New" icon="pi pi-plus" size="small" severity="secondary" />
        </div>

        <div class="mt-4 space-y-2">
          <button
            v-for="t in threads"
            :key="t.id"
            type="button"
            class="w-full text-left"
            @click="selectedThreadId = t.id"
          >
            <div class="flex items-center gap-3">
              <div
                :class="[
                  'w-full rounded-xl border p-3 transition-colors',
                  selectedThreadId === t.id
                    ? 'border-gray-300 bg-gray-50 dark:border-zinc-700 dark:bg-zinc-900'
                    : 'border-gray-200 hover:bg-gray-50 dark:border-zinc-800 dark:hover:bg-zinc-900'
                ]"
              >
                <div class="flex items-center gap-3">
                  <div class="h-10 w-10 rounded-full bg-gray-200 dark:bg-zinc-800" aria-hidden="true" />
                  <div class="min-w-0 flex-1">
                    <div class="flex items-center justify-between gap-2">
                      <div class="font-semibold truncate">{{ t.name }}</div>
                      <div class="text-xs text-gray-500 dark:text-gray-400">{{ t.when }}</div>
                    </div>
                    <div class="text-sm text-gray-600 dark:text-gray-300 truncate">
                      {{ t.preview }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </button>
        </div>
      </section>

      <!-- Right column: chat for selected thread -->
      <section v-if="showChatPane" :class="['h-full overflow-hidden', !isTinyViewport ? 'pl-4' : '']">
        <div class="flex h-full flex-col">
          <div class="border-b border-gray-200 py-3 dark:border-zinc-800">
            <div class="flex items-center justify-between gap-3">
              <div class="flex min-w-0 items-start gap-2">
                <Button
                  v-if="isTinyViewport && selectedThreadId"
                  icon="pi pi-arrow-left"
                  text
                  severity="secondary"
                  aria-label="Back"
                  @click="selectedThreadId = null"
                />
                <div class="min-w-0">
                  <div class="font-semibold truncate">
                    {{ selectedThread ? `Chat with ${selectedThread.name}` : 'Select a conversation' }}
                  </div>
                  <div class="text-xs text-gray-500 dark:text-gray-400 truncate">
                    This pane is the conversation for the selected person.
                  </div>
                </div>
              </div>
              <Button icon="pi pi-ellipsis-h" text severity="secondary" />
            </div>
          </div>

          <div v-if="selectedThreadId" class="flex-1 overflow-y-auto py-4">
            <div class="w-full space-y-3 px-4">
              <div
                v-for="m in messages"
                :key="m.id"
                class="flex w-full"
                :class="m.from === 'me' ? 'justify-end' : 'justify-start'"
              >
                <div
                  :class="[
                    'max-w-[85%] rounded-2xl p-3 text-sm',
                    m.from === 'me'
                      ? 'bg-black text-white dark:bg-white dark:text-black'
                      : 'bg-gray-100 text-gray-800 dark:bg-zinc-900 dark:text-gray-200'
                  ]"
                >
                  {{ m.text }}
                </div>
              </div>
            </div>
          </div>
          <div v-else class="flex-1" />

          <div v-if="selectedThreadId" class="border-t border-gray-200 py-3 dark:border-zinc-800">
            <div class="flex items-end gap-2">
              <Textarea autoResize rows="1" class="w-full" placeholder="Type a message… (composer goes here)" />
              <Button label="Send" icon="pi pi-send" />
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'app',
  title: 'Messages'
})

usePageSeo({
  title: 'Messages',
  description: 'Direct messages in Men of Hunger — keep conversations focused and intentional.'
})

type FakeMessage = {
  id: string
  from: 'me' | 'them'
  text: string
}

const messages = ref<FakeMessage[]>([
  { id: '1', from: 'them', text: 'Placeholder incoming bubble' },
  { id: '2', from: 'me', text: 'Placeholder outgoing bubble' },
  { id: '3', from: 'them', text: 'Placeholder messages area (scrollable)' }
])

type FakeThread = {
  id: string
  name: string
  preview: string
  when: string
}

const threads = ref<FakeThread[]>([
  { id: 't1', name: 'John Locke', preview: 'Remember why you started.', when: '2h' },
  { id: 't2', name: 'C.S. Lewis', preview: 'Courage, dear heart.', when: '1d' },
  { id: 't3', name: 'John Calvin', preview: 'Steadfastness over feelings.', when: '3d' },
  { id: 't4', name: 'Jack Shepherd', preview: 'We keep moving forward.', when: '1w' }
])

const selectedThreadId = ref<string | null>(null)
const selectedThread = computed(() => threads.value.find((t) => t.id === selectedThreadId.value) ?? null)

const { isTinyViewport, showListPane, showDetailPane: showChatPane, gridStyle } = useTwoPaneLayout(selectedThreadId, {
  leftCols: '22rem',
  // Messages should not collapse panes due to short viewport height.
  // Only collapse when the viewport is actually narrow.
  minHeight: 0,
})
</script>

