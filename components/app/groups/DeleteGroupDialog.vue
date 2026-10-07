<template>
  <AppModal
    :model-value="modelValue"
    title="Delete group"
    show-submit
    submit-label="Delete"
    :saving="busy"
    :can-submit="matches"
    max-width-class="max-w-md"
    body-class="p-4"
    @update:model-value="emit('update:modelValue', $event)"
    @submit="remove"
  >
    <div class="space-y-3">
      <h3 class="text-lg font-bold moh-text">Delete {{ shell?.name }}?</h3>
      <p class="text-sm moh-text-muted">
        This removes the group, its channels and messages for all {{ (shell?.memberCount ?? 0).toLocaleString() }}
        {{ shell?.memberCount === 1 ? 'member' : 'members' }}. It cannot be undone, and the group address stays reserved.
      </p>
      <AppFormField :label="`Type ${shell?.name ?? 'the group name'} to confirm`">
        <InputText v-model="typed" class="w-full" autocomplete="off" autocapitalize="off" spellcheck="false" :disabled="busy" @keydown.enter.prevent="matches && remove()" />
      </AppFormField>
      <AppInlineAlert v-if="error" severity="danger">{{ error }}</AppInlineAlert>
    </div>
  </AppModal>
</template>

<script setup lang="ts">
import type { CommunityGroupShell } from '~/types/api'
import { getApiErrorMessage } from '~/utils/api-error'

const props = defineProps<{ modelValue: boolean; shell: CommunityGroupShell | null }>()
const emit = defineEmits<{ (e: 'update:modelValue', v: boolean): void; (e: 'deleted'): void }>()

const { apiFetchData } = useApiClient()
const { invalidate: invalidateMyGroups } = useMyGroups()
const typed = ref('')
const busy = ref(false)
const error = ref<string | null>(null)
const matches = computed(() => Boolean(props.shell) && typed.value.trim() === props.shell!.name.trim())

watch(() => props.modelValue, (open) => {
  if (open) { typed.value = ''; error.value = null }
})

async function remove() {
  if (!props.shell || !matches.value || busy.value) return
  busy.value = true
  error.value = null
  try {
    await apiFetchData(`/groups/${encodeURIComponent(props.shell.id)}/delete`, {
      method: 'POST',
      body: { confirmName: typed.value.trim() },
    })
    invalidateMyGroups()
    emit('update:modelValue', false)
    emit('deleted')
  } catch (e: unknown) {
    error.value = getApiErrorMessage(e) || 'Could not delete the group.'
  } finally {
    busy.value = false
  }
}
</script>
