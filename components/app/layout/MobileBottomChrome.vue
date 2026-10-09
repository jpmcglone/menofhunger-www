<template>
  <!-- Mobile bottom chrome lives inside the center column (no fixed overlap). -->
  <!-- Radio sits above tab bar when playing. -->
  <!-- max-h collapses the wrapper to 0 when the keyboard is open, eliminating the    -->
  <!-- blank gap that translate-only leaves behind (transforms don't affect layout).  -->
  <!-- overflow-hidden only while collapsing (keyboard open) so stray scrollbars
       don't appear; overflow-visible otherwise so radio avatar glow can paint. -->
  <!-- inert removes the hidden chrome from tab order + screen readers.               -->
  <div
    v-if="!anyOverlayOpen"
    class="md:hidden shrink-0 transition-[max-height] duration-200 ease-out motion-reduce:transition-none"
    :class="isKeyboardOpen ? 'max-h-0 overflow-hidden' : 'max-h-36 overflow-visible'"
    :aria-hidden="isKeyboardOpen || undefined"
    :inert="isKeyboardOpen || undefined"
  >
    <Transition
      enter-active-class="transition-[opacity,transform] duration-200 ease-out"
      enter-from-class="opacity-0 translate-y-[30px]"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition-[opacity,transform] duration-150 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 translate-y-[30px]"
      @before-enter="() => { padActive = true }"
      @before-leave="() => { padActive = true }"
      @after-leave="() => { padActive = false }"
    >
      <div
        v-show="radioHasStation"
        id="moh-radio-mobile"
        class="moh-radio-bar dark relative z-0 flex items-center border-t border-zinc-800 bg-black text-white"
        :style="{ minHeight: 'var(--moh-radio-bar-height, 4rem)' }"
      >
        <div class="w-full">
          <!-- AppRadioBar teleports here on mobile -->
        </div>
      </div>
    </Transition>

    <div class="relative z-10">
      <AppTabBar :items="tabItems" />
    </div>
  </div>
</template>

<script setup lang="ts">
type TabBarItem = ReturnType<typeof useAppNav>['tabItems']['value'][number]

/** Mobile bottom chrome: the radio bar slot above the tab bar; both slide away while the keyboard is open. */
defineProps<{ anyOverlayOpen: boolean; isKeyboardOpen: boolean; radioHasStation: boolean; tabItems: TabBarItem[] }>()
/** Keeps bottom spacing stable while the radio animates out. */
const padActive = defineModel<boolean>('padActive', { default: false })
</script>
