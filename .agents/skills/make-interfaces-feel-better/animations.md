# Animations

Use existing motion tokens. On web, prefer Vue transitions and explicit CSS properties. Use
opacity and transforms where useful; avoid broad `transition: all`, blur-heavy effects, and
layout animation across large/virtualized feeds. Add `will-change` only after profiling shows a
benefit, and remove it when no longer needed. Do not install an animation library for basic UI.

Vue does not animate initial content unless `appear` is requested:

```vue
<template>
  <Transition name="panel">
    <section v-if="open" aria-label="Details">...</section>
  </Transition>
</template>

<style scoped>
.panel-enter-active,
.panel-leave-active { transition: opacity 160ms ease, transform 160ms ease; }
.panel-enter-from,
.panel-leave-to { opacity: 0; transform: translateY(4px); }
@media (prefers-reduced-motion: reduce) {
  .panel-enter-active, .panel-leave-active { transition: none; }
}
</style>
```

Keep `open` deterministic for the server and initial client render. A keyed `TransitionGroup`
is appropriate for a small reordered list with stable unique IDs. Do not duplicate the SSR list
just to enable transitions; see [SSR guidance](https://vuejs.org/guide/scaling-up/ssr.html).

On iOS, prefer existing SwiftUI animations scoped to the changed value. Read
`accessibilityReduceMotion` and omit movement when enabled. Never use motion or color as the
only indication of state. Preserve focus, tap targets, and scroll position through transitions.
