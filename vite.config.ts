import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => ({
  base: mode === 'production' ? '/brainrot-bosses/' : '/', // Only use base path in production
  build: {
    assetsInlineLimit: 0,
    outDir: 'dist'
  },
  server: {
    port: 3000,
    open: true,
  },
}));