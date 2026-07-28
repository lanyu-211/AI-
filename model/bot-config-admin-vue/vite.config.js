import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

import PinmarkDevPlugin from './pinmark-vite-plugin.js';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    PinmarkDevPlugin()
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    host: '127.0.0.1',
    port: 5173
  }
})
