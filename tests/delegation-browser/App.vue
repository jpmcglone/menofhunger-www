<template><main class="mx-auto max-w-xl p-6"><h1 class="text-xl font-semibold mb-6">New MARV job</h1><DelegationEditor :workspace="workspace" :busy="false" @save="saved = JSON.stringify($event)" /><pre id="saved" class="whitespace-pre-wrap break-all">{{ saved }}</pre></main></template>
<script setup lang="ts">
import DelegationEditor from '../../components/admin/delegation/DelegationEditor.vue'
import type { DelegationWorkspaceDto } from '../../types/api'
const saved = ref('')
const workspace: DelegationWorkspaceDto = { configured: true, access: 'admin', actionSchema: {}, operations: {}, jobs: [], accounts: [{ id: 'fixture', username: 'founder', name: 'Founder', accountKind: 'person' }], workflows: [{ id: 'operations', title: 'Operations', description: 'Review company health.' }, { id: 'news', title: 'News', description: 'Research sourced news.' }], integrations: [], templates: [{ id: 'founder', title: 'Founder briefing', workflow: 'operations', instruction: 'Report what changed and three priorities.', schedule: { frequency: 'daily', time: '08:00', timeZone: 'America/New_York', weekday: 1, weekdays: [1,2,3,4,5], notification: 'digest' } }] }
</script>
