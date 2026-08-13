<template>
  <AppPageContent bottom="standard">
    <div class="moh-gutter-x border-b moh-border pt-4 pb-4">
      <div class="flex items-start gap-2">
        <NuxtLink
          to="/invite"
          class="moh-tap flex h-9 w-9 shrink-0 items-center justify-center rounded-full moh-surface-hover"
          aria-label="Back to Invite"
        >
          <Icon name="tabler:chevron-left" class="text-lg" aria-hidden="true" />
        </NuxtLink>
        <div class="min-w-0">
          <h1 class="moh-h1" style="text-wrap: balance">How Referral Pilot payouts work</h1>
          <p class="mt-1 text-sm moh-text-muted max-w-xl" style="text-wrap: pretty">
            Cash for bringing serious men into Men of Hunger. Invitation-only pilot for Premium members (gifted Premium counts) — separate from the free-month invite reward.
          </p>
        </div>
      </div>
    </div>

    <!-- Ladder -->
    <section class="border-b moh-border">
      <div class="moh-gutter-x pt-5 pb-5 space-y-4">
        <div>
          <h2 class="text-sm font-semibold moh-text">What you earn per recruit</h2>
          <p class="mt-1 text-xs moh-text-muted" style="text-wrap: pretty">
            Each milestone stacks. One man who goes the distance pays {{ formatAffiliateCents(AFFILIATE_PILOT.maxPerRecruitCents) }}.
          </p>
        </div>

        <ol class="space-y-0 moh-divide border-y moh-border">
          <li
            v-for="(step, index) in AFFILIATE_PILOT.milestones"
            :key="step.key"
            class="flex items-start justify-between gap-4 py-3"
          >
            <div class="min-w-0 flex gap-3">
              <span class="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-bold tabular-nums text-gray-700 dark:bg-zinc-800 dark:text-gray-200">
                {{ index + 1 }}
              </span>
              <div class="min-w-0">
                <div class="text-sm font-medium moh-text">{{ step.label }}</div>
                <div class="text-xs moh-text-muted mt-0.5" style="text-wrap: pretty">{{ step.detail }}</div>
              </div>
            </div>
            <div class="shrink-0 text-right">
              <div class="text-sm font-bold moh-text tabular-nums">
                {{ index === 0 ? '' : '+' }}{{ formatAffiliateCents(step.amountCents) }}
              </div>
              <div class="text-[10px] moh-text-muted tabular-nums mt-0.5">
                {{ formatAffiliateCents(cumulativeAfter(index)) }} total
              </div>
            </div>
          </li>
        </ol>
      </div>
    </section>

    <!-- Getting paid -->
    <section class="border-b moh-border">
      <div class="moh-gutter-x pt-5 pb-5 space-y-3">
        <h2 class="text-sm font-semibold moh-text">Getting paid</h2>
        <ul class="space-y-2.5 text-sm moh-text-muted">
          <li class="flex gap-2">
            <Icon name="tabler:calendar-month" class="mt-0.5 shrink-0 text-base" aria-hidden="true" />
            <span style="text-wrap: pretty">Payouts are reviewed and paid <span class="font-medium moh-text">monthly</span>.</span>
          </li>
          <li class="flex gap-2">
            <Icon name="tabler:cash" class="mt-0.5 shrink-0 text-base" aria-hidden="true" />
            <span style="text-wrap: pretty">
              Minimum cash-out: <span class="font-medium moh-text">{{ formatAffiliateCents(AFFILIATE_PILOT.minPayoutCents) }}</span> pending.
            </span>
          </li>
          <li class="flex gap-2">
            <Icon name="tabler:trophy" class="mt-0.5 shrink-0 text-base" aria-hidden="true" />
            <span style="text-wrap: pretty">
              Lifetime cap per pilot member: <span class="font-medium moh-text">{{ formatAffiliateCents(AFFILIATE_PILOT.capCents) }}</span>.
              New earnings stop once you hit it.
            </span>
          </li>
        </ul>
      </div>
    </section>

    <!-- Rules -->
    <section class="border-b moh-border">
      <div class="moh-gutter-x pt-5 pb-5 space-y-3">
        <h2 class="text-sm font-semibold moh-text">The rules (keep it clean)</h2>
        <ul class="space-y-2.5 text-sm moh-text-muted list-disc pl-5">
          <li style="text-wrap: pretty"><span class="font-medium moh-text">You must be Premium</span> — paid or gifted. Non-Premium members can't join the pilot, and earnings pause if Premium lapses.</li>
          <li style="text-wrap: pretty"><span class="font-medium moh-text">Single-level only</span> — you earn on men you personally invite, not their invites.</li>
          <li style="text-wrap: pretty">Only recruits who join <span class="font-medium moh-text">after</span> you're enabled in the pilot count for cash.</li>
          <li style="text-wrap: pretty">No self-referrals, fake accounts, or spam.</li>
          <li style="text-wrap: pretty">If you promote publicly, disclose that you may be paid.</li>
        </ul>
      </div>
    </section>

    <!-- Not the free month -->
    <section>
      <div class="moh-gutter-x pt-5 pb-6 space-y-3">
        <h2 class="text-sm font-semibold moh-text">Not the free-month invite?</h2>
        <p class="text-sm moh-text-muted" style="text-wrap: pretty">
          Every verified member can invite men for free Premium months. The Referral Pilot is a separate, invite-only cash program on top of that.
        </p>
        <Button as="NuxtLink" to="/invite" label="Back to Invite" rounded severity="secondary" />
      </div>
    </section>
  </AppPageContent>
</template>

<script setup lang="ts">
import { AFFILIATE_PILOT, formatAffiliateCents } from '~/utils/affiliate-pilot'

definePageMeta({ layout: 'app', ssr: false })

useHead({ title: 'Referral Pilot payouts' })

function cumulativeAfter(index: number): number {
  return AFFILIATE_PILOT.milestones.slice(0, index + 1).reduce((sum, m) => sum + m.amountCents, 0)
}
</script>
