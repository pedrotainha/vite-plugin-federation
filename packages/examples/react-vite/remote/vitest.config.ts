import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import checker from 'vite-plugin-checker';
import { resolve, dirname } from 'path';

const getDirname = url => {
  const __filename = new URL(url).pathname;
  const notTheFinalDirname = dirname(__filename);
  return notTheFinalDirname.indexOf('/') == 0 ? notTheFinalDirname.substring(1) : notTheFinalDirname;
};

const __dirname = getDirname(import.meta.url);

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
    alias: [configResolveMfe('Screen/Screen', 'testing/mockMfe.tsx'), configResolveMfe('ScreenRight/Screen', 'testing/mockMfe.tsx')],
  },
});
