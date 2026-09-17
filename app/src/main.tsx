import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from './ui/ErrorBoundary'

const media = window.matchMedia('(prefers-color-scheme: dark)');
function applyTheme() {
  let theme = 'system';
  try { theme = localStorage.getItem('nexus-theme') || 'system'; } catch { /* Theme remains usable without storage. */ }
  document.documentElement.classList.toggle('theme-dark', theme === 'dark' || (theme === 'system' && media.matches));
}
applyTheme();
media.addEventListener('change', applyTheme);
window.addEventListener('storage', applyTheme);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary><App /></ErrorBoundary>
  </StrictMode>,
)
