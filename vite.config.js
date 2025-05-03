import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    }
  },
  build: {
    rollupOptions: {
      output: {
        assetFileNames: 'assets/[name].[hash][extname]'
      }
    }
  },
  optimizeDeps: {
    include: ['cm-chessboard']
  },
  assetsInclude: ['**/*.svg'],
  server: {
    fs: {
      allow: ['..']
    }
  }
})