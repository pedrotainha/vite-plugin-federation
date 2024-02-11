import { defineConfig } from 'vite'

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    lib: {
      entry: [
        './src/index.ts',
        'src/utils/semver/satisfy.ts',
        'src/utils/inspectPackage.ts'
      ],
      formats: ['es', 'cjs']
    },
    target: 'node14',
    minify: false,
    emptyOutDir: true,
    rollupOptions: {
      external: [
        'fs',
        'url',
        'os',
        'path',
        'crypto',
        'magic-string',
        'readdirSync'
      ],
      output: {
        minifyInternalExports: false,
        exports: 'named'
      }
    }
  }
})
