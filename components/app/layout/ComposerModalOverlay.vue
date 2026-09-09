<template>
  <AppSharePostDialog
    v-if="sharePost"
    v-model:open="shareDialogOpen"
    :post="sharePost"
  />

  <ClientOnly>
    <Transition
      enter-active-class="transition-opacity duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="composerModalOpen"
        class="z-[1000]"
        :style="overlayStyle"
        aria-label="Post composer overlay"
        role="dialog"
        aria-modal="true"
      >
        <!-- Backdrop -->
        <div
          class="absolute inset-0 bg-black/55"
          aria-hidden="true"
          @click="closeComposerModal"
        />

        <!-- Composer sheet: max-height relative to keyboard-pinned overlay -->
        <div
          class="absolute max-h-[calc(100%-0.75rem)] overflow-y-auto no-scrollbar"
          :style="[composerSheetStyle, composerSheetPlacementStyle]"
        >
          <div
            :class="[
              'relative overflow-hidden rounded-2xl border moh-border moh-surface',
            ]"
          >
            <div class="relative z-10">
              <AppPostComposer
                :key="composerCheckinPrompt ? 'modal-checkin' : 'modal-regular'"
                auto-focus
                :show-divider="false"
                :initial-text="composerInitialText ?? undefined"
                :placeholder="composerCustomPlaceholder ?? undefined"
                :checkin-prompt="composerCheckinPrompt ?? undefined"
                :initial-media="composerIsFromOnlyMe ? (composerSourceOnlyMePost?.media ?? []) : undefined"
                :locked-visibility="composerLockedVisibility ?? undefined"
                :hide-visibility-picker="Boolean(composerLockedVisibility) || composerIsGroupMode"
                :allowed-visibilities="composerAllowedVisibilities ?? undefined"
                :disable-media="composerCustomDisableMedia"
                :create-post="composerCreatePost ?? undefined"
                :quoted-post="composerQuotedPost ?? undefined"
                :initial-files="composerInitialFiles"
                :initial-group-id="composerInitialGroupId ?? undefined"
                :show-chat-destination="!composerIsGroupMode && !composerCheckinPrompt && !composerIsFromOnlyMe"
                :group-composer="composerIsGroupMode"
                :group-name="composerIsGroupMode ? (composerGroupName ?? undefined) : undefined"
                :community-group-id="composerIsGroupMode ? (composerGroupId ?? null) : null"
                :disable-poll="composerIsGroupMode || Boolean(composerCheckinPrompt)"
                :persist-key="composerCheckinPrompt ? 'post-modal-checkin' : 'post-modal'"
                :register-unsaved-guard="false"
                @posted="onComposerPosted"
                @pending="onComposerPending"
                @handoff-chat="onHandoffChat"
              >
                <template #close>
                  <button type="button" class="moh-focus moh-surface-hover flex h-11 w-11 items-center justify-center rounded-full moh-text" aria-label="Close composer" @click="closeComposerModal">
                    <Icon name="tabler:x" class="text-xl" aria-hidden="true" />
                  </button>
                </template>
              </AppPostComposer>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </ClientOnly>
</template>

<script setup lang="ts">
import { ClientOnly } from '#components'
import type { AppLayoutComposerApi } from '~/composables/layout/useAppLayoutComposer'
import { useKeyboardPinnedFixedStyle } from '~/composables/useKeyboardHeight'

const props = defineProps<{
  /** The layout's composer surface — created once by `useAppLayoutComposer` in the app layout. */
  composer: AppLayoutComposerApi
}>()

// Same pin/shrink as the app shell — this overlay renders *outside* the shell.
const { style: overlayStyle } = useKeyboardPinnedFixedStyle()

// The composer api object is created once and never replaced, so destructuring
// its refs in setup is safe and lets the template use them unwrapped.
const {
  composerModalOpen,
  composerInitialText,
  composerCustomPlaceholder,
  composerCheckinPrompt,
  composerIsFromOnlyMe,
  composerSourceOnlyMePost,
  composerIsGroupMode,
  composerGroupName,
  composerGroupId,
  composerLockedVisibility,
  composerAllowedVisibilities,
  composerCustomDisableMedia,
  composerCreatePost,
  composerQuotedPost,
  composerInitialFiles,
  composerInitialGroupId,
  composerSheetStyle,
  composerSheetPlacementStyle,
  sharePost,
  shareDialogOpen,
  closeComposerModal,
  onComposerPending,
  onComposerPosted,
} = props.composer

const sendViaChat = useSendViaChat()
const { rememberChat } = useShareDestination()

function onHandoffChat(payload: { body: string; files: File[] }) {
  rememberChat()
  closeComposerModal()
  sendViaChat.openShare({ body: payload.body, files: payload.files })
}
</script>
