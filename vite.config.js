import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  publicDir: 'public',
  server: {
    fs: {
      // Allow serving files from project root
      allow: ['..']
    }
  }
})