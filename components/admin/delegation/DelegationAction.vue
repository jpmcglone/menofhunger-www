<template>
  <article class="delegation-action space-y-4">
    <div><p class="text-xs moh-text-muted">{{ statusLabel(action.status) }} · @{{ actor }}</p><h3 class="mt-1 font-semibold capitalize">{{ action.title }}</h3></div>
    <div v-if="action.body !== null && action.status === 'pending'" class="space-y-2"><label :for="`action-${action.id}`" class="text-xs moh-text-muted">Review and edit before applying</label><Textarea :id="`action-${action.id}`" v-model="body" class="w-full" rows="5" maxlength="32000" :disabled="busy" /><pre v-if="details" class="whitespace-pre-wrap break-words text-sm moh-text-muted font-sans">{{ details }}</pre></div>
    <pre v-else class="whitespace-pre-wrap break-words text-sm font-sans">{{ action.preview }}</pre>
    <div v-if="action.sources.length" class="space-y-2"><p class="text-xs moh-text-muted">Sources</p><a v-for="source in action.sources.filter(s => safeSource(s.url))" :key="source.url" :href="source.url" target="_blank" rel="noopener noreferrer" class="block text-sm underline">{{ source.title }}</a></div>
    <p v-if="action.receipt" class="text-sm moh-text-muted">{{ action.receipt }}</p>
    <div v-if="action.status === 'pending'" class="flex flex-wrap gap-3"><Button :label="action.operation === 'export' ? 'Save export' : 'Apply action'" class="delegation-primary" :disabled="busy || stale" @click="$emit('decide', action.id, 'confirm', action.body !== null ? body : undefined)" /><Button label="Dismiss" text severity="secondary" :disabled="busy" @click="$emit('decide', action.id, 'cancel')" /></div>
    <p v-if="stale && action.status === 'pending'" class="text-xs moh-text-muted">The job changed. Run it again to prepare a fresh proposal.</p>
    <Button v-if="action.operation === 'export'" label="Download export" text severity="secondary" @click="download" />
    <NuxtLink v-if="safePath(action.path)" :to="action.path!" class="inline-block text-sm underline">Open result</NuxtLink>
  </article>
</template>
<script setup lang="ts">
import type { DelegationActionDto } from '~/types/api'
import { delegationStatus as statusLabel, delegationSafePath as safePath, delegationSafeSource as safeSource } from '~/utils/admin-delegation'
const props = defineProps<{ action: DelegationActionDto; actor: string; busy: boolean; stale: boolean }>()
defineEmits<{ decide: [id: string, decision: 'confirm' | 'cancel', body?: string] }>()
const body = ref(props.action.body ?? '')
const details = computed(() => props.action.preview.replace(`body: ${props.action.body ?? ''}`, '').trim())
// Keep in-progress edits through live refreshes. Reset only when a different action is mounted.
const { apiUrl } = useApiClient()
function download() { window.open(apiUrl(`/admin/delegation/actions/${props.action.id}/export`), '_blank', 'noopener,noreferrer') }
</script>
