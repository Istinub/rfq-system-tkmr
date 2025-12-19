import { ref } from 'vue';
import { defineStore } from 'pinia';
import { Notify } from 'quasar';
import {
  deleteRfq,
  disableToken,
  generateSecureLink as generateSecureLinkRequest,
  getRfq,
  getRfqs,
  regenerateToken,
} from '../../services/admin/adminApi';
import type { AdminRfqDetails, AdminRfqSummary } from '../../services/admin/types';
import { handleAdminError } from '../../utils/adminErrorHandler';

export const useAdminRfqsStore = defineStore('adminRfqs', () => {
  const rfqs = ref<AdminRfqSummary[]>([]);
  const currentRfq = ref<AdminRfqDetails | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const detailLoading = ref(false);
  const detailError = ref<string | null>(null);

  const refresh = async () => {
    loading.value = true;
    error.value = null;
    try {
      rfqs.value = await getRfqs();
    } catch (err) {
      error.value = handleAdminError(err, 'Failed to load RFQs');
    } finally {
      loading.value = false;
    }
  };

  const fetchRfqById = async (id: string | number) => {
    detailLoading.value = true;
    detailError.value = null;
    try {
      currentRfq.value = await getRfq(id);
      return currentRfq.value;
    } catch (err) {
      detailError.value = handleAdminError(err, 'Failed to load RFQ details');
      return null;
    } finally {
      detailLoading.value = false;
    }
  };

  const removeRfq = async (id: string | number) => {
    try {
      await deleteRfq(id);
      Notify.create({ type: 'positive', message: 'RFQ deleted successfully.' });
      await refresh();
    } catch (err) {
      handleAdminError(err, 'Failed to delete RFQ');
    }
  };

  const regenerateSecureLink = async (rfqId: string | number) => {
    try {
      await regenerateToken(rfqId);
      Notify.create({ type: 'positive', message: 'Secure link regenerated.' });
    } catch (err) {
      handleAdminError(err, 'Failed to regenerate token');
      throw err;
    }
  };

  const disableSecureLink = async (token: string) => {
    try {
      await disableToken(token);
      Notify.create({ type: 'warning', message: 'Secure link disabled.' });
    } catch (err) {
      handleAdminError(err, 'Failed to disable token');
      throw err;
    }
  };

  const generateSecureLink = async (rfqId: string | number) => {
    try {
      await generateSecureLinkRequest(rfqId);
      Notify.create({ type: 'positive', message: 'Secure link generated.' });
    } catch (err) {
      handleAdminError(err, 'Failed to generate secure link');
      throw err;
    }
  };

  return {
    rfqs,
    currentRfq,
    loading,
    error,
    detailLoading,
    detailError,
    refresh,
    fetchRfqById,
    removeRfq,
    regenerateSecureLink,
    disableSecureLink,
    generateSecureLink,
  };
});
