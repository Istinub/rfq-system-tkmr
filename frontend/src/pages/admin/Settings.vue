<template>
  <q-page class="q-pa-md q-pa-lg-lg">
    <div class="column q-gutter-lg">
      <div>
        <div class="text-h4 text-weight-bold">System Settings</div>
        <div class="text-subtitle2 text-grey-6">Control secure link behavior and platform safeguards</div>
      </div>

      <q-banner v-if="error" class="bg-negative text-white" rounded>
        {{ error }}
        <template #action>
          <q-btn color="white" flat dense label="Retry" @click="loadSettings" />
        </template>
      </q-banner>

      <div v-if="isLoading" class="column items-center justify-center q-my-xl">
        <q-spinner color="primary" size="64px" />
        <div class="text-subtitle1 text-grey-6 q-mt-md">Loading settings…</div>
      </div>

      <q-card v-else class="settings-card">
        <q-form @submit.prevent="handleSave" class="column q-gutter-lg">
          <q-card-section class="q-gutter-md">
            <div class="text-h6">Token Expiration</div>
            <div class="text-caption text-grey-6">Define how long secure links remain valid.</div>
            <q-input
              v-model.number="form.tokenExpiryDays"
              type="number"
              label="Token Expiry (days)"
              outlined
              dense
              :rules="[(val) => validateNumber(val, 1, 365) || 'Enter 1-365 days']"
              min="1"
              max="365"
              step="1"
              :disable="isSaving"
            />
            <q-toggle
              v-model="form.oneTimeAccess"
              label="Single-use secure links"
              color="primary"
              :disable="isSaving"
            >
              <div class="text-caption text-grey-6">Require vendors to request a new link after first access.</div>
            </q-toggle>
          </q-card-section>

          <q-separator inset />

          <q-card-section class="q-gutter-md">
            <div class="text-h6">Rate Limiting</div>
            <div class="text-caption text-grey-6">Protect sensitive RFQs from brute-force access.</div>
            <q-input
              v-model.number="form.rateLimitPerMinute"
              type="number"
              label="Allowed requests per minute"
              outlined
              dense
              :rules="[(val) => validateOptionalNumber(val, 1, 600) || 'Enter 1-600 or leave blank']"
              min="1"
              max="600"
              step="1"
              :disable="isSaving"
              clearable
            />
          </q-card-section>

          <q-card-section class="row items-center justify-between">
            <div class="text-caption text-grey-6">Last updated: {{ lastUpdatedLabel }}</div>
            <q-btn
              label="Save Settings"
              color="primary"
              type="submit"
              unelevated
              :loading="isSaving"
              :disable="isSaving"
            />
          </q-card-section>
        </q-form>
      </q-card>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive } from 'vue';
import { storeToRefs } from 'pinia';
import { Notify } from 'quasar';
import { useAdminSettingsStore } from '../../stores/admin/adminSettings';

const settingsStore = useAdminSettingsStore();
const { settings, isLoading, isSaving, error } = storeToRefs(settingsStore);

const form = reactive({
  tokenExpiryDays: 30,
  oneTimeAccess: false,
  rateLimitPerMinute: null as number | null,
});

const lastUpdatedLabel = computed(() => {
  return settings.value ? new Date().toLocaleString() : 'Never';
});

const hydrateForm = () => {
  if (!settings.value) return;
  form.tokenExpiryDays = settings.value.tokenExpiryDays ?? 30;
  form.oneTimeAccess = settings.value.oneTimeAccess ?? false;
  form.rateLimitPerMinute = settings.value.rateLimitPerMinute ?? null;
};

const loadSettings = async () => {
  await settingsStore.fetchSettings();
  hydrateForm();
};

const validateNumber = (val: number, min: number, max: number) => {
  return typeof val === 'number' && !Number.isNaN(val) && val >= min && val <= max;
};

const validateOptionalNumber = (val: number | null, min: number, max: number) => {
  if (val === null || val === undefined || val === ('' as unknown as number)) {
    return true;
  }
  return validateNumber(val, min, max);
};

const handleSave = async () => {
  if (!validateNumber(form.tokenExpiryDays, 1, 365)) {
    Notify.create({ type: 'negative', message: 'Token expiry must be between 1 and 365 days.' });
    return;
  }

  if (!validateOptionalNumber(form.rateLimitPerMinute, 1, 600)) {
    Notify.create({ type: 'negative', message: 'Rate limit must be between 1 and 600 requests per minute or left blank.' });
    return;
  }

  await settingsStore.saveSettings({
    tokenExpiryDays: form.tokenExpiryDays,
    oneTimeAccess: form.oneTimeAccess,
    rateLimitPerMinute: form.rateLimitPerMinute ?? undefined,
  });
  hydrateForm();
};

onMounted(() => {
  if (!settings.value) {
    loadSettings();
  } else {
    hydrateForm();
  }
});
</script>

<style scoped>
.settings-card {
  border-radius: 16px;
  padding-bottom: 8px;
}
</style>
