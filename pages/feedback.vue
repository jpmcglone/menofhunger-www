<template>
  <AppPageContent bottom="standard">
  <div class="mx-auto w-full max-w-3xl px-4 py-8 space-y-8">
    <AppPageHeader title="Feedback" icon="tabler:message-circle" description="Send a note — bugs, feature requests, or anything else." />

    <div class="space-y-6">
      <div class="text-sm moh-text-muted">
        We read every note. If you include your email, we’ll reply when there’s a follow-up or fix.
      </div>

      <div class="grid gap-4 sm:grid-cols-2">
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
        <div ref="detailsTextareaWrapEl" class="relative">
          <Textarea
            v-model="details"
            autoResize
            rows="8"
            class="w-full"
            placeholder="What happened? What did you expect? Steps to reproduce?"
          />
          <AppMentionAutocompletePopover
            v-bind="detailsMention.popoverProps"
            @select="detailsMention.onSelect"
            @highlight="detailsMention.onHighlight"
            @requestClose="detailsMention.onRequestClose"
          />
        </div>
      </AppFormField>

      <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pt-2 border-t moh-border">
        <div class="text-xs moh-text-muted">
          Best reports include device + browser, what you clicked, and what you expected.
        </div>
        <Button
          label="Submit"
          severity="secondary"
          class="w-full sm:w-auto justify-center"
          :loading="submitting"
          :disabled="submitting"
          @click="onSubmit"
        >
          <template #icon>
            <Icon name="tabler:send" aria-hidden="true" />
          </template>
        </Button>
      </div>

      <AppInlineAlert v-if="submitError" severity="danger">
        {{ submitError }}
      </AppInlineAlert>

      <div class="text-xs moh-text-muted">
        Tip: include screenshots when helpful.
      </div>
    </div>
  </div>
  </AppPageContent>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'app',
  title: 'Feedback',
  hideTopBar: true,
})

usePageSeo({
  title: 'Feedback',
  // Utility/support page: keep it out of search results, but ensure clean OG/Twitter previews.
  description: 'Report bugs, request features, or share suggestions with the Men of Hunger team.',
  canonicalPath: '/feedback',
  noindex: true,
})

import { useFormSubmit } from '~/composables/useFormSubmit'
import type { FeedbackItem, FeedbackCategory } from '~/types/api'
import { useMentionAutocomplete } from '~/composables/useMentionAutocomplete'

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

const detailsTextareaWrapEl = ref<HTMLElement | null>(null)
const detailsTextareaEl = ref<HTMLTextAreaElement | null>(null)
const detailsMention = useMentionAutocomplete({
  el: detailsTextareaEl,
  getText: () => details.value,
  setText: (next) => {
    details.value = next
  },
  debounceMs: 200,
  limit: 10,
})

onMounted(() => {
  void nextTick().then(() => {
    detailsTextareaEl.value = (detailsTextareaWrapEl.value?.querySelector('textarea') as HTMLTextAreaElement | null) ?? null
  })
})

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

