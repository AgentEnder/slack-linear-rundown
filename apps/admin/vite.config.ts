/// <reference types='vitest' />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';

export default defineConfig(() => ({
  root: __dirname,
  cacheDir: '../../node_modules/.vite/admin',
  server: {
    port: 4200,
    host: '0.0.0.0', // Allow external connections (needed for ngrok)
    proxy: {
      // Proxy API requests back to the backend server during development
      '/api': {
        target: 'https://localhost:3000',
        changeOrigin: true,
        secure: true,
      },
    },
  },
  preview: {
    port: 4200,
    host: 'localhost',
  },
  base: '/admin',
  plugins: [react(), nxViteTsPaths()],
  // Uncomment this if you are using workers.
  // worker: {
  //  plugins: [ nxViteTsPaths() ],
  // },
  build: {
    outDir: './dist',
    emptyOutDir: true,
    reportCompressedSize: true,
    commonjsOptions: {
      transformMixedEsModules: true,
    },
  },
}));
