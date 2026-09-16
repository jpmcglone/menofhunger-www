<template>
  <AppPageContent top="standard" bottom="standard">
    <!-- Figma: YnuRSJB7p90n9jEY4mb4RN / 647:7 (desktop), 650:20384 (mobile) -->
    <section class="membership-page mx-auto w-full max-w-[1100px] space-y-8 px-5 sm:px-6">
      <header class="space-y-3">
        <p class="text-xs font-semibold uppercase leading-4 moh-text-muted">{{ tiersIntro.label }}</p>
        <h1 class="text-[28px] font-semibold leading-9">{{ tiersIntro.title }}</h1>
        <p class="moh-body moh-text-muted">{{ tiersIntro.description }}</p>
      </header>
      <div class="membership-grid grid gap-4">
        <article v-for="tier in tiers" :key="tier.id" class="flex min-w-0 flex-col gap-4 rounded-xl border moh-border moh-surface p-5" :aria-label="tier.name">
          <div class="space-y-2">
            <div class="flex flex-wrap items-center gap-2">
              <h2 class="text-xl font-semibold leading-7">{{ tier.name }}</h2>
              <span v-if="currentTier === tier.id" class="moh-meta moh-text-muted">Your tier</span>
            </div>
            <p class="moh-meta moh-text-muted">{{ tier.subtitle }}</p>
          </div>
          <p class="text-[28px] font-semibold leading-9">{{ tier.price.label || tier.price.amount }}<span v-if="tier.price.interval" class="ml-1 text-base font-normal moh-text-muted">{{ tier.price.interval }}</span></p>
          <p class="moh-body moh-text-muted">{{ tier.who }}</p>
          <ul class="moh-body space-y-4">
            <li v-for="highlight in tier.highlights" :key="highlight">{{ highlight }}</li>
          </ul>
          <NuxtLink :to="currentTier === tier.id ? '/settings/billing' : tierAction(tier).to" class="membership-link mt-auto">
            {{ currentTier === tier.id ? 'Manage membership' : tierAction(tier).label }}
          </NuxtLink>
        </article>
      </div>
      <p v-if="recruitBonusEligible && !isPremium" class="moh-body moh-text-muted">
        <template v-if="recruiterName">Your first month unlocks a free second month, thanks to @{{ recruiterName }}.</template>
        <template v-else>Your first month unlocks a free second month through your invite.</template>
        <NuxtLink to="/settings/billing" class="underline underline-offset-4">View reward details</NuxtLink>
      </p>
      <section aria-labelledby="membership-details">
        <h2 id="membership-details" class="mb-2 text-xl font-semibold leading-7">Compare the details</h2>
        <AppDisclosure v-for="tier in tiers" :id="`tier-${tier.id}`" :key="tier.id">
          <template #title>{{ tier.name }} <span class="font-normal moh-text-muted">· {{ availableBenefits(tier).length }} available benefits<template v-if="plannedBenefits(tier).length"> · {{ plannedBenefits(tier).length }} planned</template></span></template>
          <div class="grid gap-6 pb-6 sm:grid-cols-2">
            <div class="space-y-3">
              <h3 class="moh-body font-semibold">Available now</h3>
              <ul class="moh-body moh-text-muted list-disc space-y-3 pl-5"><li v-for="item in availableBenefits(tier)" :key="item.text">{{ item.text }}</li></ul>
            </div>
            <div class="space-y-6">
              <div v-if="plannedBenefits(tier).length" class="space-y-3">
                <h3 class="moh-body font-semibold">Planned</h3>
                <p class="moh-meta moh-text-muted">These benefits are not available yet.</p>
                <ul class="moh-body moh-text-muted list-disc space-y-3 pl-5"><li v-for="item in plannedBenefits(tier)" :key="item.text">{{ item.text }}</li></ul>
              </div>
              <div class="space-y-3">
                <h3 class="moh-body font-semibold">Limits</h3>
                <ul class="moh-body moh-text-muted list-disc space-y-3 pl-5"><li v-for="item in tier.cannot" :key="item.text">{{ item.text }}</li></ul>
              </div>
              <p v-for="reason in tier.why" :key="reason" class="moh-body moh-text-muted">{{ reason }}</p>
              <p v-if="tier.priceNote" class="moh-meta moh-text-muted">{{ tier.priceNote }}</p>
            </div>
          </div>
        </AppDisclosure>
      </section>
      <footer class="space-y-4">
        <p class="moh-meta moh-text-muted">{{ tiersFooterNote }}</p>
        <nav aria-label="More about Men of Hunger" class="moh-meta flex flex-wrap gap-x-5 gap-y-2">
          <NuxtLink v-for="link in [{ to: '/about', label: 'About' }, { to: '/roadmap', label: 'Roadmap' }, { to: '/status', label: 'Status' }]" :key="link.to" :to="link.to" class="hover:underline">{{ link.label }}</NuxtLink>
        </nav>
      </footer>
    </section>
  </AppPageContent>
</template>

<script setup lang="ts">
import { tiers, tiersFooterNote, tiersIntro, tiersMetaDescription, type Tier } from '~/config/tiers.data'
definePageMeta({
  layout: 'app',
  title: 'Tiers',
})

usePageSeo({
  title: 'Tiers',
  description:
    tiersMetaDescription,
  canonicalPath: '/tiers',
  ogType: 'website',
})

const { user, isAuthed } = useAuth()
const isVerified = computed(() => (user.value?.verifiedStatus ?? 'none') !== 'none')
const isPremiumPlus = computed(() => Boolean(user.value?.premiumPlus))
// Inclusive so CTAs behave correctly even if data is inconsistent.
const isPremium = computed(() => Boolean(user.value?.premium || user.value?.premiumPlus))
// Only one tier highlighted: the highest the user has. Null when not logged in.
const currentTier = computed(() =>
  user.value
    ? isPremiumPlus.value
      ? 'premiumPlus'
      : isPremium.value
        ? 'premium'
        : isVerified.value
          ? 'verified'
          : 'unverified'
    : null
)

function tierAction(tier: Tier): { label: string; to: string } {
  if (!isAuthed.value) return { label: tier.id === 'unverified' ? 'Create an account' : tier.cta?.label ?? 'Get started', to: '/login' }
  if (tier.id === 'unverified') return { label: 'Explore the community', to: '/home' }
  if (!isVerified.value) return { label: tier.id === 'verified' ? 'Get verified' : 'Verify to upgrade', to: '/settings/verification' }
  return { label: tier.id === 'verified' ? 'View verification' : tier.cta?.label ?? 'View membership', to: tier.id === 'verified' ? '/settings/verification' : '/settings/billing' }
}
const availableBenefits = (tier: Tier) => tier.can.filter(item => !item.comingSoon)
const plannedBenefits = (tier: Tier) => tier.can.filter(item => item.comingSoon)

// Recruit bonus — fetch billing data client-side only when the user is logged in and not
// already premium (that's the only scenario where showing the bonus is relevant).
import type { BillingMe } from '~/types/api'
const { apiFetchData } = useApiClient()
const recruitBonusEligible = ref(false)
const recruiterName = ref<string | null>(null)

onMounted(async () => {
  if (!isAuthed.value || isPremium.value) return
  try {
    const billing = await apiFetchData<BillingMe>('/billing/me', { method: 'GET' })
    recruitBonusEligible.value = Boolean(billing.recruitBonusEligible)
    recruiterName.value = billing.recruiter?.username ?? billing.recruiter?.name ?? null
  } catch { /* best-effort */ }
})
</script>

<style scoped>
.membership-page { container-type: inline-size; }
@container (min-width: 520px) { .membership-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@container (min-width: 960px) { .membership-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); } }
.membership-link { display: flex; min-height: 44px; align-items: center; justify-content: center; padding: 11px 16px; border-radius: 999px; background: var(--moh-button-secondary-fill); color: var(--moh-button-secondary-label); font-size: 14px; line-height: 22px; font-weight: 600; text-align: center; }
.membership-link:hover { box-shadow: 0 0 0 2px var(--moh-border); }
.membership-link:focus-visible { outline: 2px solid var(--moh-brass); outline-offset: 3px; }
</style>
