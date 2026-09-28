# Surfaces

Follow the [product and visual policy](../../../docs/engineering-policy.md#product-and-visual-decisions).
Use the existing divider for adjacent rows and elevation for floating controls. Inspect both
light and dark themes. Match nested radii to their padding when rounding is appropriate; do not
wrap an entire route in a new card. Keep image outlines subtle using existing tokens.

Prefer existing accessible button/link components. Keep at least 44pt targets on iOS and use the
web design system’s target sizing (aim for 44px for touch). Small visible icons can sit in larger
targets, but targets must not overlap. Preserve keyboard focus, semantic links, and disabled states.

## Overlay stacking and nested controls

Before changing a menu, dropdown, sheet, dialog, tooltip, or popover, inspect its actual
portal destination, parent surface, backdrop, clipping, and stacking contexts. A child
teleported to `body` does not inherit its parent's z-index. A large local z-index cannot
escape an ancestor stacking context; transforms, opacity, filters, and isolation can create one.

On web, reuse `utils/overlay-layers.ts` for the account menu, bottom sheet, and their nested
menus. Give PrimeVue popup controls the appropriate `baseZIndex` and explicit portal target;
its default auto-z-index does not know about custom overlays. Keep the child above both
parent and backdrop. Avoid arbitrary larger numbers or global `!important` overrides.
Do not use `appendTo="self"` to hide the problem when an ancestor can clip the popup.

Verify the real nested popup opened from every supported parent, including the desktop
account menu and mobile More sheet. Check that options are visible, clickable, unclipped,
and keyboard-accessible; selection, Escape, outside-click dismissal, and focus return must
still work. Inspect actual computed stacking order and hit-testing in a browser. A screenshot
of the closed trigger or a unit test that stubs the popup cannot prove correct layering.
Use a real-popup regression test when fixing a stacking defect. On iOS, keep sheets/popovers
under SwiftUI presentation ownership rather than treating `.zIndex` as a presentation fix.
