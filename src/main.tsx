import './index.css'

import { createRoot } from 'react-dom/client'

import App from './App.tsx'
import { shouldRegisterServiceWorker } from './lib/pwa'

const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error('Root element not found')
}

createRoot(rootElement).render(<App />)

if (shouldRegisterServiceWorker(import.meta.env.PROD, 'serviceWorker' in navigator)) {
  void import('virtual:pwa-register').then(({ registerSW }) => {
    registerSW({ immediate: true })
  })
}
