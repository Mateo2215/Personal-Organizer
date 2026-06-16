import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// W dev front (5173) i Worker (8787) to osobne procesy.
// Proxy /api → Worker, żeby front wołał ten sam origin (bez CORS, jak na produkcji).
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': 'http://localhost:8787',
    },
  },
})
