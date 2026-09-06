---
name: ssr-hydration
description: Write SSR-safe Nuxt and Vue components, choose route rendering, and diagnose hydration mismatches caused by browser state, auth, markup, or lifecycle timing.
---

# SSR and hydration

This is the authoritative rendering policy. Follow the installed Nuxt/Vue versions and
[Vue SSR guidance](https://vuejs.org/guide/scaling-up/ssr.html#hydration-mismatch) and
[Nuxt rendering modes](https://learn.nuxt.com/en/concepts/rendering-modes).

## Initial render is the invariant

The server HTML and the first client render must agree, including attributes and valid HTML
nesting. State changing after hydration is normal. A ref initialized to false on both sides and
set true in `onMounted` is safe with `v-if`:

```vue
<script setup lang="ts">
const mounted = ref(false)
onMounted(() => { mounted.value = true })
</script>

<template>
  <ClientWidget v-if="mounted" />
</template>
```

Choose `v-if` for conditional mounting, especially expensive or rarely used content. Choose
`v-show` for frequently toggled content whose DOM/state should remain alive. `v-show` still
renders children on the server: it cannot make browser-only code or differing text/attributes
safe. Use Nuxt `ClientOnly` or a client component for dependencies that cannot render on a server;
provide a dimensionally stable fallback when layout requires it.

Use CSS breakpoints for presentation. For behavior that needs a media query, use
`useHydratedMediaQuery` with a stable initial value; don't create two expensive hidden widgets.
Read browser globals in client lifecycle hooks or guarded client-only functions. Initialize
rendered state deterministically, not from localStorage, viewport size, random values, or local
time during setup. Use `useId` for instance IDs and payload-backed state for shared server data.
SSR auth can read request cookies; never share user state across server requests. Client-only
session state needs a stable hydration boundary, not a blanket ban on auth-aware SSR.

`TransitionGroup` supports SSR. Use stable unique keys and valid, consistent wrapper markup.
Do not add duplicate static lists or mounted swaps without a reproduced version-specific bug.
Avoid `appear` for routine initial content and respect reduced motion.

## Route rendering

`nuxt.config.ts` routeRules owns route rendering. `definePageMeta({ ssr: false })` is not a
rendering switch; do not put rendering flags in page metadata. Keep public/shareable pages SSR
for useful HTML and link previews. Choose CSR for browser-dependent private tools when server
rendering offers no useful content. Auth alone does not require CSR; preserve request isolation,
visibility checks, and private/no-store caching. Do not disable SSR merely to hide a mismatch.

## Investigate and verify

1. Reproduce a hard navigation; record the warning and component trace.
2. Compare server output with client state before mounted hooks. Check invalid nesting,
   unstable IDs/times, request-isolated state, third-party DOM mutations, and mismatched data.
3. Fix that cause with the smallest boundary. Preserve loading/empty/error behavior and layout.
4. Test actual server rendering plus hydration for a regression where practical; source-pattern
   tests are only appropriate for an invariant that really is structural.
5. Use the [validation matrix](../../../docs/engineering-policy.md#validation-matrix).
   Record authenticated and anonymous coverage separately; anonymous route checks cannot prove
   an authenticated screen renders correctly.
