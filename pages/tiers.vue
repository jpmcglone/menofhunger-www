<template>
  <AppPageContent top="standard" bottom="standard">
    <!-- Figma: YnuRSJB7p90n9jEY4mb4RN / 647:7 (desktop), 650:20384 (mobile) -->
    <section class="membership-page mx-auto w-full max-w-[1100px] space-y-8 px-5 sm:px-6">
      <header class="space-y-3">
        <p class="text-xs font-semibold uppercase leading-4 moh-text-muted">{{ tiersIntro.label }}</p>
        <h1 class="text-[28px] font-semibold leading-9">{{ tiersIntro.title }}</h1>
        <p class="moh-body moh-text-muted">{{ tiersIntro.description }}</p>
      </header>
      <section aria-label="Your membership" class="space-y-3 rounded-xl moh-surface p-5" :aria-busy="loading || activationChecking" :data-state="membershipState">
        <p class="moh-meta uppercase">Your membership</p>
        <h2 class="text-xl font-semibold leading-7" :style="{ color: membershipState === 'ready' ? membershipAccent(currentTier) : 'var(--moh-verified)' }">{{ membershipHeading }}</h2>
        <p class="moh-body moh-text-muted" :role="membershipState === 'ready' ? undefined : 'alert'">{{ membershipDescription }}</p>
        <Button v-if="membershipState === 'unavailable'" label="Retry" class="w-full" :loading="loading" @click="refresh" />
        <Button v-else-if="membershipState === 'activation-pending'" label="Check again" class="w-full" :loading="activationChecking" @click="checkAgain" />
        <AppMembershipAction v-else :action="summaryAction" :disabled="!billing || loading || Boolean(checkoutLoading)" :busy="Boolean(checkoutLoading)" @checkout="startCheckout" />
        <p v-if="loading && membershipState === 'ready'" class="moh-meta moh-text-muted" role="status">Checking membership…</p>
        <p v-if="activationError" class="moh-meta text-red-600" role="alert">{{ activationError }}</p>
        <AppInlineAlert v-if="checkoutError" severity="danger">{{ checkoutError }}</AppInlineAlert>
      </section>
      <div class="membership-grid grid gap-4">
        <article v-for="tier in tiers" :key="tier.id" class="membership-card flex min-w-0 flex-col gap-4 rounded-xl border moh-border moh-surface p-5" :class="{ 'membership-current': currentTier === tier.id }" :style="{ '--membership-accent': membershipAccent(tier.id) }" :aria-label="`${tier.name}${currentTier === tier.id ? ' — your current tier' : ''}`">
          <div class="membership-accent" aria-hidden="true" />
          <div class="space-y-2">
            <div class="flex flex-wrap items-center gap-2">
              <h2 class="text-xl font-semibold leading-7" :style="{ color: membershipAccent(tier.id) }">{{ tier.name }}</h2>
              <span v-if="currentTier === tier.id" class="moh-meta font-semibold">Your current tier</span>
            </div>
            <p class="moh-meta moh-text-muted">{{ tier.subtitle }}</p>
          </div>
          <p class="text-[28px] font-semibold leading-9">{{ tier.price.label || tier.price.amount }}<span v-if="tier.price.interval" class="ml-1 text-base font-normal moh-text-muted">{{ tier.price.interval }}</span></p>
          <p class="moh-body moh-text-muted">{{ tier.who }}</p>
          <ul class="moh-body space-y-4">
            <li v-for="highlight in tier.highlights" :key="highlight">{{ highlight }}</li>
          </ul>
          <AppMembershipAction class="mt-auto" :action="membershipAction(tier.id, currentTier, billing)" :disabled="!billing || loading || Boolean(checkoutLoading) || membershipState !== 'ready'" :busy="checkoutLoading === tier.id" @checkout="startCheckout" />
        </article>
      </div>
      <p v-if="recruitBonusEligible && !isPremium" class="moh-body moh-text-muted">
        <template v-if="recruiterName">Verify your account and you both get a free month of Premium, thanks to @{{ recruiterName }}.</template>
        <template v-else>Verify your account and you both get a free month of Premium through your invite.</template>
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
import { includesMembership, membershipAccent, membershipAction, membershipStateFor } from '~/utils/membership'
import { tiers, tiersFooterNote, tiersIntro, tiersMetaDescription, type Tier, type TierId } from '~/config/tiers.data'
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

const { user, billing, loading, error: membershipError, currentTier, refresh } = useMembership()
const { checkoutLoading, checkoutError, startCheckout } = useMembershipCheckout()
const route = useRoute()
const currentTierName = computed(() => tiers.find(t => t.id === currentTier.value)?.name ?? 'Sign in to see your membership')
const isPremium = computed(() => currentTier.value === 'premium' || currentTier.value === 'premiumPlus')
const nextTier = computed<TierId>(() => {
  const requested = route.query.plan
  if ((requested === 'premium' || requested === 'premiumPlus') && requested !== currentTier.value && !includesMembership(currentTier.value, requested)) return requested
  if (currentTier.value === 'unverified') return 'verified'
  return currentTier.value === 'premium' || currentTier.value === 'premiumPlus' ? 'premiumPlus' : 'premium'
})
const summaryAction = computed(() => membershipAction(nextTier.value, currentTier.value, billing.value))
const activation = useActivationPending()
const activationChecking = activation.checking
const activationError = activation.error
const membershipState = computed(() => membershipStateFor({ error: membershipError.value, activationPending: Boolean(activation.pending.value) }))
const membershipHeading = computed(() => membershipState.value === 'unavailable' ? 'Membership unavailable' : membershipState.value === 'activation-pending' ? 'Activation pending' : currentTierName.value)
watch(() => billing.value?.premium || billing.value?.premiumPlus, active => { if (active) activation.clear() })
async function checkAgain() {
  const latest = await activation.check()
  if (latest) await refresh()
}
const membershipDescription = computed(() => {
  if (membershipState.value === 'unavailable') return membershipError.value
  if (membershipState.value === 'activation-pending') return 'Your payment went through, but activation has not finished yet. Check again in a moment; do not pay again.'
  if (!user.value) return 'Compare the tiers below, then sign in to choose your next step.'
  if (billing.value?.source === 'apple') return 'Your subscription is managed by Apple.'
  if (billing.value?.source === 'grant') return 'Your membership includes granted access. View Billing for its details.'
  if (currentTier.value === 'unverified') return 'Verification is free and unlocks participation. Get verified before choosing a paid tier.'
  if (currentTier.value === 'verified') return 'You’re on the free Verified tier.'
  if (currentTier.value === 'premiumPlus') return 'You’re a Steward. Your membership includes everything in Premium.'
  return 'Your current membership. Upgrade for Steward benefits.'
})
const availableBenefits = (tier: Tier) => tier.can.filter(item => !item.comingSoon)
const plannedBenefits = (tier: Tier) => tier.can.filter(item => item.comingSoon)

const recruitBonusEligible = computed(() => Boolean(billing.value?.recruitBonusEligible))
const recruiterName = computed(() => billing.value?.recruiter?.username ?? billing.value?.recruiter?.name ?? null)
</script>

<style scoped>
.membership-page { container-type: inline-size; }
@container (min-width: 520px) { .membership-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@container (min-width: 960px) { .membership-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); } }
.membership-card { border-top-color: var(--membership-accent); }
.membership-accent { height: 4px; background: var(--membership-accent); }
.membership-current { border-color: var(--membership-accent); box-shadow: inset 0 0 0 1px var(--membership-accent); background: color-mix(in srgb, var(--membership-accent) 8%, var(--moh-surface)); }
</style>
