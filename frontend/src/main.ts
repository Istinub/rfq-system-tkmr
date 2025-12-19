import { createApp } from 'vue';
import { Quasar, Notify, Loading } from 'quasar';
import App from './App.vue';
import router from './router';
import { getPinia } from './stores';

// Import Quasar css
import 'quasar/dist/quasar.css';
import '@quasar/extras/material-icons/material-icons.css';
import '@quasar/extras/roboto-font/roboto-font.css';
import './css/app.scss';

const app = createApp(App);

app.use(Quasar, {
  plugins: {
    Notify,
    Loading,
  },
  config: {
    notify: {},
    loading: {},
  },
});

app.use(getPinia());
app.use(router);

app.mount('#app');
