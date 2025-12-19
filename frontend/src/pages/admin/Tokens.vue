<template>
  <q-page class="q-pa-md q-pa-lg-lg">
    <div class="column q-gutter-lg">
      <div class="header-bar">
        <div class="header-copy">
          <div class="text-h4 text-weight-bold">Token Management</div>
          <div class="text-subtitle2 text-grey-6">Monitor secure links, statuses, and regenerate when needed</div>
        </div>
        <div class="filter-panel">
          <div class="text-caption text-grey-6 q-mb-xs">Filter by status</div>
          <q-chip-group
            v-model="statusFilter"
            selection-type="single"
            class="filter-chip-group"
            square
            dense
          >
            <q-chip
              v-for="option in filterOptions"
              :key="option.value"
              :value="option.value"
              clickable
              outline
              :color="statusFilter === option.value ? 'primary' : 'grey-6'"
              class="filter-chip"
            >
              {{ option.label }}
            </q-chip>
          </q-chip-group>
        </div>
      </div>

      <q-banner v-if="error" class="bg-negative text-white" rounded>
        {{ error }}
        <template #action>
          <q-btn color="white" flat dense label="Retry" @click="refreshData" />
        </template>
      </q-banner>

      <q-card v-if="isInitialLoading" class="q-pa-md">
        <q-skeleton type="rect" height="24px" class="q-mb-md" />
        <q-skeleton type="text" v-for="n in 6" :key="n" class="q-mb-sm" />
      </q-card>

      <q-card v-else class="table-card">
        <q-table
          flat
          :rows="filteredTokens"
          :columns="columns"
          row-key="id"
          :loading="loading"
          :rows-per-page-options="[5, 10, 20, 50]"
          :row-class="rowClass"
          v-model:pagination="pagination"
          class="tokens-table"
        >
          <template #body-cell-token="props">
            <q-td :props="props">
              <div class="row items-center q-gutter-sm">
                <span class="font-mono">{{ maskToken(props.row.token) }}</span>
                <q-btn
                  dense
                  flat
                  round
                  icon="content_copy"
                  @click.stop="copyToken(props.row.token)"
                />
                <q-tooltip anchor="top middle">{{ props.row.token }}</q-tooltip>
        .header-bar {
          display: flex;
          flex-wrap: wrap;
          gap: 16px;
          align-items: flex-start;
        }

        .header-copy {
          flex: 1 1 260px;
        }

        .filter-panel {
          flex: 0 0 auto;
          min-width: 240px;
          padding: 12px;
          border-radius: 12px;
          border: 1px solid rgba(145, 158, 171, 0.3);
          background: rgba(145, 158, 171, 0.08);
        }

        .filter-chip-group {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .filter-chip {
          min-width: 80px;
          justify-content: center;
        }

              </div>
          .filter-panel {
            width: 100%;
          }

          .filter-chip {
            flex: 1 1 45%;
          }
            </q-td>
          </template>

          <template #body-cell-createdAt="props">
            <q-td :props="props">{{ formatDate(props.row.createdAt) }}</q-td>
          </template>
          <template #body-cell-expiresAt="props">
            <q-td :props="props">{{ formatDate(props.row.expiresAt) }}</q-td>
          </template>

          <template #body-cell-status="props">
            <q-td :props="props">
              <q-badge :color="statusConfig[props.row.status].color" outline class="text-uppercase">
                {{ statusConfig[props.row.status].label }}
              </q-badge>
            </q-td>
          </template>

          <template #body-cell-actions="props">
            <q-td :props="props">
              <div class="row q-gutter-sm">
                <q-btn
                  dense
                  outline
                  color="warning"
                  label="Disable"
                  :loading="actionLoadingId === props.row.id && actionType === 'disable'"
                  @click.stop="disableToken(props.row)"
                  :disable="props.row.status === 'disabled'"
                />
                <q-btn
                  dense
                  unelevated
                  color="primary"
                  label="Regenerate"
                  :loading="actionLoadingId === props.row.id && actionType === 'regenerate'"
                  @click.stop="regenerateSecureToken(props.row)"
                />
              </div>
            </q-td>
          </template>

          <template #no-data>
            <div class="text-center q-pa-md text-grey-6">No tokens for the selected filter.</div>
          </template>

          <template #loading>
            <q-inner-loading showing color="primary" />
          </template>
        </q-table>
      </q-card>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { storeToRefs } from 'pinia';
import { useAdminTokensStore } from '../../stores/admin/adminTokens';
import type { AdminTokenRow } from '../../services/admin/types';

const tokenStore = useAdminTokensStore();
const { tokens, loading, error } = storeToRefs(tokenStore);

const filterOptions = [
  { label: 'All', value: 'all' },
  { label: 'Active', value: 'active' },
  { label: 'Expired', value: 'expired' },
  { label: 'Disabled', value: 'disabled' },
];

const columns = [
  { name: 'token', label: 'Token', field: 'token', align: 'left' as const },
  { name: 'rfqId', label: 'RFQ ID', field: 'rfqId', align: 'left' as const },
  { name: 'createdAt', label: 'Created', field: 'createdAt', align: 'left' as const },
  { name: 'expiresAt', label: 'Expires', field: 'expiresAt', align: 'left' as const },
  { name: 'status', label: 'Status', field: 'status', align: 'left' as const },
  { name: 'usage', label: 'Usage Count', field: 'usageCount', align: 'center' as const },
  { name: 'actions', label: 'Actions', field: 'actions', align: 'right' as const },
];

const statusConfig: Record<string, { label: string; color: string }> = {
  active: { label: 'Active', color: 'positive' },
  expired: { label: 'Expired', color: 'orange' },
  disabled: { label: 'Disabled', color: 'negative' },
};

const statusFilter = ref('all');
const pagination = ref({ page: 1, rowsPerPage: 10, sortBy: 'createdAt', descending: true });
const actionLoadingId = ref<string | number | null>(null);
const actionType = ref<'disable' | 'regenerate' | null>(null);

const filteredTokens = computed(() => {
  const filter = statusFilter.value;
  if (filter === 'all') return tokens.value;
  return tokens.value.filter((token) => token.status === filter);
});

const isInitialLoading = computed(() => loading.value && tokens.value.length === 0);

const formatDate = (value?: string) => {
  if (!value) return '—';
  return new Date(value).toLocaleString();
};

const maskToken = (token: string) => {
  if (token.length <= 8) {
    return `${token.slice(0, 3)}••${token.slice(-2)}`;
  }
  return `${token.slice(0, 4)}••••${token.slice(-4)}`;
};

const copyToken = async (token: string) => {
  try {
    await navigator.clipboard.writeText(token);
  } catch {
    // ignore copy errors silently
  }
};

const rowClass = (row: AdminTokenRow) => {
  if (row.status === 'expired') return 'row-expired';
  if (row.status === 'disabled') return 'row-disabled';
  return 'row-active';
};

const refreshData = () => tokenStore.refresh();

const withActionLoading = async (row: AdminTokenRow, type: 'disable' | 'regenerate', action: () => Promise<void>) => {
  actionType.value = type;
  actionLoadingId.value = row.id;
  try {
    await action();
  } finally {
    actionType.value = null;
    actionLoadingId.value = null;
  }
};

const disableToken = (row: AdminTokenRow) =>
  withActionLoading(row, 'disable', () => tokenStore.disable(row.token));

const regenerateSecureToken = (row: AdminTokenRow) =>
  withActionLoading(row, 'regenerate', () => tokenStore.regenerate(row.rfqId));

onMounted(() => {
  if (!tokens.value.length) {
    tokenStore.refresh();
  }
});
</script>

<style scoped>
.table-card {
  border-radius: 16px;
}

.tokens-table :deep(tbody tr) {
  transition: background 0.2s ease;
}

.tokens-table :deep(.row-active) {
  background-color: rgba(76, 175, 80, 0.05);
}

.tokens-table :deep(.row-expired) {
  background-color: rgba(255, 193, 7, 0.12);
}

.tokens-table :deep(.row-disabled) {
  background-color: rgba(244, 67, 54, 0.08);
}

.font-mono {
  font-family: 'Roboto Mono', monospace;
}
</style>
