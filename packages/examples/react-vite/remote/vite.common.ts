import viteFederation, { inspectPackage } from '@originjs/vite-plugin-federation';

const dependencies = await inspectPackage('package.json', import.meta.url);

export const federation = () =>
  viteFederation({
    name: 'remote',
    exposes: {
      './Button': './src/components/Button',
    },
    shared: dependencies,
  });

export const serveOptions = {
  port: 5001,
  strictPort: true,
};
