<template>
  <div class="space-y-4">
    <p class="moh-text-muted">Groups and men matched to what you care about.</p>
    <form class="space-y-2" @submit.prevent="find">
      <label for="activation-intent" class="block text-[13px] font-semibold">In a sentence, what are you looking for? <span class="font-normal moh-text-muted">(optional)</span></label>
      <div class="flex gap-2">
        <input id="activation-intent" v-model="intent" type="text" maxlength="300" autocomplete="off" placeholder="Training with other dads, a men’s Bible study…" class="intent-input min-h-11 min-w-0 flex-1 rounded-xl border moh-border bg-transparent px-3 text-[15px]">
        <button type="submit" class="min-h-11 shrink-0 rounded-full border moh-border px-4 text-sm font-semibold" :disabled="matchesLoading">Match</button>
      </div>
    </form>
    <p v-if="matchesLoading || loading" role="status">Loading suggestions…</p>
    <p v-if="matchesError && error" role="alert">Couldn’t load suggestions. Try again.</p>
    <template v-if="groups.length">
      <h3 class="text-[15px] font-semibold">Groups for you</h3>
      <AppFeedActivationGroupRow v-for="group in groups" :key="group.id" :group="group" />
    </template>
    <template v-if="people.length">
      <h3 class="text-[15px] font-semibold">Men to follow</h3>
      <AppFeedHomeWelcomePersonRow v-for="person in people" :key="person.id" :user="person" :interactive="false" @followed="$emit('followed')" />
    </template>
    <p v-else-if="!matchesLoading && !loading && !groups.length" class="moh-text-muted">No suggestions yet. Check back soon.</p>
    <button type="button" class="min-h-11 w-full font-semibold" :disabled="loading || matchesLoading" @click="more">{{ error ? 'Try again' : 'More suggestions' }}</button>
  </div>
</template>
<script setup lang="ts">
defineEmits<{ followed: [] }>()
const { users, loading, error, refresh } = useWhoToFollow({ defaultLimit: 12 })
const { matches, loading: matchesLoading, error: matchesError, load } = useOnboardingMatches()
const intent = ref('')
const hidden = ['john', 'menofhunger', 'marv']
const groups = computed(() => matches.value?.groups ?? [])
// Matches lead; the general list fills in so the step is never empty or short.
const people = computed(() => {
  const seen = new Set<string>()
  return [...(matches.value?.people ?? []), ...users.value]
    .filter(person => !hidden.includes(person.username?.toLowerCase() ?? '') && !seen.has(person.id) && seen.add(person.id))
    .slice(0, 12)
})
function find() { void load(intent.value) }
function more() { void load(intent.value); void refresh({ force: true }) }
onMounted(() => { void load() })
</script>
<style scoped>
.intent-input:focus-visible { outline: 2px solid var(--moh-brass); outline-offset: 2px; }
</style>
