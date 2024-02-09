import viteFederation from '@originjs/vite-plugin-federation';

export const federation = () =>
  viteFederation({
    name: 'host',
    remotes: {
      remoteApp: 'http://localhost:5001/assets/remoteEntry.js',
    },
    shared: {
      'react': {},
      'react-dom': {},
    },
  });

export const serveOptions = {
  port: 4000,
  strictPort: true,
};
