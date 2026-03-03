import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// For GitHub Pages: if repo is username/market-dashboard, set base to '/market-dashboard/'
// For local dev and root deploy use '/'
export default defineConfig({
  plugins: [react()],
  base: '/',
})
