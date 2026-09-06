<template>
  <div class="composer-action-container">
    <div class="composer-action-layout">
      <div class="composer-tools">
        <slot name="tools" />
      </div>
      <div class="composer-publish">
        <div class="composer-count"><slot name="count" /></div>
        <div class="composer-submit"><slot name="submit" /></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Figma Composer: https://www.figma.com/design/YnuRSJB7p90n9jEY4mb4RN?node-id=91-1122
   Query the composer width, not the viewport: dialogs and feed columns can be narrow on desktop. */
.composer-action-container { container-type: inline-size; width: 100%; min-width: 0; }
.composer-action-layout { display: flex; flex-direction: column; gap: 8px; min-width: 0; }
.composer-tools { display: flex; flex-wrap: wrap; align-items: center; gap: 4px; min-width: 0; }
.composer-tools :deep(button) { min-width: 44px; min-height: 44px; }
.composer-publish { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px; min-width: 0; }
.composer-count { min-width: 0; font-variant-numeric: tabular-nums; }
.composer-submit { flex: 0 0 auto; margin-left: auto; max-width: 100%; }
.composer-submit :deep(button) { min-height: 44px; max-width: 100%; }
@container (min-width: 480px) {
  .composer-action-layout { flex-direction: row; align-items: center; gap: 16px; }
  .composer-tools { flex: 1 1 0; }
  .composer-publish { flex: 0 0 auto; gap: 16px; }
}
</style>
