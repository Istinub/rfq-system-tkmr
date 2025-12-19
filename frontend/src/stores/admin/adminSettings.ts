import { ref } from 'vue';
import { defineStore } from 'pinia';
import { Notify } from 'quasar';
import { getSettings, updateSettings } from '../../services/admin/adminApi';
import type { AdminSettings } from '../../services/admin/types';
import { handleAdminError } from '../../utils/adminErrorHandler';

export const useAdminSettingsStore = defineStore('adminSettings', () => {
  const settings = ref<AdminSettings | null>(null);
  const isSaving = ref(false);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  const fetchSettings = async () => {
    isLoading.value = true;
    error.value = null;
    try {
      settings.value = await getSettings();
    } catch (err) {
      error.value = handleAdminError(err, 'Failed to load settings');
    } finally {
      isLoading.value = false;
    }
  };

  const saveSettings = async (payload: AdminSettings) => {
    isSaving.value = true;
    error.value = null;
    try {
      settings.value = await updateSettings(payload);
      Notify.create({ type: 'positive', message: 'Settings saved successfully.' });
    } catch (err) {
      error.value = handleAdminError(err, 'Failed to save settings');
    } finally {
      isSaving.value = false;
    }
  };

  return {
    settings,
    isSaving,
    isLoading,
    error,
    fetchSettings,
    saveSettings,
  };
});
