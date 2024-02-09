import viteFederation from '@originjs/vite-plugin-federation';

export const federation = () =>
  viteFederation({
    name: 'remote',
    exposes: {
      './Button': './src/components/Button',
    },
    shared: {
      'react': {},
      'react-dom': {},
    },
  });

export const serveOptions = {
  port: 5001,
  strictPort: true,
};
