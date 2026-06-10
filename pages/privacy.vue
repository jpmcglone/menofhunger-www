<template>
  <AppPageContent top="standard" bottom="standard">
    <section class="mx-auto w-full max-w-prose px-4 space-y-8 pb-16">
      <header class="space-y-2">
        <h1 class="text-2xl sm:text-3xl font-semibold tracking-tight text-gray-900 dark:text-gray-50">
          Privacy Policy
        </h1>
        <p class="text-sm text-gray-500 dark:text-gray-400">Last updated: June 10, 2026</p>
      </header>

      <Divider />

      <div class="space-y-8 text-gray-700 dark:text-gray-300 leading-relaxed">

        <section class="space-y-3">
          <h2 class="text-base font-semibold text-gray-900 dark:text-gray-50">What we collect</h2>
          <ul class="list-disc pl-5 space-y-1">
            <li><strong>Phone number</strong> — used to send your one-time login code and identify your account.</li>
            <li><strong>Profile information</strong> — your name, username, photo, and anything else you add to your profile.</li>
            <li><strong>Content you post</strong> — posts, replies, messages, and other activity in the app.</li>
            <li><strong>Payment records</strong> — purchases are processed by Stripe. We receive a transaction record but never see your card number or full payment details.</li>
            <li><strong>Usage data</strong> — pages visited, features used, and error events to help us improve the product.</li>
          </ul>
        </section>

        <section class="space-y-3">
          <h2 class="text-base font-semibold text-gray-900 dark:text-gray-50">How we use it</h2>
          <ul class="list-disc pl-5 space-y-1">
            <li>Operate and deliver the service.</li>
            <li>Send one-time login codes via SMS.</li>
            <li>Send push notifications (only if you opt in).</li>
            <li>Understand how people use the app so we can make it better.</li>
            <li>Investigate and address violations of our Terms of Service.</li>
          </ul>
        </section>

        <section class="space-y-3">
          <h2 class="text-base font-semibold text-gray-900 dark:text-gray-50">Analytics and error reporting</h2>
          <p>
            We use <strong>PostHog</strong> for product analytics (which features are used, conversion
            funnels) and <strong>Sentry</strong> for error reporting (crashes and exceptions). Both
            receive anonymized or pseudonymized data. Neither is used for advertising.
          </p>
        </section>

        <section class="space-y-3">
          <h2 class="text-base font-semibold text-gray-900 dark:text-gray-50">Cookies</h2>
          <p>
            We use a single HTTP-only session cookie to keep you logged in. We do not use third-party
            advertising cookies or tracking pixels.
          </p>
        </section>

        <section class="space-y-3">
          <h2 class="text-base font-semibold text-gray-900 dark:text-gray-50">Sharing your information</h2>
          <p>
            We share your information only with service providers necessary to run the platform:
            our SMS provider (to deliver login codes), Stripe (payments), our hosting and
            infrastructure providers, PostHog, and Sentry. We do not sell your personal data.
            We do not share it for advertising purposes.
          </p>
        </section>

        <section class="space-y-3">
          <h2 class="text-base font-semibold text-gray-900 dark:text-gray-50">Your choices</h2>
          <ul class="list-disc pl-5 space-y-1">
            <li>Edit or remove your profile information at any time in Settings.</li>
            <li>Control push notification preferences in Settings.</li>
            <li>Delete your account in Settings. Deletion removes your profile and content from
            public view; some data may be retained in backups for a short period.</li>
            <li>Request a copy of your data or ask us to delete it by using the <strong>Send feedback</strong> link in Settings.</li>
          </ul>
        </section>

        <section class="space-y-3">
          <h2 class="text-base font-semibold text-gray-900 dark:text-gray-50">Retention and security</h2>
          <p>
            We keep your data for as long as your account is active. We use standard security
            practices — encrypted connections, access controls, and regular reviews — to protect
            your information. No method of transmission or storage is perfectly secure, but we take
            reasonable precautions.
          </p>
        </section>

        <section class="space-y-3">
          <h2 class="text-base font-semibold text-gray-900 dark:text-gray-50">Changes to this policy</h2>
          <p>
            We may update this policy from time to time. We'll note the date at the top of this
            page. Continued use of the service after changes are posted means you accept the
            updated policy.
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
  title: 'Privacy'
})

usePageSeo({
  title: 'Privacy Policy',
  description: 'Privacy Policy for Men of Hunger.',
  canonicalPath: '/privacy',
  ogType: 'website',
  image: '/images/banner.png',
})
</script>
