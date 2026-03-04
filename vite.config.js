import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages serves at username.github.io/repo-name/ so we need this base.
// For local dev it still works; for root deploy change to '/'
export default defineConfig({
  plugins: [react()],
  base: '/market-dashboard/',
})
