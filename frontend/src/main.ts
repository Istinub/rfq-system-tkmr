import { createApp } from 'vue';
import { Quasar, Notify } from 'quasar';
import App from './App.vue';
import router from './router';

// Import Quasar css
import 'quasar/dist/quasar.css';
import '@quasar/extras/material-icons/material-icons.css';
import '@quasar/extras/roboto-font/roboto-font.css';

const app = createApp(App);

app.use(Quasar, {
  plugins: {
    Notify
  },
  config: {
    notify: {}
  }
});

app.use(router);

app.mount('#app');
