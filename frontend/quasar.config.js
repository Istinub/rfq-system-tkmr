/* eslint-env node */

import { configure } from 'quasar/wrappers';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default configure(function () {
  return {
    eslint: {
      warnings: false,
      errors: false,
    },

    boot: [],

    css: ['app.scss'],

    extras: [
      'roboto-font',
      'material-icons',
    ],

    build: {
      target: {
        browser: ['es2019', 'edge88', 'firefox78', 'chrome87', 'safari13.1'],
        node: 'node18',
      },

      vueRouterMode: 'hash',

      extendViteConf(viteConf) {
        viteConf.resolve = viteConf.resolve || {};
        viteConf.resolve.alias = {
          ...(viteConf.resolve.alias ?? {}),
          '@rfq-system/shared': resolve(__dirname, '../shared/src'),
        };
      },
    },

    /**
     * ==============================
     * DEV SERVER (IMPORTANT)
     * ==============================
     * Browser → Quasar (9000)
     * Quasar → Backend (5000)
     * No CORS involved at all
     */
    devServer: {
      open: true,
      port: 9000,
      strictPort: true,

      proxy: {
        '/api': {
          target: 'http://localhost:5000',
          changeOrigin: true,
          secure: false,
        },
      },
    },

    framework: {
      config: {},
      plugins: ['Notify', 'Loading'],
    },

    animations: [],

    ssr: {
      pwa: false,
      prodPort: 3000,
      middlewares: ['render'],
    },

    pwa: {
      workboxMode: 'generateSW',
      injectPwaMetaTags: true,
      swFilename: 'sw.js',
      manifestFilename: 'manifest.json',
      useCredentialsForManifestTag: false,
    },

    cordova: {},

    capacitor: {
      hideSplashscreen: true,
    },

    electron: {
      inspectPort: 5858,
      bundler: 'packager',
      builder: {
        appId: 'frontend',
      },
    },

    bex: {
      contentScripts: ['my-content-script'],
    },
  };
});
