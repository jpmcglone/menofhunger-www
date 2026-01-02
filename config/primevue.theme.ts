import Aura from '@primevue/themes/aura'
import { definePreset } from '@primevue/themes'

// Brand accent: orange (used for focus rings, highlights, primary actions, etc.)
const MenOfHungerPreset = definePreset(Aura, {
  semantic: {
    primary: {
      50: '#fff7ed',
      100: '#ffedd5',
      200: '#fed7aa',
      300: '#fdba74',
      400: '#fb923c',
      500: '#f97316',
      600: '#ea580c',
      700: '#c2410c',
      800: '#9a3412',
      900: '#7c2d12'
    }
  }
})

export default {
  preset: MenOfHungerPreset,
  options: {
    // Nuxt color-mode uses `.dark` on the root element; align PrimeVue dark styling with it.
    darkModeSelector: '.dark'
  }
}

