import { defineConfig } from 'vitest/config'

// Unit/integration tests only — Playwright's e2e specs live in e2e/ and run separately.
export default defineConfig({
  test: { include: ['src/**/*.{test,spec}.{ts,tsx}'], environment: 'node' },
})
