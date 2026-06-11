<template>
  <!-- Single root inside ClientOnly avoids Vue 3.5 slot / hydration edge cases with multi-node default slots. -->
  <ClientOnly>
    <div class="contents">
      <AppToastStack />
      <AppUserPreviewPopover />
      <AppGroupPreviewPopover />
      <AppCrewPreviewPopover />
      <AppOnlineCountPopover />
      <AppSpaceLiveChatOverlay
        v-if="radioChatSheetOpen && radioHasStation && !showRadioChat"
        v-model="radioChatSheetOpen"
        :space-name="radioChatStationName"
        :member-count="members.length"
      />
    </div>
  </ClientOnly>

  <AppOnboardingGate />
  <AppLocationPromptModal />
  <AppConfirmMount />
  <AppAuthActionModal />
  <AppPremiumMediaModal />
  <AppUnsavedDraftPromptModal />
  <AppReplyModal />
  <AppMarvCatchUpModal />
  <AppPostSendViaChatDialog />
  <AppPostBookmarkFolderDialog />
  <AppKeyboardShortcutsModal />

  <!-- Global full-screen emoji float overlay — rendered outside any clipping ancestor.
       Covers both the spaces page and the radio bar in the layout. -->
  <ClientOnly>
    <Teleport to="body">
      <div class="fixed inset-0 pointer-events-none overflow-hidden" style="z-index: 9990;" aria-hidden="true">
        <span
          v-for="r in allPositionedFloating"
          :key="r.key"
          :class="r.variant === 'bar' ? 'moh-emoji-float-bar' : 'moh-emoji-float'"
          :style="{
            left: `${r.startX}px`,
            top: `${r.startY}px`,
            '--fw-sway': `${r.sway}px`,
            '--fw-om': r.opacityMid,
            ...(r.color ? { color: r.color } : {}),
          }"
        >{{ r.emoji }}</span>
      </div>
    </Teleport>
  </ClientOnly>

  <AppImageLightbox
    :visible="lightbox.visible.value"
    :backdrop-visible="lightbox.backdropVisible.value"
    :src="lightbox.src.value"
    :alt="lightbox.alt.value"
    :kind="lightbox.kind.value"
    :current-media-item="lightbox.currentMediaItem.value"
    :target="lightbox.target.value"
    :image-style="lightbox.imageStyle.value"
    :show-nav="lightbox.kind.value === 'media' && (lightbox.items.value?.length ?? 0) > 1"
    :can-prev="lightbox.canPrev.value"
    :can-next="lightbox.canNext.value"
    :counter-label="
      lightbox.kind.value === 'media' && (lightbox.items.value?.length ?? 0) > 1
        ? `${lightbox.index.value + 1} / ${lightbox.items.value.length}`
        : null
    "
    :on-prev="lightbox.prev"
    :on-next="lightbox.next"
    :on-close="lightbox.close"
    :on-transition-end="lightbox.onTransitionEnd"
  />
</template>

<script setup lang="ts">
import { ClientOnly } from '#components'

defineProps<{
  /** When the right-rail live chat panel is visible, the mobile sheet overlay is suppressed. */
  showRadioChat: boolean
}>()

const { selectedSpaceId, currentSpace, members } = useSpaceLobby()
const radioHasStation = computed(() => Boolean(selectedSpaceId.value))
const radioChatSheetOpen = useState<boolean>('space-chat-sheet-open', () => false)
const radioChatStationName = computed(() => currentSpace.value?.title ?? 'Place')

const { allPositionedFloating } = useSpaceReactions()
const lightbox = useImageLightbox()
</script>
