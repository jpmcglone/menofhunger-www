<template>
  <section>
    <header class="moh-gutter-x border-b moh-border py-5">
      <h1 class="moh-h2">Member activation</h1><p class="mt-1 text-sm moh-text-muted">From joining to coming back.</p>
      <div class="mt-4 flex flex-wrap gap-3">
        <label class="text-sm">Joined in <select v-model.number="days" class="ml-2 rounded-md border moh-border moh-surface px-3 py-2"><option :value="30">Past 30 days</option><option :value="90">Past 90 days</option></select></label>
        <Button label="Refresh" text :loading="loading" @click="refresh" />
      </div>
    </header>
    <p v-if="error" role="alert" class="moh-gutter-x py-4 text-sm text-red-600">{{ error }}</p>
    <div v-if="!data && loading" class="moh-gutter-x space-y-4 py-6" aria-label="Loading activation"><Skeleton v-for="n in 4" :key="n" height="3rem" /></div>
    <template v-if="data">
      <ol class="moh-divide">
        <li v-for="step in steps" :key="step.key" class="moh-gutter-x py-4">
          <div class="flex justify-between gap-4 text-sm"><span>{{ step.label }}</span><span class="tabular-nums"><strong>{{ data.counts[step.key] }}</strong> <span class="moh-text-muted">/ {{ data.counts.joined }}</span></span></div>
          <div class="mt-2 h-1.5 overflow-hidden rounded-full bg-black/5 dark:bg-white/10"><div class="h-full rounded-full bg-current opacity-60" :style="{ width: `${data.counts.joined ? data.counts[step.key] / data.counts.joined * 100 : 0}%` }" /></div>
        </li>
      </ol>
      <div class="moh-gutter-x flex flex-wrap items-center justify-between gap-3 border-y moh-border py-4">
        <h2 class="moh-h3">Explore members</h2>
        <label class="text-sm"><span class="sr-only">Highest completed milestone</span><select v-model="stage" class="rounded-md border moh-border moh-surface px-3 py-2"><option value="">All members</option><option value="joined">Not yet verified</option><option value="verified">No public contribution yet</option><option value="contributed">No later-day return yet</option><option value="returned">Returned after contributing</option></select></label>
      </div>
      <p v-if="!data.members.length" class="moh-gutter-x py-8 moh-text-muted">No members match this selection.</p>
      <div class="moh-divide"><NuxtLink v-for="member in data.members" :key="member.id" :to="`/admin/users/${member.id}`" class="moh-gutter-x flex items-center justify-between gap-3 py-4 hover:bg-black/5 dark:hover:bg-white/5"><div><span class="font-medium">@{{ member.username || 'username not set' }}</span><p class="mt-1 text-xs moh-text-muted">Joined {{ new Date(member.createdAt).toLocaleDateString() }}</p></div><span class="text-sm moh-text-muted">{{ steps.find(s => s.key === member.stage)?.label }}</span></NuxtLink></div>
      <div class="moh-gutter-x flex items-center justify-between py-4"><Button label="Previous" text :disabled="offset === 0 || loading" @click="offset = Math.max(0, offset - 25)" /><span class="text-xs moh-text-muted">{{ data.matching }} matching members</span><Button label="Next" text :disabled="offset + 25 >= data.matching || loading" @click="offset += 25" /></div>
      <details class="moh-gutter-x border-t moh-border py-4 text-sm moh-text-muted"><summary class="cursor-pointer">How these milestones are counted</summary><p v-for="definition in data.definitions" :key="definition" class="mt-3">{{ definition }}</p></details>
    </template>
  </section>
</template>
<script setup lang="ts">
import type { AdminActivationDto } from '~/types/api'
definePageMeta({ layout: 'app', middleware: ['admin'] })
const days = ref(30)
const stage = ref('')
const offset = ref(0)
watch([days, stage], () => { offset.value = 0 })
const query = computed(() => ({ days: days.value, ...(stage.value ? { stage: stage.value } : {}), offset: offset.value, limit: 25 }))
const { data, error, loading, refresh } = usePrivateApiData<AdminActivationDto>('/admin/operations/activation', query)
const steps = [{ key: 'joined', label: 'Joined' }, { key: 'verified', label: 'Verified' }, { key: 'contributed', label: 'Contributed publicly' }, { key: 'returned', label: 'Returned on a later day' }] as const
</script>
