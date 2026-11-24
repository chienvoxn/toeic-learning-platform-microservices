import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-query': ['@tanstack/react-query'],
          'vendor-icons': ['lucide-react'],
        },
      },
    },
  },
  server: {
    port: 5173,
    host: '127.0.0.1',
    proxy: {
      '/ms/v1/identity': {
        target: 'http://127.0.0.1:8088',
        changeOrigin: true,
      },
      '/ms/v1/contents': {
        target: 'http://127.0.0.1:8088',
        changeOrigin: true,
      },
      '/ms/v1/attempts': {
        target: 'http://127.0.0.1:8088',
        changeOrigin: true,
      },
      '/api/v1/memberships': {
        target: 'http://127.0.0.1:8088',
        changeOrigin: true,
      },
      '/api/v1/interactions': {
        target: 'http://127.0.0.1:8088',
        changeOrigin: true,
      },
    },
  },
});
