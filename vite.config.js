import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

// Vite configuration for the MoneyLens Vue application
export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
