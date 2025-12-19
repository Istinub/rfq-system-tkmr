import { ref } from 'vue';
import { defineStore } from 'pinia';
import { Notify } from 'quasar';
import { disableToken, getTokens, regenerateToken } from '../../services/admin/adminApi';
import type { AdminTokenRow } from '../../services/admin/types';
import { handleAdminError } from '../../utils/adminErrorHandler';

export const useAdminTokensStore = defineStore('adminTokens', () => {
  const tokens = ref<AdminTokenRow[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const refresh = async () => {
    loading.value = true;
    error.value = null;
    try {
      tokens.value = await getTokens();
    } catch (err) {
      error.value = handleAdminError(err, 'Failed to load tokens');
    } finally {
      loading.value = false;
    }
  };

  const disable = async (token: string) => {
    try {
      await disableToken(token);
      Notify.create({ type: 'positive', message: 'Token disabled.' });
      await refresh();
    } catch (err) {
      handleAdminError(err, 'Unable to disable token');
    }
  };

  const regenerate = async (rfqId: string | number) => {
    try {
      await regenerateToken(rfqId);
      Notify.create({ type: 'positive', message: 'Token regenerated.' });
      await refresh();
    } catch (err) {
      handleAdminError(err, 'Unable to regenerate token');
    }
  };

  return {
    tokens,
    loading,
    error,
    refresh,
    disable,
    regenerate,
  };
});
