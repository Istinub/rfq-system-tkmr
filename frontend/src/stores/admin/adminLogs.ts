import { ref } from 'vue';
import { defineStore } from 'pinia';
import { getLogs } from '../../services/admin/adminApi';
import type { AdminLogEntry, AdminLogResult } from '../../services/admin/types';
import { handleAdminError } from '../../utils/adminErrorHandler';

interface LogFilters {
  startDate?: string;
  endDate?: string;
  result?: AdminLogResult | 'all';
  search?: string;
}

const defaultFilters: LogFilters = {
  result: 'all',
  search: '',
};

export const useAdminLogsStore = defineStore('adminLogs', () => {
  const logs = ref<AdminLogEntry[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const hasMore = ref(true);
  const page = ref(0);
  const pageSize = 100;
  const filters = ref<LogFilters>({ ...defaultFilters });

  const reset = () => {
    logs.value = [];
    page.value = 0;
    hasMore.value = true;
  };

  const buildParams = () => {
    const params: Record<string, unknown> = {
      offset: page.value * pageSize,
      limit: pageSize,
    };

    if (filters.value.startDate) params.startDate = filters.value.startDate;
    if (filters.value.endDate) params.endDate = filters.value.endDate;
    if (filters.value.result && filters.value.result !== 'all') params.result = filters.value.result;
    if (filters.value.search) params.search = filters.value.search;

    return params;
  };

  const loadMore = async () => {
    if (loading.value || !hasMore.value) {
      return;
    }

    loading.value = true;
    error.value = null;
    try {
      const response = await getLogs(buildParams());
      if (response.length < pageSize) {
        hasMore.value = false;
      }
      logs.value = [...logs.value, ...response];
      page.value += 1;
    } catch (err) {
      error.value = handleAdminError(err, 'Failed to load logs');
      hasMore.value = false;
    } finally {
      loading.value = false;
    }
  };

  const applyFilters = async (nextFilters: Partial<LogFilters>) => {
    filters.value = { ...filters.value, ...nextFilters };
    reset();
    await loadMore();
  };

  const refresh = async () => {
    reset();
    await loadMore();
  };

  const resetFilters = async () => {
    filters.value = { ...defaultFilters };
    await refresh();
  };

  return {
    logs,
    loading,
    error,
    hasMore,
    filters,
    loadMore,
    applyFilters,
    refresh,
    resetFilters,
    reset,
  };
});
