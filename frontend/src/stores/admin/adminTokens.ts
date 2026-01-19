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

  const sanitizeHex = (value: string) => value.replace(/[^0-9a-f]/gi, '');

  const sanitizeTokenRow = (row: AdminTokenRow): AdminTokenRow => {
    const tokenHash = sanitizeHex(row.tokenHash ?? '');
    const tokenPreview = sanitizeHex(row.tokenPreview ?? tokenHash).slice(0, 128);

    return {
      ...row,
      tokenHash,
      tokenPreview,
      rfqPublicId: row.rfqPublicId ?? null,
    };
  };

  const refresh = async () => {
    loading.value = true;
    error.value = null;
    try {
      const response = await getTokens();
      tokens.value = response.map(sanitizeTokenRow);
    } catch (err) {
      error.value = handleAdminError(err, 'Failed to load tokens');
    } finally {
      loading.value = false;
    }
  };

  const disable = async (tokenId: string | number) => {
    try {
      await disableToken(tokenId);
      Notify.create({ type: 'positive', message: 'Token disabled.' });
      await refresh();
    } catch (err) {
      handleAdminError(err, 'Unable to disable token');
    }
  };

  const regenerate = async (tokenId: string | number) => {
    try {
      await regenerateToken(tokenId);
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
