import { createRouter, createWebHashHistory, RouteRecordRaw } from 'vue-router';
import MainLayout from '../layouts/MainLayout.vue';
import AdminLayout from '../layouts/AdminLayout.vue';
import RFQFormPage from '../pages/RFQFormPage.vue';
import SecureLinkPage from '../pages/SecureLinkPage.vue';
import { useAdminRedirectGuard } from '../composables/admin/useAdminRedirectGuard';

const AdminDashboardPage = () => import('../pages/admin/Dashboard.vue');
const AdminRfqsPage = () => import('../pages/admin/Rfqs.vue');
const AdminRfqDetailsPage = () => import('../pages/admin/RfqDetails.vue');
const AdminTokensPage = () => import('../pages/admin/Tokens.vue');
const AdminLogsPage = () => import('../pages/admin/Logs.vue');
const AdminSettingsPage = () => import('../pages/admin/Settings.vue');
const AdminLoginPage = () => import('../pages/admin/Login.vue');

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
    path: '/admin/login',
    name: 'admin-login',
    component: AdminLoginPage,
  },
  {
    path: '/admin',
    component: AdminLayout,
    meta: {
      requiresAdmin: true,
    },
    children: [
      {
        path: '',
        redirect: '/admin/dashboard',
      },
      {
        path: 'dashboard',
        name: 'admin-dashboard',
        component: AdminDashboardPage,
      },
      {
        path: 'rfqs',
        name: 'admin-rfqs',
        component: AdminRfqsPage,
      },
      {
        path: 'rfqs/:id',
        name: 'admin-rfq-details',
        component: AdminRfqDetailsPage,
      },
      {
        path: 'tokens',
        name: 'admin-tokens',
        component: AdminTokensPage,
      },
      {
        path: 'logs',
        name: 'admin-logs',
        component: AdminLogsPage,
      },
      {
        path: 'settings',
        name: 'admin-settings',
        component: AdminSettingsPage,
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

router.beforeEach(useAdminRedirectGuard());

router.afterEach((to) => {
  const isAdmin = to.matched.some((record) => Boolean(record.meta?.requiresAdmin));
  document.title = isAdmin ? 'RFQ TMR Admin' : 'RFQ System - TKMR';
});

export default router;
