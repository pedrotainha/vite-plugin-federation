import viteFederation, { inspectPackage } from '@originjs/vite-plugin-federation';

const dependencies = await inspectPackage('package.json', import.meta.url);

export const federation = () =>
  viteFederation({
    name: 'host',
    remotes: {
      remoteApp: 'http://localhost:5001/assets/remoteEntry.js',
    },
    shared: dependencies,
  });

export const serveOptions = {
  port: 4000,
  strictPort: true,
};
