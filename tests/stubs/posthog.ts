import { vi } from 'vitest'

// Resolve before Nuxt bootstraps so CI's analytics key cannot start remote-config
// requests or persistence timers that outlive the unit-test DOM.
export default {
  init: vi.fn(),
  capture: vi.fn(),
  identify: vi.fn(),
  reset: vi.fn(),
}
