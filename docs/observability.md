# Observability & PII Policy

We use **Sentry** (errors, performance, session replay) and **PostHog** (product analytics). This doc describes what leaves the browser/server, what is stripped, and how to change the policy safely.

## TL;DR

- `sendDefaultPii: true` is **intentionally on** in both `sentry.client.config.ts` and `sentry.server.config.ts`.
- That exposes: user IP, request URL, some headers, and the user object we set via `Sentry.setUser({ id })`.
- Before any event leaves the app it passes through `utils/sentry-scrub.ts`, which:
 - Redacts sensitive HTTP headers (`Authorization`, `Cookie`, `Set-Cookie`, `X-Api-Key`, CSRF / session / refresh / access tokens).
 - Redacts `request.cookies` entirely.
 - Deep-redacts any field whose key looks like a credential (`password`, `token`, `secret`, `apiKey`, `cvv`, `ssn`, etc.).
 - Strips credentials from URL query strings in both `request.url` and breadcrumb `url`/`to`/`from`.
 - Scrubs breadcrumb headers and request/response bodies.
 - Keeps `user.id`, `user.ip_address`, `user.segment`. Everything else on `user` is either left as-is (if harmless) or redacted (if it matches a sensitive key).
- Session replay: `maskAllText: false` and `blockAllMedia: false`. We rely on field-level masking via CSS classes where needed (e.g. `sentry-mask` on sensitive inputs). If you add a screen that renders raw PII (DOB, SSN, payment details), ADD class-level masking.

## What we intentionally send

| Field | Sent | Why |
|---|---|---|
| User ID | Yes | Correlate errors across sessions; de-duplicate. |
| User IP | Yes (via `sendDefaultPii`) | Geo context for network issues; spam triage. |
| Request URL (path) | Yes | Debug which route failed. |
| Request query string | Yes, scrubbed | Non-sensitive query params remain; credentials are redacted. |
| Request headers (non-auth) | Yes | Useful for debugging (`User-Agent`, `Accept`, etc.). |
| Session replay | Yes, sampled | 10% of normal sessions, 100% of sessions with errors. |
| User email / phone | No | We never set these on `Sentry.setUser`, and the scrubber redacts any field named like them. |

## What we explicitly strip

- `Authorization`, `Cookie`, `Set-Cookie`, `X-Api-Key`, `X-Auth-Token`, `X-Access-Token`, `X-Refresh-Token`, `Proxy-Authorization`, `X-CSRF-Token`, `X-XSRF-Token`, `X-Session-Id`
- Body/query keys (normalized — underscores/dashes and case ignored): `password`, `passwd`, `pwd`, `newPassword`, `oldPassword`, `currentPassword`, `token`, `accessToken`, `refreshToken`, `idToken`, `sessionToken`, `authorization`, `cookie`, `apiKey`, `apiSecret`, `clientSecret`, `secret`, `stripeSecret`, `otp`, `pin`, `ssn`, `creditCard`, `cardNumber`, `cvv`, `cvc`
- `request.cookies` — redacted wholesale.

## How to add a sensitive field

1. Edit `SENSITIVE_HEADER_KEYS` or `SENSITIVE_FIELD_KEYS` in `utils/sentry-scrub.ts`.
2. Do **not** disable `sendDefaultPii` globally — that removes useful context.
3. If a whole screen/component needs masking in session replay, add CSS class `sentry-mask` to the sensitive nodes (Sentry Replay masks these by default).

## Where PII is set on the user object

We call `Sentry.setUser({ id })` at login/bootstrap. We deliberately do NOT pass `email` or `username`. If you add a field there, update this doc and the scrubber.

## PostHog

PostHog is a separate pipeline from Sentry. Policy:

- `identify(userId)` — yes.
- Email / phone — no.
- Event properties — scrub before capture in `composables/usePostHog.ts`.

## Compliance notes

- EU users: Sentry processes data in the EU region when `NUXT_PUBLIC_SENTRY_DSN` points at the EU ingest. Verify the DSN before a region-sensitive launch.
- Data retention: Sentry errors default to 90 days, replays to 30 days. Adjust in the Sentry org settings; document any change here.
- Right-to-erasure: when a user requests deletion, also submit a Sentry user-deletion request via the Sentry UI (search by `user.id`).

## Testing the scrubber

Unit tests for `scrubSentryEvent` belong in `tests/sentry-scrub.test.ts`. Add cases before expanding the sensitive-key lists.
