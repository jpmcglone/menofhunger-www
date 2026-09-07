import { defineConfig } from 'vitest/config'

// Media cache tests exercise browser-platform APIs without booting Nuxt Content's SQLite store.
export default defineConfig({ test: { environment: 'node', include: ['tests/avatar-video-cache.test.ts'] } })
