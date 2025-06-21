// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import Unocss from 'unocss/vite'

export default defineConfig({
  plugins: [
    react(),
    Unocss(), // add UnoCSS here
  ],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  server: {
    historyApiFallback: true,
  },
})
