import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  optimizeDeps: {
    include: ['chess.js', 'cm-chessboard']
  },
  build: {
    rollupOptions: {
      output: {
        assetFileNames: (assetInfo) => {
          // Keep the original file names for cm-chessboard assets
          if (assetInfo.name && assetInfo.name.includes('staunty')) {
            return 'assets/pieces/[name][extname]';
          }
          return 'assets/[name]-[hash][extname]';
        }
      }
    }
  },
  server: {
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:3000',
        changeOrigin: true,
        secure: false
      },
      '/socket.io': {
        target: process.env.VITE_API_URL || 'http://localhost:3000',
        changeOrigin: true,
        ws: true
      }
    }
  }
})
