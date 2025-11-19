/* eslint-env node */

const { configure } = require('quasar/wrappers');

module.exports = configure(function (/* ctx */) {
  return {
    boot: [],
    css: ['app.css'],
    extras: [
      'roboto-font',
      'material-icons',
    ],
    build: {
      target: {
        browser: ['es2019', 'edge88', 'firefox78', 'chrome87', 'safari13.1'],
        node: 'node18'
      },
      vueRouterMode: 'hash',
      extendViteConf(viteConf) {
        viteConf.server = {
          ...viteConf.server,
          proxy: {
            '/api': {
              target: 'http://localhost:3000',
              changeOrigin: true
            }
          }
        };
      }
    },
    devServer: {
      open: true
    },
    framework: {
      config: {},
      plugins: ['Notify']
    },
    animations: [],
    ssr: {
      pwa: false,
      prodPort: 3000,
      middlewares: [
        'render'
      ]
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
      hideSplashscreen: true
    },
    electron: {
      inspectPort: 5858,
      bundler: 'packager',
      packager: {},
      builder: {
        appId: 'rfq-system-frontend'
      }
    },
    bex: {
      contentScripts: [
        'my-content-script'
      ],
    }
  };
});
