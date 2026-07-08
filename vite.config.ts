import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  // BASE_URL set by CI to /<repo-name>/ for GitHub Pages; defaults to / in dev
  base: process.env.BASE_URL ?? '/',
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      // NVIDIA NIM doesn't send CORS headers — proxy through Vite dev server
      '/nvidia-nim': {
        target: 'https://integrate.api.nvidia.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/nvidia-nim/, ''),
      },
    },
  },
})
