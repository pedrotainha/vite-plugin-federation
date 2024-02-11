import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { federation, serveOptions } from './vite.common';
import topLevelAwait from 'vite-plugin-top-level-await';

export default defineConfig({
  plugins: [
    react(),
    federation(),
    topLevelAwait({
      promiseExportName: '__tla',
      promiseImportName: i => `__tla_${i}`,
    }),
  ],
  preview: {
    ...serveOptions,
  },
  build: {
    emptyOutDir: true,
    modulePreload: false,
    cssCodeSplit: false,
    // set reportCompressedSize: false to improve performance due large files/codebase
  },
});
