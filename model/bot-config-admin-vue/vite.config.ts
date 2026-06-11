import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'
// @ts-ignore
import PinmarkDevPlugin from './pinmark-vite-plugin.js'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    PinmarkDevPlugin()
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true
  }
})
