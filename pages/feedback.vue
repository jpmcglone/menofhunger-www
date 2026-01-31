<template>
  <div class="mx-auto w-full max-w-2xl">
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0">
        <h1 class="text-2xl font-bold tracking-tight">Feedback</h1>
        <p class="mt-1 text-sm moh-text-muted">
          Help us improve. Tell us what’s working, what’s broken, or what you want next.
        </p>
      </div>
    </div>

    <div class="mt-6 space-y-4">
      <div class="rounded-xl border moh-border p-4">
        <div class="space-y-3">
          <div class="grid gap-3 sm:grid-cols-2">
            <AppFormField label="Category">
              <Select
                v-model="category"
                class="w-full"
                :options="categories"
                optionLabel="label"
                optionValue="value"
                placeholder="Select…"
              />
            </AppFormField>
            <AppFormField label="Email" optional>
              <InputText v-model="email" class="w-full" placeholder="you@example.com" autocomplete="email" />
            </AppFormField>
          </div>

          <AppFormField label="Subject">
            <InputText v-model="subject" class="w-full" placeholder="Short summary…" />
          </AppFormField>

          <AppFormField label="Details">
            <Textarea v-model="details" autoResize rows="6" class="w-full" placeholder="What happened? What did you expect?" />
          </AppFormField>

          <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div class="text-xs moh-text-muted">
              Feedback form is under construction. Submissions aren’t sent yet.
            </div>
            <Button
              label="Submit"
              icon="pi pi-send"
              severity="secondary"
              :disabled="true"
              v-tooltip.bottom="tinyTooltip('Coming soon')"
            />
          </div>
        </div>
      </div>

      <div class="text-xs moh-text-muted">
        Tip: include your device and what you were trying to do.
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'app',
  title: 'Feedback',
})

usePageSeo({
  title: 'Feedback',
  description: 'Send feedback to Men of Hunger.',
  canonicalPath: '/feedback',
  noindex: true,
})

import { tinyTooltip } from '~/utils/tiny-tooltip'

type Category = 'bug' | 'feature' | 'account' | 'other'

const categories: Array<{ label: string; value: Category }> = [
  { label: 'Bug', value: 'bug' },
  { label: 'Feature request', value: 'feature' },
  { label: 'Account', value: 'account' },
  { label: 'Other', value: 'other' },
]

const category = ref<Category>('feature')
const email = ref('')
const subject = ref('')
const details = ref('')
</script>

