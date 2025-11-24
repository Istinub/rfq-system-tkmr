/* eslint-env node */

/*
 * This file runs in a Node context (it's NOT transpiled by Babel), so use only
 * the ES6 features that are supported by your Node version. https://node.green/
 */

// Configuration for your app
// https://v2.quasar.dev/quasar-cli-vite/quasar-config-js

import { configure } from 'quasar/wrappers';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default configure(function (/* ctx */) {
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

    devServer: {
      open: true,
      port: 9000,
    },

    framework: {
      config: {},
      plugins: ['Notify', 'Loading'],
    },

    animations: [],

    ssr: {
      pwa: false,
      prodPort: 3000,
      middlewares: [
        'render',
      ],
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
