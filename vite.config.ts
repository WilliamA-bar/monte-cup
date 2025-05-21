import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Use the repository name as the base path for GitHub Pages
  // Replace 'monte-cup' with your actual repository name if different
  base: '/monte-cup/',
})
