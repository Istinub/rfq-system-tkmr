<template>
  <q-layout view="hHh lpR fFf" class="admin-layout">
    <q-header elevated class="bg-primary text-white">
      <q-toolbar>
        <q-btn
          flat
          round
          dense
          icon="menu"
          aria-label="Toggle navigation"
          class="q-mr-sm"
          :disable="!isAuthenticated"
          @click="drawer = !drawer"
        />
        <q-toolbar-title>TKMR Admin</q-toolbar-title>
        <q-space />
        <q-chip
          dense
          square
          :color="isAuthenticated ? 'positive' : 'negative'"
          text-color="white"
          icon="shield"
        >
          Admin Mode: {{ isAuthenticated ? 'Active' : 'Locked' }}
        </q-chip>
      </q-toolbar>
    </q-header>

    <q-drawer
      v-if="isAuthenticated"
      v-model="drawer"
      show-if-above
      bordered
      :width="260"
      class="bg-grey-10 text-grey-2"
    >
      <div class="drawer-content column fit">
        <q-scroll-area class="drawer-scroll col">
          <div class="q-pa-md text-h6 text-uppercase text-grey-4">Navigation</div>

          <div class="q-pa-md user-panel">
            <div class="text-subtitle2 text-white">Signed in</div>
            <div class="text-caption text-grey-5">API Key</div>
            <div class="text-body2 text-grey-3 key-preview">{{ maskedApiKey }}</div>
          </div>

          <q-list padding>
            <template v-for="item in navItems" :key="item.to">
              <q-item
                clickable
                dense
                :to="item.to"
                :active="isActive(item.to)"
                active-class="bg-grey-9 text-white"
              >
                <q-item-section avatar>
                  <q-icon :name="item.icon" />
                </q-item-section>
                <q-item-section>
                  <q-item-label>{{ item.label }}</q-item-label>
                </q-item-section>
              </q-item>
            </template>
          </q-list>
        </q-scroll-area>

        <div class="drawer-footer q-pa-md">
          <q-btn
            outline
            dense
            color="negative"
            icon="logout"
            label="Logout"
            class="full-width"
            @click="handleLogout"
          />
        </div>
      </div>
    </q-drawer>

    <q-page-container class="bg-grey-2">
      <q-page class="admin-page">
        <router-view />
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { Notify } from 'quasar';
import { useAdminAuthStore } from '../stores/admin/adminAuth';

const drawer = ref(true);
const route = useRoute();
const router = useRouter();
const auth = useAdminAuthStore();
const { apiKey, isAuthenticated } = storeToRefs(auth);

const navItems = [
  { label: 'Dashboard', icon: 'dashboard', to: '/admin/dashboard' },
  { label: 'RFQs', icon: 'assignment', to: '/admin/rfqs' },
  { label: 'Tokens', icon: 'vpn_key', to: '/admin/tokens' },
  { label: 'Logs', icon: 'list_alt', to: '/admin/logs' },
  { label: 'Settings', icon: 'settings', to: '/admin/settings' },
];

const normalizedPath = computed(() => route.path.replace(/\/$/, ''));

const isActive = (target: string) => {
  const current = normalizedPath.value;
  return current === target || current.startsWith(`${target}/`);
};

const maskedApiKey = computed(() => {
  const value = (apiKey.value || '').trim();
  if (!value) {
    return 'Not authenticated';
  }
  if (value.length <= 8) {
    return `${value.slice(0, 2)}••${value.slice(-2)}`;
  }
  return `${value.slice(0, 4)}••••${value.slice(-4)}`;
});

const handleLogout = () => {
  auth.logout();
  drawer.value = false;
  Notify.create({ type: 'positive', message: 'Logged out' });
  router.push({ name: 'admin-login' });
};

watch(isAuthenticated, (value) => {
  if (!value) {
    drawer.value = false;
  }
});
</script>

<style scoped>
.admin-layout {
  min-height: 100vh;
}

.user-panel {
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.key-preview {
  font-family: 'Roboto Mono', monospace;
  letter-spacing: 0.05em;
}

.drawer-content {
  display: flex;
}

.drawer-scroll {
  max-height: calc(100% - 80px);
}

.drawer-footer {
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.admin-page {
  min-height: calc(100vh - 56px);
}
</style>
