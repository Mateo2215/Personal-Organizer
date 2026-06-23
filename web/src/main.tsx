import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient } from '@tanstack/react-query'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'
// Fonty „Aurora" (self-host przez @fontsource — bez zależności od CDN, działa offline w PWA).
import '@fontsource/space-grotesk/400.css'
import '@fontsource/space-grotesk/500.css'
import '@fontsource/space-grotesk/600.css'
import '@fontsource/space-grotesk/700.css'
import '@fontsource/manrope/400.css'
import '@fontsource/manrope/500.css'
import '@fontsource/manrope/600.css'
import '@fontsource/manrope/700.css'
import '@fontsource/manrope/800.css'
import './index.css'
import App from './App.tsx'

// Trzymaj dane w pamięci długo (gcTime), by przetrwały do zapisu na dysk i odtworzenia po ubiciu apki.
// staleTime = 1 min: po otwarciu pokazujemy zapamiętane dane od razu, świeże douczytujemy w tle.
// retry 2 — przy zawieszonym żądaniu (timeout w api.ts) szybkie ponowienie na wybudzonym łączu.
const DAY = 1000 * 60 * 60 * 24

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 7 * DAY,
      staleTime: 1000 * 60,
      retry: 2,
    },
  },
})

// Persister: zapisuje cache zapytań do localStorage, więc po ubiciu apki przez Androida
// dane są od razu na ekranie (a nie dopiero po pobraniu z sieci). buster = wersja schematu cache.
const persister = createSyncStoragePersister({
  storage: window.localStorage,
  key: 'po-query-cache',
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister, maxAge: 7 * DAY, buster: '1' }}
    >
      <App />
    </PersistQueryClientProvider>
  </StrictMode>,
)
