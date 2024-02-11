import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import checker from 'vite-plugin-checker';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

//@TODO colocar na Readme como mockar Mfe ou outros components com vitest
const configResolveMfe = (module, component) => {
  return {
    find: module,
    replacement: resolve(__dirname, component),
  };
};

export default defineConfig({
  plugins: [
    react(),
    //remove "checker" if you see performance issues. You will rely only on your editor configuration for static typing
    checker({
      typescript: { tsconfigPath: 'tsconfig.test.json' },
    }),
  ],
  test: {
    environment: 'jsdom',
    setupFiles: ['./testing/setup.ts'],
    globals: true,
  },
  resolve: {
    alias: [configResolveMfe('remoteApp/Button', 'testing/mockMfe.tsx')],
  },
});
