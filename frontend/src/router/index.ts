import { createRouter, createWebHashHistory, RouteRecordRaw } from 'vue-router';
import MainLayout from '../layouts/MainLayout.vue';
import RFQFormPage from '../pages/RFQFormPage.vue';
import SecureLinkPage from '../pages/SecureLinkPage.vue';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: MainLayout,
    children: [
      {
        path: '',
        name: 'home',
        component: RFQFormPage,
      },
      {
        path: 'rfq/:token',
        name: 'secure-rfq',
        component: SecureLinkPage,
      },
    ],
  },
  {
    path: '/:catchAll(.*)*',
    component: () => import('../pages/ErrorNotFound.vue'),
  },
];

const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

export default router;
