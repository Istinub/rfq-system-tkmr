<template>
  <q-page class="q-pa-md q-pa-lg-lg">
    <div class="column q-gutter-lg">
      <div>
        <div class="text-h4 text-weight-bold">Access Logs</div>
        <div class="text-subtitle2 text-grey-6">Monitor every attempt to open secure RFQ links</div>
      </div>

      <q-card class="filter-card">
        <q-card-section class="row q-col-gutter-md items-end">
          <div class="col-12 col-md-4">
            <q-input
              v-model="searchTerm"
              label="Search IP or Token"
              outlined
              dense
              clearable
              debounce="300"
              @keyup.enter="applyFilters"
            >
              <template #prepend>
                <q-icon name="search" />
              </template>
            </q-input>
          </div>

          <div class="col-12 col-md-3">
            <q-select
              v-model="resultFilter"
              :options="resultOptions"
              label="Result"
              outlined
              dense
              emit-value
              map-options
            />
          </div>

          <div class="col-12 col-md-3">
            <q-input v-model="dateRangeLabel" label="Date Range" outlined dense readonly>
              <template #append>
                <q-icon name="event" class="cursor-pointer">
                  <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                    <div class="q-pa-md">
                      <q-date v-model="dateRange" range mask="YYYY-MM-DD">
                        <div class="row items-center justify-between q-mt-md">
                          <q-btn flat label="Clear" @click="clearDateRange" />
                          <q-btn color="primary" label="Apply" v-close-popup @click="updateDateRange" />
                        </div>
                      </q-date>
                    </div>
                  </q-popup-proxy>
                </q-icon>
              </template>
            </q-input>
          </div>

          <div class="col-12 col-md-2 row q-gutter-sm">
            <q-btn color="primary" label="Apply Filters" class="col" @click="applyFilters" />
            <q-btn flat label="Reset" class="col" @click="resetFilters" />
          </div>
        </q-card-section>
      </q-card>

      <q-banner v-if="error" class="bg-negative text-white" rounded>
        {{ error }}
        <template #action>
          <q-btn color="white" flat dense label="Retry" @click="refresh" />
        </template>
      </q-banner>

      <q-card v-if="isInitialLoading" class="q-pa-md">
        <q-skeleton type="rect" height="24px" class="q-mb-md" />
        <q-skeleton type="text" v-for="n in 8" :key="n" class="q-mb-sm" />
      </q-card>

      <q-card v-else class="logs-card">
        <q-table
          flat
          :rows="logs"
          :columns="columns"
          row-key="id"
          :rows-per-page-options="[0]"
          :virtual-scroll="logs.length > 50"
          :loading="loading"
          :row-class="rowClass"
          class="logs-table"
        >
          <template #body-cell-token="props">
            <q-td :props="props">
              <span class="font-mono">{{ maskToken(props.row.token) }}</span>
              <q-tooltip>{{ props.row.token }}</q-tooltip>
            </q-td>
          </template>

          <template #body-cell-timestamp="props">
            <q-td :props="props">{{ formatDate(props.row.timestamp) }}</q-td>
          </template>

          <template #body-cell-userAgent="props">
            <q-td :props="props">
              <div class="user-agent">{{ props.row.userAgent }}</div>
            </q-td>
          </template>

          <template #body-cell-result="props">
            <q-td :props="props">
              <q-badge :color="getResultMeta(props.row.result).color" outline class="text-uppercase">
                {{ getResultMeta(props.row.result).label }}
              </q-badge>
            </q-td>
          </template>

          <template #no-data>
            <div class="text-center q-pa-md text-grey-6">No log entries match the current filters.</div>
          </template>

          <template #bottom>
            <div class="row items-center justify-between full-width q-pa-md">
              <div class="text-caption text-grey-6">Showing {{ logs.length }} entries</div>
              <q-btn
                v-if="hasMore"
                color="primary"
                outline
                label="Load More"
                :loading="loading"
                @click="loadMore"
              />
              <div v-else class="text-caption text-grey-6">End of log history</div>
            </div>
          </template>
        </q-table>
      </q-card>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { storeToRefs } from 'pinia';
import { useAdminLogsStore } from '../../stores/admin/adminLogs';
import type { AdminLogEntry, AdminLogResult } from '../../services/admin/types';

const logsStore = useAdminLogsStore();
const { logs, loading, error, hasMore, filters } = storeToRefs(logsStore);

const columns = [
  { name: 'timestamp', label: 'Timestamp', field: 'timestamp', align: 'left' as const },
  { name: 'ip', label: 'IP Address', field: 'ip', align: 'left' as const },
  { name: 'userAgent', label: 'User Agent', field: 'userAgent', align: 'left' as const },
  { name: 'rfqId', label: 'RFQ ID', field: 'rfqId', align: 'left' as const },
  { name: 'token', label: 'Token', field: 'token', align: 'left' as const },
  { name: 'result', label: 'Result', field: 'result', align: 'left' as const },
];

const resultOptions = [
  { label: 'All Results', value: 'all' },
  { label: 'Success', value: 'success' },
  { label: 'Expired', value: 'expired' },
  { label: 'Disabled', value: 'disabled' },
];

const resultConfig: Record<AdminLogResult, { label: string; color: string; rowClass: string }> = {
  success: { label: 'Success', color: 'positive', rowClass: 'row-success' },
  expired: { label: 'Expired', color: 'orange', rowClass: 'row-expired' },
  disabled: { label: 'Disabled', color: 'negative', rowClass: 'row-disabled' },
};

const getResultMeta = (result: string) => resultConfig[result as AdminLogResult] ?? resultConfig.success;

const resultFilter = ref(filters.value.result ?? 'all');
const searchTerm = ref(filters.value.search ?? '');
const dateRange = ref<{ from?: string; to?: string }>({
  from: filters.value.startDate,
  to: filters.value.endDate,
});

const dateRangeLabel = computed(() => {
  if (dateRange.value?.from && dateRange.value?.to) {
    return `${dateRange.value.from} → ${dateRange.value.to}`;
  }
  return 'All time';
});

const isInitialLoading = computed(() => loading.value && logs.value.length === 0);

const formatDate = (value?: string) => {
  if (!value) return '—';
  return new Date(value).toLocaleString();
};

const maskToken = (token: string) => {
  if (!token) return '—';
  if (token.length <= 8) return `${token.slice(0, 3)}••${token.slice(-2)}`;
  return `${token.slice(0, 4)}••••${token.slice(-4)}`;
};

const rowClass = (row: AdminLogEntry) => getResultMeta(row.result).rowClass;

const updateDateRange = () => {
  // nothing else needed; the computed uses dateRange directly
};

const clearDateRange = () => {
  dateRange.value = {};
};

const applyFilters = () => {
  logsStore.applyFilters({
    startDate: dateRange.value.from,
    endDate: dateRange.value.to,
    result: resultFilter.value as AdminLogResult | 'all',
    search: searchTerm.value.trim(),
  });
};

const resetFilters = () => {
  dateRange.value = {};
  resultFilter.value = 'all';
  searchTerm.value = '';
  logsStore.resetFilters();
};

const loadMore = () => {
  logsStore.loadMore();
};

const refresh = () => {
  logsStore.refresh();
};

onMounted(() => {
  if (!logs.value.length) {
    logsStore.loadMore();
  }
});
</script>

<style scoped>
.filter-card {
  border-radius: 16px;
}

.logs-card {
  border-radius: 16px;
}

.logs-table :deep(thead tr) {
  position: sticky;
  top: 0;
  background: var(--q-color-grey-1, #fff);
  z-index: 2;
}

.logs-table :deep(tbody tr) {
  transition: background 0.2s ease;
}

.logs-table :deep(.row-success) {
  background: rgba(76, 175, 80, 0.08);
}

.logs-table :deep(.row-expired) {
  background: rgba(255, 193, 7, 0.12);
}

.logs-table :deep(.row-disabled) {
  background: rgba(244, 67, 54, 0.1);
}

.font-mono {
  font-family: 'Roboto Mono', monospace;
}

.user-agent {
  white-space: normal;
  word-break: break-word;
}
</style>
