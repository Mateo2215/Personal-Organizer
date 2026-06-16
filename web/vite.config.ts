import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// W dev front (5173) i Worker (8787) to osobne procesy.
// Proxy /api → Worker, żeby front wołał ten sam origin (bez CORS, jak na produkcji).
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      strategies: 'injectManifest', // własny SW (push handlers), nie auto-generowany
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      manifest: {
        name: 'Personal Organizer',
        short_name: 'Organizer',
        description: 'Zadania z przypomnieniami, pomysły i widok Dziś.',
        theme_color: '#0a0a0a',
        background_color: '#0a0a0a',
        display: 'standalone',
        start_url: '/',
        // Ikony dochodzą w Fazie 4 (manifest PWA + instalacja na ekran główny).
      },
      devOptions: {
        enabled: true, // SW aktywny też w `vite dev` — pozwala testować push lokalnie
        type: 'module',
      },
    }),
  ],
  server: {
    proxy: {
      '/api': 'http://localhost:8787',
    },
  },
})
