import { computed, ref, watch } from 'vue';
import { defineStore } from 'pinia';
import { adminApiClient, ADMIN_API_KEY_STORAGE_KEY } from '../../services/admin/adminApi';

const applyAdminHeader = (value: string | null) => {
  if (value && value.trim()) {
    adminApiClient.defaults.headers.common['x-api-key'] = value.trim();
  } else {
    delete adminApiClient.defaults.headers.common['x-api-key'];
  }
};

export const useAdminAuthStore = defineStore('adminAuth', () => {
  const storedValue = localStorage.getItem(ADMIN_API_KEY_STORAGE_KEY) ?? '';
  const apiKey = ref(storedValue);

  const login = (key: string) => {
    const sanitized = key.trim();
    apiKey.value = sanitized;
    if (sanitized) {
      localStorage.setItem(ADMIN_API_KEY_STORAGE_KEY, sanitized);
    }
    applyAdminHeader(sanitized || null);
  };

  const logout = () => {
    apiKey.value = '';
    localStorage.removeItem(ADMIN_API_KEY_STORAGE_KEY);
    applyAdminHeader(null);
  };

  const isAuthenticated = computed(() => apiKey.value.trim().length > 0);

  watch(
    apiKey,
    (value) => {
      applyAdminHeader(value || null);
    },
    { immediate: true }
  );

  return {
    apiKey,
    login,
    logout,
    isAuthenticated,
  };
});
