/// <reference types='vitest' />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';

export default defineConfig(({ mode }) => ({
  root: __dirname,
  cacheDir: '../../node_modules/.vite/apps/user',
  server: {
    port: 4201,
    host: '0.0.0.0', // Allow external connections (needed for ngrok)
    proxy: {
      '/api': {
        target: 'https://localhost:3000',
        changeOrigin: true,
        secure: true,
      },
    },
  },
  preview: {
    port: 4201,
    host: 'localhost',
  },
  base: '/user',
  plugins: [react(), nxViteTsPaths()],
  define: {
    'process.env.NODE_ENV': JSON.stringify(mode),
  },
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
