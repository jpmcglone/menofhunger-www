<template>
  <AppPageContent top="standard" bottom="standard">
    <section class="mx-auto w-full max-w-prose px-4 space-y-8 pb-16">
      <header class="space-y-2">
        <h1 class="text-2xl sm:text-3xl font-semibold tracking-tight text-gray-900 dark:text-gray-50">
          Privacy Policy
        </h1>
        <p class="text-sm text-gray-500 dark:text-gray-400">Last updated: September 16, 2026</p>
      </header>

      <Divider />

      <div class="space-y-8 text-gray-700 dark:text-gray-300 leading-relaxed">

        <section class="space-y-3">
          <h2 class="text-base font-semibold text-gray-900 dark:text-gray-50">What we collect</h2>
          <ul class="list-disc pl-5 space-y-1">
            <li><strong>Phone number</strong> — used to send your one-time login code and identify your account.</li>
            <li><strong>Profile information</strong> — your name, username, photo, and anything else you add to your profile.</li>
            <li><strong>Content you post</strong> — posts, replies, messages, and other activity in the app.</li>
            <li><strong>Payment records</strong> — purchases are processed by Apple (in the iOS app) or Stripe (on the web). We receive a transaction record but never see your card number or full payment details.</li>
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
          <h2 class="text-base font-semibold text-gray-900 dark:text-gray-50">Fitness and Apple Health</h2>
          <p>With your permission, the iOS app reads the workout, activity, sleep, and body measurements you select in Apple Health using HealthKit. It syncs them to your account so you can see your personal fitness dashboard on iOS and the web. Verification is required to use Fitness; Premium is not required.</p>
          <p>Your fitness data is private to you by default. You can choose to share an activity and its audience. We do not use HealthKit data for advertising, marketing, or data mining, sell it, or send your private fitness records to OpenAI. We do not write data to Apple Health.</p>
          <p>You can change Health permissions in Apple's Health app or device Settings. Disconnecting stops syncing; it does not automatically erase data already synced. Deleting your Men of Hunger account removes its stored fitness data and provider connections.</p>
        </section>

        <section class="space-y-3">
          <h2 class="text-base font-semibold text-gray-900 dark:text-gray-50">MARV and OpenAI</h2>
          <p>MARV uses OpenAI. Before using it, we ask your permission to send your requests, selected images, and relevant profile and conversation content to OpenAI to generate replies, summaries, and member context. Sending personal MARV requests is off until you allow it. MARV may use public profiles and public content. Restricted threads and group content may be used within their permitted conversation context, without exposing them in unrelated conversations.</p>
          <p>You can turn off personal MARV requests in Settings → MARV. This does not make content you have already shared with an audience private, or prevent MARV from using public content or permitted conversation context. Turning it off keeps the rest of the service available. We store AI conversation history and generated context to provide the feature. OpenAI may retain API data to operate its service and prevent abuse; revoking permission does not recall information already sent. See <a href="https://platform.openai.com/docs/guides/your-data" target="_blank" rel="noopener" class="underline">OpenAI's API data controls</a>.</p>
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
            our SMS provider (to deliver login codes), Apple and Stripe (payments), OpenAI (AI features, with your permission), our hosting and
            infrastructure providers, PostHog, and Sentry. We do not sell your personal data.
            We do not share it for advertising purposes.
          </p>
        </section>

        <section class="space-y-3">
          <h2 class="text-base font-semibold text-gray-900 dark:text-gray-50">Your choices</h2>
          <ul class="list-disc pl-5 space-y-1">
            <li>Edit or remove your profile information at any time in Settings.</li>
            <li>Control push notification preferences in Settings.</li>
            <li>Delete your account in Settings → Delete Account. Your account is hidden immediately and permanent deletion is scheduled for 30 days later. Signing in before the deadline cancels deletion. We remove your profile, personal content, messages, stored fitness data, and provider connections; empty deleted-content placeholders may remain to preserve other members' replies. Your private receipt shows progress and completion and expires 90 days after the scheduled date. We also send confirmation if you have a verified email address. Backups follow the hosting provider's retention cycle and are not used to restore a deleted account to the service.</li>
            <li>Apple subscriptions continue until you cancel them in <a href="https://apps.apple.com/account/subscriptions" class="underline">Apple subscription settings</a>. Account deletion does not cancel Apple billing. We cancel web subscriptions when permanent deletion begins; you can cancel sooner in Billing.</li>
            <li>Request a copy of your data or deletion assistance through our <NuxtLink to="/feedback" class="underline">public feedback form</NuxtLink> or email below. You do not need to sign in.</li>
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
            Contact <a href="mailto:hello@menofhunger.com" class="underline">hello@menofhunger.com</a> or use our <NuxtLink to="/feedback" class="underline">public feedback form</NuxtLink> for privacy requests, objectionable content, or account help.
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
