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
      400: '#f39b4f',
      500: '#c77d1a',
      600: '#ad6815',
      700: '#8f5412',
      800: '#6f400f',
      900: '#53300c',
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

