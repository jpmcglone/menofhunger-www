#!/usr/bin/env node
import { execSync } from 'node:child_process'

const port = String(process.env.NUXT_PORT || '3000')

try {
  const pid = execSync(`lsof -tiTCP:${port} -sTCP:LISTEN`, { encoding: 'utf8', stdio: 'pipe' }).trim()
  if (pid) {
    console.error(`Port ${port} is already in use (pid ${pid}).`)
    console.error('Kill it with: npm run dev:kill (or set NUXT_PORT in .env)')
    process.exit(1)
  }
} catch {
  process.exit(0)
}
