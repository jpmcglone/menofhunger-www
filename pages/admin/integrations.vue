<template>
  <AppPageContent bottom="standard">
    <AppPageHeader title="Integration spending" description="Estimates include pending provider requests." class="p-4" />
    <div class="px-4 pb-6 space-y-6 max-w-3xl">
      <p v-if="error" role="alert">{{ error }}</p>
      <Button label="Refresh" text :loading="loading" :disabled="busy" @click="load" />
      <template v-if="spending && operations">
        <section aria-labelledby="alerts-heading" class="space-y-3">
          <h2 id="alerts-heading" class="moh-h2">Needs review</h2>
          <p v-if="!operations.alerts.length" class="moh-text-muted">No active alerts</p>
          <p v-for="alert in operations.alerts" :key="alert.key" role="status">{{ alert.message }}</p>
        </section>
        <form class="space-y-4" @submit.prevent="save">
          <h2 class="moh-h2">Spending controls</h2>
          <label class="flex items-center justify-between min-h-11 gap-3">
            <span>Pause new paid requests</span><Checkbox v-model="paused" binary :disabled="busy" />
          </label>
          <div v-for="(field, index) in fields" :key="field.key" class="flex flex-wrap items-center justify-between gap-2">
            <label :for="`cap-${field.key}`">{{ field.label }} (USD)</label>
            <InputText :id="`cap-${field.key}`" v-model="ceilings[index]" inputmode="decimal" :disabled="busy" :placeholder="String(field.maximum / 1000000)" />
          </div>
          <p class="moh-meta moh-text-muted">Blank uses the configured ceiling. Changes affect new requests; already dispatched requests may finish.</p>
          <label for="control-reason" class="block">Reason for change</label>
          <Textarea id="control-reason" v-model="reason" class="w-full" :maxlength="1000" :disabled="busy" />
          <Button type="submit" label="Save controls" :loading="busy" :disabled="!validControls || busy" />
        </form>
        <section class="space-y-3">
          <h2 class="moh-h2">Usage this month</h2>
          <p class="moh-meta moh-text-muted">{{ formatLocaleDate(new Date(spending.month), { month: 'long', year: 'numeric', timeZone: 'UTC' }) }}</p>
          <p v-if="!spending.groups.length">No recorded usage</p>
          <div class="moh-divide">
            <div v-for="(group, index) in spending.groups" :key="index" class="py-3">
              <p>{{ group.provider.toUpperCase() }} · {{ group.bucket }} · {{ group.status }}</p>
              <p class="moh-meta moh-text-muted">{{ group.operationCount }} operations · {{ money(group.reservedMicros) }} reserved · {{ money(group.chargedMicros) }} recorded</p>
              <p class="moh-meta moh-text-muted">{{ group.priceVersion }}</p>
            </div>
          </div>
        </section>
        <section class="space-y-3">
          <h2 class="moh-h2">Pending operations</h2>
          <p v-if="!spending.pending.length">No pending operations</p>
          <div class="moh-divide">
            <button v-for="item in spending.pending" :key="item.id" class="block w-full text-left min-h-11 py-3" @click="review(item)">
              <span class="block">{{ item.provider.toUpperCase() }} · {{ item.action }} · {{ item.status }}</span>
              <span class="moh-meta moh-text-muted">{{ money(item.reservedMicros) }} held · Review charge</span>
            </button>
          </div>
        </section>
        <section class="space-y-3">
          <h2 class="moh-h2">Recent changes</h2>
          <div v-for="change in operations.changes" :key="change.id">
            <p>{{ change.reason }}</p><p class="moh-meta moh-text-muted">{{ formatLocaleDateTime(new Date(change.createdAt)) }}</p>
          </div>
        </section>
      </template>
      <p v-else-if="loading" role="status">Loading spending…</p>
    </div>
    <Dialog :visible="Boolean(reviewing)" modal header="Review provider charge" :style="{ width: '28rem', maxWidth: '95vw' }" @update:visible="value => { if (!value && !busy) reviewing = null }">
      <form v-if="reviewing" class="space-y-4" @submit.prevent="reconcile">
        <p>{{ reviewing.provider.toUpperCase() }} · {{ reviewing.action }} · {{ reviewing.status }}</p>
        <p>{{ money(reviewing.reservedMicros) }} reserved</p>
        <label for="outcome" class="block">Outcome</label>
        <select id="outcome" v-model="outcome" class="moh-surface-2 p-3 w-full" :disabled="busy"><option value="settled">Settled</option><option value="released">Released</option></select>
        <label for="charge" class="block">Actual charge (USD)</label>
        <InputText id="charge" v-model="charge" inputmode="decimal" class="w-full" :disabled="busy" />
        <label for="evidence" class="block">Invoice or provider outcome</label>
        <Textarea id="evidence" v-model="evidence" :maxlength="1000" class="w-full" :disabled="busy" />
        <p class="moh-meta moh-text-muted">Records the charge without publishing or retrying a post. A released request may still have a provider charge.</p>
        <p v-if="reviewError" role="alert">{{ reviewError }}</p>
        <Button type="submit" label="Record charge" :loading="busy" :disabled="busy || integrationMicros(charge) === null || evidence.trim().length < 10" />
      </form>
    </Dialog>
  </AppPageContent>
</template>

<script setup lang="ts">
import { formatLocaleDate, formatLocaleDateTime } from '~/utils/time-format'
import { formatCount } from '~/utils/number-format'
import type { IntegrationSpendDiagnosticsDto, IntegrationOperationsDto } from '~/types/api-contracts.gen'
import { integrationMicros, integrationDollars as money } from '~/utils/integration-money'
import { getApiErrorMessage } from '~/utils/api-error'
definePageMeta({ layout: 'app', middleware: ['admin'] })
const { apiFetchData } = useApiClient()
const spending = ref<IntegrationSpendDiagnosticsDto | null>(null)
const operations = ref<IntegrationOperationsDto | null>(null)
const paused = ref(false), ceilings = ref(['', '', '', '']), reason = ref('')
const error = ref(''), loading = ref(false), busy = ref(false)
const reviewing = ref<IntegrationSpendDiagnosticsDto['pending'][number] | null>(null)
const charge = ref(''), evidence = ref(''), outcome = ref<'settled' | 'released'>('settled'), reviewError = ref('')
const fields = computed(() => [
  { key: 'companyMonthlyMicros', label: 'Company / month', maximum: spending.value?.limits.companyMonthlyMicros ?? 0 },
  { key: 'companyDailyMicros', label: 'Company / day', maximum: spending.value?.limits.companyDailyMicros ?? 0 },
  { key: 'xMonthlyMicros', label: 'X / month', maximum: spending.value?.limits.xMonthlyMicros ?? 0 },
  { key: 'reserveMonthlyMicros', label: 'Shared reserve / month', maximum: spending.value?.limits.fundedReserveMicros ?? 0 },
] as const)
const validControls = computed(() => reason.value.trim().length >= 10 && ceilings.value.every((s, i) => s === '' || (integrationMicros(s) !== null && integrationMicros(s)! <= fields.value[i]!.maximum)))
async function load() {
  loading.value = true
  try {
    const [spend, ops] = await Promise.all([apiFetchData<IntegrationSpendDiagnosticsDto>('/admin/integrations/spend'), apiFetchData<IntegrationOperationsDto>('/admin/integrations/operations')])
    spending.value = spend; operations.value = ops; paused.value = ops.control.paused
    ceilings.value = fields.value.map(field => ops.control[field.key] === null ? '' : String(ops.control[field.key]! / 1_000_000))
    error.value = ''
  } catch (e) { error.value = getApiErrorMessage(e) || 'Could not load integration spending.' }
  finally { loading.value = false }
}
async function save() {
  if (!operations.value || !validControls.value || busy.value) return
  busy.value = true
  try {
    await apiFetchData('/admin/integrations/controls', { method: 'POST', body: {
      expectedRevision: operations.value.control.revision, paused: paused.value, reason: reason.value,
      ...Object.fromEntries(fields.value.map((field, i) => [field.key, ceilings.value[i] === '' ? null : integrationMicros(ceilings.value[i]!)])),
    } })
    reason.value = ''; await load()
  } catch (e) { error.value = getApiErrorMessage(e) || 'Could not save controls.' }
  finally { busy.value = false }
}
function review(item: IntegrationSpendDiagnosticsDto['pending'][number]) { reviewing.value = item; charge.value = ''; evidence.value = ''; reviewError.value = ''; outcome.value = 'settled' }
async function reconcile() {
  const item = reviewing.value, micros = integrationMicros(charge.value)
  if (!item || micros === null || evidence.value.trim().length < 10 || busy.value) return
  busy.value = true
  try {
    await apiFetchData(`/admin/integrations/usage/${encodeURIComponent(item.id)}/reconcile`, { method: 'POST', body: { status: outcome.value, expectedStatus: item.status, chargedMicros: micros, evidence: evidence.value } })
    reviewing.value = null; await load()
  } catch (e) { reviewError.value = getApiErrorMessage(e) || 'Could not record charge.' }
  finally { busy.value = false }
}
onMounted(load)
</script>
