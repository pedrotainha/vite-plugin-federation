import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { federation, serveOptions } from './vite.common';
import checker from 'vite-plugin-checker';

export default defineConfig({
  css: {
    modules: {
      localsConvention: 'camelCaseOnly',
    },
  },
  preview: {
    ...serveOptions,
  },
  server: {
    ...serveOptions,
  },
  plugins: [
    react(),
    //remove "checker" if you see performance issues. You will rely only on your editor configuration for static typing
    checker({
      typescript: { tsconfigPath: 'tsconfig.src.json' },
    }),
    federation(),
  ],
});
