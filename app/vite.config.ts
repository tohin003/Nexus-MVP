import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: { target: 'esnext' },
  server: {
    host: '127.0.0.1', port: 4173, strictPort: true,
    watch: { ignored: ['**/test-results*/**', '**/playwright-report/**', '**/e2e/**'] },
    // E2E real-account specs exercise the live auth API through same-origin cookies.
    proxy: {
      '/api': {
        target: 'https://nexus-mvp-46rx.vercel.app',
        changeOrigin: true,
        secure: true,
      },
    },
  },
})
