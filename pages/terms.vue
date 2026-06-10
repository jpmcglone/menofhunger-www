<template>
  <AppPageContent top="standard" bottom="standard">
    <section class="mx-auto w-full max-w-prose px-4 space-y-8 pb-16">
      <header class="space-y-2">
        <h1 class="text-2xl sm:text-3xl font-semibold tracking-tight text-gray-900 dark:text-gray-50">
          Terms of Service
        </h1>
        <p class="text-sm text-gray-500 dark:text-gray-400">Last updated: June 10, 2026</p>
      </header>

      <Divider />

      <div class="space-y-8 text-gray-700 dark:text-gray-300 leading-relaxed">

        <section class="space-y-3">
          <h2 class="text-base font-semibold text-gray-900 dark:text-gray-50">Who we are</h2>
          <p>
            Men of Hunger is a community platform for men who want measurable growth — structured
            conversations, accountability, and real progress. By using our app or website you agree
            to these terms.
          </p>
        </section>

        <section class="space-y-3">
          <h2 class="text-base font-semibold text-gray-900 dark:text-gray-50">Eligibility</h2>
          <ul class="list-disc pl-5 space-y-1">
            <li>You must be 18 or older to create an account.</li>
            <li>You may only have one account.</li>
            <li>The information you provide must be accurate.</li>
            <li>You are responsible for all activity that occurs under your account.</li>
          </ul>
        </section>

        <section class="space-y-3">
          <h2 class="text-base font-semibold text-gray-900 dark:text-gray-50">Acceptable use</h2>
          <p>You agree not to:</p>
          <ul class="list-disc pl-5 space-y-1">
            <li>Harass, threaten, or abuse other members.</li>
            <li>Post or share illegal content.</li>
            <li>Impersonate anyone or run scams.</li>
            <li>Spam the feed, groups, or direct messages.</li>
            <li>Attempt to gain unauthorized access to our systems.</li>
          </ul>
          <p>
            Violations may result in content removal, suspension, or a permanent ban at our
            discretion.
          </p>
        </section>

        <section class="space-y-3">
          <h2 class="text-base font-semibold text-gray-900 dark:text-gray-50">Your content</h2>
          <p>
            You own what you post. By posting content you grant Men of Hunger a non-exclusive,
            worldwide license to host, display, and distribute it as part of operating the service.
            We do not claim ownership of your content. You can delete your content or your account
            at any time.
          </p>
        </section>

        <section class="space-y-3">
          <h2 class="text-base font-semibold text-gray-900 dark:text-gray-50">Purchases</h2>
          <p>
            Payments for coins, memberships, and other features are processed by Stripe. All
            purchases are generally non-refundable except where required by applicable law. Prices
            and availability may change with notice.
          </p>
        </section>

        <section class="space-y-3">
          <h2 class="text-base font-semibold text-gray-900 dark:text-gray-50">Termination</h2>
          <p>
            You can delete your account at any time from Settings. We may suspend or permanently
            ban accounts that violate these terms, without prior notice when necessary to protect the
            community.
          </p>
        </section>

        <section class="space-y-3">
          <h2 class="text-base font-semibold text-gray-900 dark:text-gray-50">Disclaimers and liability</h2>
          <p>
            The service is provided "as is" without warranties of any kind. We are not liable for
            user-generated content or for any indirect, incidental, or consequential damages arising
            from your use of Men of Hunger. Our total liability for any claim is limited to the
            amount you paid us in the past twelve months.
          </p>
        </section>

        <section class="space-y-3">
          <h2 class="text-base font-semibold text-gray-900 dark:text-gray-50">Changes to these terms</h2>
          <p>
            We may update these terms from time to time. We'll note the date at the top of this
            page. Continued use of the service after changes are posted means you accept the
            updated terms.
          </p>
        </section>

        <section class="space-y-3">
          <h2 class="text-base font-semibold text-gray-900 dark:text-gray-50">Contact</h2>
          <p>
            Questions? Use the <strong>Send feedback</strong> link in Settings.
          </p>
        </section>

      </div>
    </section>
  </AppPageContent>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'default',
  title: 'Terms'
})

usePageSeo({
  title: 'Terms of Service',
  description: 'Terms of Service for Men of Hunger.',
  canonicalPath: '/terms',
  ogType: 'website',
  image: '/images/banner.png',
})
</script>
