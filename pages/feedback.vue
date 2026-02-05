<template>
  <div class="mx-auto w-full max-w-2xl">
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
              We read every note. Share as much detail as you can.
            </div>
            <Button
              label="Submit"
              icon="pi pi-send"
              severity="secondary"
              :loading="submitting"
              :disabled="submitting"
              @click="onSubmit"
            />
          </div>
          <AppInlineAlert v-if="submitError" severity="danger">
            {{ submitError }}
          </AppInlineAlert>
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

import { useFormSubmit } from '~/composables/useFormSubmit'
import type { FeedbackItem, FeedbackCategory } from '~/types/api'

const categories: Array<{ label: string; value: FeedbackCategory }> = [
  { label: 'Bug', value: 'bug' },
  { label: 'Feature request', value: 'feature' },
  { label: 'Account', value: 'account' },
  { label: 'Other', value: 'other' },
]

const category = ref<FeedbackCategory>('feature')
const email = ref('')
const subject = ref('')
const details = ref('')

const { apiFetchData } = useApiClient()
const { push: pushToast } = useAppToast()
const { submit: onSubmit, submitting, submitError } = useFormSubmit(
  async () => {
    await apiFetchData<FeedbackItem>('/feedback', {
      method: 'POST',
      body: {
        category: category.value,
        email: email.value.trim() ? email.value.trim() : null,
        subject: subject.value.trim(),
        details: details.value.trim(),
      },
    })
  },
  {
    defaultError: 'Failed to send feedback.',
    onSuccess: () => {
      subject.value = ''
      details.value = ''
      pushToast({
        title: 'Thanks for the feedback',
        message: 'We received your note.',
        tone: 'public',
        durationMs: 5000,
      })
    },
  },
)
</script>

