import { viteStaticCopy } from 'vite-plugin-static-copy';
import { defineConfig, type PluginOption } from 'vite';
import { visualizer } from 'rollup-plugin-visualizer';
import react from '@vitejs/plugin-react-swc';
import { VitePWA } from 'vite-plugin-pwa';
import * as path from 'node:path';

const isDev = process.env.NODE_ENV !== 'production';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      devOptions: {
        enabled: !isDev,
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 200 * 1024 * 1024,
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        runtimeCaching: [
          {
            urlPattern: /.*/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'all',
              expiration: {
                maxEntries: 1000,
                purgeOnQuotaError: true,
              },
            },
          },
        ],
      },
      srcDir: 'src',
      filename: 'sw.js',
      outDir: 'dist',
    }),
    viteStaticCopy({
      targets: [
        { src: 'public/*', dest: '' },
        { src: 'node_modules/primeicons/fonts/*', dest: 'fonts' },
        { src: 'src/wasm/openscad.js', dest: '' },
        { src: 'src/wasm/openscad.wasm', dest: '' },
      ],
    }),
    {
      name: 'markdown-loader',
      transform(code, id) {
        if (id.slice(-3) === '.md') {
          return `export default ${JSON.stringify(code)};`;
        }
      },
    },
    visualizer() as PluginOption,
  ],
  base: '/',
  css: {
    modules: {
      localsConvention: 'camelCase',
      generateScopedName: (name: string, filename: string) => {
        if (name.startsWith('p-') || name.startsWith('g-')) {
          return name;
        } else {
          // prettier-ignore
          return name+ '_'+ path.parse(filename).name
            .replace('.module', '')
            .replaceAll(/[^a-zA-Z0-9]/g, '_');
        }
      },
    },
  },
  build: {
    sourcemap: isDev ? true : 'hidden',
    rollupOptions: {
      input: './index.html',
      output: {
        entryFileNames: 'index.js',
        assetFileNames: '[name][extname]',
      },
      external: ['model-viewer'],
    },
    target: 'es2022',
    outDir: 'dist',
    commonjsOptions: {
      transformMixedEsModules: true,
    },
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js', '.mjs', '.wasm', '.css'],
    alias: {
      // Add any needed aliases here
    },
  },
  define: {
    __DEV__: process.env.NODE_ENV !== 'production',
  },
});
