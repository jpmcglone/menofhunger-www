<template>
  <form class="space-y-6" @submit.prevent="submit">
    <div class="space-y-2"><label for="job-workflow">Workflow</label><select id="job-workflow" v-model="form.workflow" class="delegation-field"><option v-for="flow in workspace.workflows" :key="flow.id" :value="flow.id">{{ flow.title }}</option></select><p class="text-sm moh-text-muted">{{ workspace.workflows.find(f => f.id === form.workflow)?.description }}</p></div>
    <div class="space-y-2"><label for="job-title">Name</label><InputText id="job-title" v-model="form.title" class="w-full" required maxlength="100" placeholder="Morning news" /></div>
    <div class="space-y-2"><label for="job-instruction">What should MARV do?</label><Textarea id="job-instruction" v-model="form.instruction" class="w-full" rows="4" required maxlength="6000" placeholder="Find one major news story, write an original summary, and cite the reporting." /></div>
    <div class="space-y-2"><label for="job-actor">Act as</label><select id="job-actor" v-model="form.actorUsername" class="delegation-field"><option value="">Your account · @{{ workspace.accounts[0]?.username }}</option><option v-for="account in workspace.accounts.slice(1)" :key="account.id" :value="account.username ?? ''">@{{ account.username }} · Page</option></select><p class="text-sm moh-text-muted">Your account is the default. MARV can use only pages you operate.</p></div>
    <div class="space-y-3"><label for="job-frequency">Schedule</label><select id="job-frequency" v-model="form.schedule.frequency" class="delegation-field"><option value="once">Once</option><option value="daily">Every day</option><option value="weekly">Every week</option></select>
      <div v-if="form.schedule.frequency === 'once'" class="space-y-2"><label for="job-at" class="text-sm moh-text-muted">Start at (optional; blank runs now)</label><input id="job-at" v-model="onceAt" type="datetime-local" class="delegation-field"></div>
      <template v-else><div class="flex flex-wrap gap-4"><div class="flex-1 space-y-2"><label for="job-time" class="text-sm moh-text-muted">Time</label><input id="job-time" v-model="form.schedule.time" type="time" required class="delegation-field"></div><div class="flex-1 space-y-2"><label for="job-zone" class="text-sm moh-text-muted">Time zone</label><InputText id="job-zone" v-model="form.schedule.timeZone" required class="w-full" placeholder="America/New_York" /></div></div><div v-if="form.schedule.frequency === 'weekly'" class="space-y-2"><label for="job-weekday">Day</label><select id="job-weekday" v-model.number="form.schedule.weekday" class="delegation-field"><option v-for="(day, index) in weekdays" :key="day" :value="index">{{ day }}</option></select></div></template>
    </div>
    <div class="space-y-2"><label for="job-permission">Permission</label><select id="job-permission" v-model="form.permission" class="delegation-field"><option value="review">Prepare actions for my review</option><option v-if="form.workflow === 'news'" value="publish_news" :disabled="!workspace.integrations.find(i => i.id === 'news')?.available">Publish sourced news automatically</option></select><p class="text-sm moh-text-muted">{{ form.permission === 'publish_news' ? 'MARV may publish one sourced news post per run as the selected account. You can pause this permission at any time.' : 'MARV researches and prepares proposals. Each action waits for your review.' }}</p></div>
    <AppInlineAlert v-if="validation" severity="danger">{{ validation }}</AppInlineAlert>
    <div class="flex flex-wrap items-center gap-3"><Button type="submit" :label="initial ? 'Save changes' : 'Create job'" class="delegation-primary" :loading="busy" :disabled="busy || !workspace.configured" /><Button label="Cancel" text severity="secondary" @click="$emit('cancel')" /></div>
  </form>
</template>
<script setup lang="ts">
import type { DelegationWorkspaceDto, DelegationJobDto, DelegationScheduleDto } from '~/types/api'
const props = defineProps<{ workspace: DelegationWorkspaceDto; initial?: DelegationJobDto; busy: boolean }>()
const emit = defineEmits<{ save: [input: Record<string, unknown>]; cancel: [] }>()
const form = reactive({ title: props.initial?.title ?? '', workflow: props.initial?.workflow ?? 'news', instruction: props.initial?.instruction ?? '', actorUsername: props.initial?.actor.id === props.workspace.accounts[0]?.id ? '' : props.initial?.actor.username ?? '', permission: props.initial?.permission ?? 'review', schedule: { frequency: 'once', time: '08:00', timeZone: 'America/New_York', weekday: 1, ...props.initial?.schedule } as DelegationScheduleDto })
const onceAt = ref(''), validation = ref('')
let requestId: string | undefined
const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
onMounted(() => { if (form.schedule.at) { const date = new Date(form.schedule.at); date.setMinutes(date.getMinutes() - date.getTimezoneOffset()); onceAt.value = date.toISOString().slice(0,16) } })
watch(() => form.workflow, () => { if (form.workflow !== 'news') form.permission = 'review' })
function submit() {
  validation.value = ''
  try { new Intl.DateTimeFormat('en', { timeZone: form.schedule.timeZone }) } catch { validation.value = 'Enter a valid time zone, such as America/New_York.'; return }
  if (!form.title.trim() || !form.instruction.trim()) { validation.value = 'Add a name and instructions.'; return }
  if (onceAt.value && form.schedule.frequency === 'once' && new Date(onceAt.value).getTime() <= Date.now()) { validation.value = 'Choose a future time, or clear it to run now.'; return }
  requestId ??= props.initial?.id ?? crypto.randomUUID()
  emit('save', { ...form, id: requestId, title: form.title.trim(), instruction: form.instruction.trim(), actorUsername: form.actorUsername || undefined, schedule: { ...form.schedule, at: form.schedule.frequency === 'once' && onceAt.value ? new Date(onceAt.value).toISOString() : undefined }, ...(props.initial ? { revision: props.initial.revision } : {}) })
}
</script>
