## SSR / Hydration checklist (required when touching UI)

- [ ] No third-party DOM-mutating integrations are SSR-rendered (ads, script-driven widgets, etc.)
- [ ] Any third-party scripts that can mutate DOM run **after mount** (or behind a client-only boundary)
- [ ] No module-scope mutable cache is used as a first-render input (use `useState()` / request-scoped state instead)
- [ ] First-render strings/labels are deterministic with cold cache and warm cache
- [ ] Teleports/popovers only activate client positioning post-mount (SSR renders inert/stable placeholders)

## Summary

- 

## Test plan

- 

