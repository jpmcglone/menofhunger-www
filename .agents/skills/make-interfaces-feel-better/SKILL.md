---
name: make-interfaces-feel-better
description: Polish existing interface typography, surfaces, transitions, hit areas, and interaction feedback without expanding product scope. Use for visual detail work after structure is sound.
---

# Interface polish

Use the [product and visual policy](../../../docs/engineering-policy.md#product-and-visual-decisions)
for hierarchy, tokens, and simplification decisions. Review only the relevant reference:

- [Typography](typography.md): semantic roles, wrapping, and stable numbers.
- [Surfaces](surfaces.md): separation, elevation, radii, and touch targets.
- [Animations](animations.md): Vue transitions and native SwiftUI feedback.
- [Performance](performance.md): explicit properties and bounded animation work.

Follow the installed framework and existing components. Use native SwiftUI controls on iOS;
Vue/CSS on web. Motion should communicate a change, stay interruptible, and respect reduced
motion. Avoid routine page-load choreography, animated feed layout on every realtime tick,
and unnecessary dependencies. Report concrete outcomes and verification concisely, using the
[scope policy](../../../docs/engineering-policy.md#scope-and-precedence).
