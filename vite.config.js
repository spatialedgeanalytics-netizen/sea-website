import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import legacy from '@vitejs/plugin-legacy'

export default defineConfig({
  base: process.env.VITE_BASE || '/',
  plugins: [
    react(),
    // Extra build for older phones/browsers; modern browsers never download it
    legacy({ targets: ['defaults', 'Android >= 5', 'iOS >= 10', 'not IE 11'] }),
  ],
  server: {
    port: 3000
  }
})
