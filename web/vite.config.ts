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
        lang: 'pl',
        theme_color: '#0b0a12',
        background_color: '#0b0a12',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        // Pliki ikon powstają w Claude Design (osobny program) i trafiają do web/public/.
        // Dwa rozmiary PNG to minimum instalowalności; maskable daje ładną ikonę na ekranie głównym Androida.
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
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
