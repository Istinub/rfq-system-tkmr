import { defineStore } from 'pinia';
import { ref } from 'vue';
import { getStats } from '../../services/admin/adminApi';
import type { AdminStatsResponse } from '../../services/admin/types';
import { handleAdminError } from '../../utils/adminErrorHandler';

export const useAdminStatsStore = defineStore('adminStats', () => {
  const stats = ref<AdminStatsResponse | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const lastUpdated = ref<string | null>(null);

  const fetchStats = async () => {
    loading.value = true;
    error.value = null;
    try {
      stats.value = await getStats();
      lastUpdated.value = new Date().toISOString();
    } catch (err) {
      error.value = handleAdminError(err, 'Failed to load admin stats');
    } finally {
      loading.value = false;
    }
  };

  return {
    stats,
    loading,
    error,
    lastUpdated,
    fetchStats,
    refresh: fetchStats,
  };
});
