# Z-Index Audit

Single source of truth for stacking order. All values are for `position: fixed` (or `absolute` inside a fixed context) unless noted.

## Scale (low → high)

| Layer | Z-Index | Use |
|-------|---------|-----|
| **Background** | `-10` (`-z-10`) | Decorative only, behind all content (e.g. index.vue bg). |
| **Base** | `0` | Default; layout texture, loaders, local `z-0` for “below sibling”. |
| **Chrome** | `10` | Main content wrapper (`relative z-10`), TabBar wrapper; sticky headers use `50` in layout. |
| **Bars / banners** | `50` | Connection bar, sticky frosted header, amber banner. |
| **FAB** | `60` | Mobile composer FAB (layout). |
| **Gates** | `70` | Onboarding gate — must be above FAB so gate blocks entire app. |
| **Page overlays** | `100`–`199` | Page-specific sheets (e.g. Roanoke on index: backdrop 100, panel 101). |
| **App overlays** | `1000` | Composer overlay (layout), ToastStack, ReplyModal. |
| **Popovers (low)** | `1100` | MetricsPopover, OnlineCountPopover, EmojiPickerButton. |
| **Modals / autocomplete** | `1200` | AppModal, MentionAutocompletePopover, HashtagAutocompletePopover. |
| **Popovers (high)** | `1300` | UserPreviewPopover, WordDefinitionPopover. |
| **Drag feedback** | `2000` | PostComposer drag ghost (CSS). |
| **Full-screen takeover** | `9000` | SpaceLiveChatOverlay, ImageLightbox. |
| **Sheets** | `10000`–`10001` | BottomSheet backdrop (10000), panel (10001). |

## File reference

| File | Z-Index | Element / purpose |
|------|---------|-------------------|
| **Layout** | | |
| `layouts/app.vue` | 0 | Full-viewport texture (fixed). |
| `layouts/app.vue` | 10 | Main wrapper (relative). |
| `layouts/app.vue` | 50 | Connection bar, sticky frosted header, amber banner. |
| `layouts/app.vue` | 60 | Mobile composer FAB. |
| `layouts/app.vue` | 1000 | Composer overlay wrapper (fixed inset-0). |
| **Pages** | | |
| `pages/index.vue` | -10 | Background decorative. |
| `pages/index.vue` | 100, 101 | Roanoke sheet backdrop, panel. |
| `pages/home.vue` | 0, 10 | Loader below feed, feed above loader. |
| **Components (overlays / modals)** | | |
| `components/app/BottomSheet.vue` | 10000, 10001 | Backdrop, panel. |
| `components/app/SpaceLiveChatOverlay.vue` | 9999 | Full-screen chat overlay. |
| `components/app/ImageLightbox.vue` | 9999 | Full-screen lightbox. |
| `components/app/ReplyModal.vue` | 1000 | Reply modal overlay. |
| `components/app/AppModal.vue` | 1200 | Generic app modal. |
| `components/app/OnboardingGate.vue` | 70 | Gate above FAB (was 60). |
| **Components (popovers)** | | |
| `components/app/ToastStack.vue` | 1000 | Toast container (pointer-events-none). |
| `components/app/UserPreviewPopover.vue` | 1300 | User preview card. |
| `components/app/WordDefinitionPopover.vue` | 1300 | Definition popover. |
| `components/app/MetricsPopover.vue` | 1100 | Metrics popover. |
| `components/app/OnlineCountPopover.vue` | 1100 | Online count popover. |
| `components/app/EmojiPickerButton.vue` | 1100 | Emoji picker. |
| `components/app/MentionAutocompletePopover.vue` | 1200 | Mention autocomplete. |
| `components/app/HashtagAutocompletePopover.vue` | 1200 | Hashtag autocomplete. |
| **Components (other)** | | |
| `components/app/PostComposer.vue` | 2000 | .moh-drag-ghost (CSS). |

## Issues found and fixes

1. **OnboardingGate vs FAB** – Both were `z-[60]`. The gate should cover the whole app including the FAB. **Fix:** OnboardingGate set to `z-[70]`.
2. **Composer vs BottomSheet** – Composer at 1000, BottomSheet at 10000. Correct; More sheet correctly appears above composer.
3. **Multiple at 1000** – Composer overlay, ToastStack, ReplyModal all at 1000. Acceptable; they stack by DOM order when multiple are open. No change.
4. **SpaceLiveChatOverlay / ImageLightbox at 9999** – Below BottomSheet (10000). Full-screen overlays could be raised to 9500 if we ever need a sheet to open on top of them; for now left as-is.

## Local z-index (non-global)

These are used for stacking within a component or section only (e.g. `relative z-10` above a `z-0` sibling). No conflict with the global scale.

- `PostRow.vue`: z-0 (hover bg), z-10 (avatar, content).
- `home.vue`: z-0 (loader), z-10 (feed).
- `notifications.vue`: z-0 (list), z-10 (header).
- `RadioLiveChatPanel.vue`, `chat.vue`, `DmComposer.vue`: z-10 for scroll indicators / buttons.
- `SpaceLiveChatOverlay.vue`: relative z-10 for header and content.
- `ImageLightbox.vue`: z-[5] for nav buttons inside lightbox.
- `layout app.vue`: relative z-0 / z-10 for radio bar vs TabBar.
