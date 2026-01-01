import Aura from '@primevue/themes/aura'

export default {
  preset: Aura,
  options: {
    // Nuxt color-mode uses `.dark` on the root element; align PrimeVue dark styling with it.
    darkModeSelector: '.dark'
  }
}

