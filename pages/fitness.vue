<template>
  <AppPageContent bottom="standard">
    <div v-if="loading && !fitnessPage" class="flex items-center justify-center py-20">
      <AppLogoLoader />
    </div>

    <AppScreenState
      v-else-if="loadError && !fitnessPage" title="Couldn’t load fitness" icon="warning" error
      :description="loadError" action-label="Try again" :busy="loading" @action="loadPage" />

    <template v-else-if="fitnessPage">
      <AppFitnessPageWeek :fitness-page="fitnessPage" />

      <AppFitnessPageRecent :fitness-page="fitnessPage" />

      <AppFitnessPageWeightGoal :fitness-page="fitnessPage" />

      <AppFitnessPageSteps :fitness-page="fitnessPage" />

      <AppFitnessPageVo2Max :fitness-page="fitnessPage" />


    </template>

    <!-- Share post modal -->
    <AppModal
      v-model="shareDialogOpen"
      :title="`Share ${shareTypeLabel}`"
      max-width-class="max-w-md"
      max-height="min(90vh, 36rem)"
      :disable-close="sharingPost"
    >
      <div class="p-4 space-y-3">
        <!-- Live preview of what will be shared -->
        <AppFitnessShareCard v-if="shareDialog?.preview" :share="shareDialog.preview" />

        <!-- Caption -->
        <textarea
          v-model="shareBody"
          placeholder="Add a caption… (optional)"
          rows="3"
          class="w-full rounded-lg border moh-border bg-transparent px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2"
          :class="accentRing"
          autofocus
        />
      </div>

      <template #footer>
        <div class="flex items-center justify-between gap-3">
          <AppComposerVisibilityPicker
            v-model="shareVisibility"
            :allowed="allowedVisibilities"
            :viewer-is-verified="isVerified"
            :is-premium="isPremium"
          />
          <div class="flex items-center gap-3">
            <button
              class="text-sm moh-text-muted hover:moh-text transition-colors"
              :disabled="sharingPost"
              @click="shareDialogOpen = false"
            >
              Cancel
            </button>
            <button
              class="px-4 py-2 rounded-xl text-white text-sm font-semibold disabled:opacity-50 transition-colors"
              :class="sharePostBtnClass"
              :disabled="sharingPost"
              @click="submitShare"
            >
              {{ sharingPost ? 'Posting…' : 'Post' }}
            </button>
          </div>
        </div>
      </template>
    </AppModal>
  </AppPageContent>
</template>

<script setup lang="ts">
import { useFitnessPage } from '~/composables/pages/fitness/useFitnessPage'

definePageMeta({
  layout: 'app',
  requiresAuth: true,
  requiresVerified: true,
})

const {
  fitnessPage,
  loading,
  loadError,
  shareDialog,
  shareDialogOpen,
  shareBody,
  shareVisibility,
  sharingPost,
  isVerified,
  isPremium,
  accentRing,
  allowedVisibilities,
  loadPage,
  sharePostBtnClass,
  shareTypeLabel,
  submitShare,
} = useFitnessPage()
</script>
