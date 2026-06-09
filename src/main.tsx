import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

if (import.meta.env.PROD) {
  // Silence console output in production to avoid leaking runtime details.
  const noop = () => undefined
  console.log = noop
  console.info = noop
  console.debug = noop
  console.warn = noop
  console.error = noop
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
