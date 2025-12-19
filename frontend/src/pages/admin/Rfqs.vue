<template>
  <q-page class="q-pa-md q-pa-lg-lg">
    <div class="column q-gutter-lg">
      <div class="row items-center justify-between q-col-gutter-md">
        <div>
          <div class="text-h4 text-weight-bold">RFQ Management</div>
          <div class="text-subtitle2 text-grey-6">Track requests, token status, and follow up quickly</div>
        </div>
        <q-input
          v-model="search"
          dense
          outlined
          clearable
          debounce="200"
          placeholder="Search RFQs..."
          class="search-input"
          :disable="isInitialLoading"
        >
          <template #prepend>
            <q-icon name="search" />
          </template>
        </q-input>
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
          :rows="filteredRfqs"
          :columns="columns"
          row-key="id"
          :loading="loading"
          v-model:pagination="pagination"
          :rows-per-page-options="[5, 10, 20, 50]"
          class="rfq-table"
          @row-click="(_, row) => goToDetails(row)"
        >
          <template #body-cell-tokenStatus="props">
            <q-td :props="props">
              <q-badge
                :color="statusConfig[props.row.tokenStatus]?.color || 'grey'"
                outline
                class="text-uppercase"
              >
                {{ statusConfig[props.row.tokenStatus]?.label || props.row.tokenStatus }}
              </q-badge>
            </q-td>
          </template>

          <template #body-cell-actions="props">
            <q-td :props="props">
              <div class="row q-gutter-x-sm">
                <q-btn color="primary" dense unelevated label="View" @click.stop="goToDetails(props.row)" />
                <q-btn
                  color="negative"
                  dense
                  flat
                  icon="delete"
                  round
                  @click.stop="promptDelete(props.row)"
                />
              </div>
            </q-td>
          </template>

          <template #body-cell-createdAt="props">
            <q-td :props="props">{{ formatDate(props.row.createdAt) }}</q-td>
          </template>

          <template #no-data>
            <div class="text-center q-pa-md text-grey-6">No RFQs match your search.</div>
          </template>

          <template #loading>
            <q-inner-loading showing color="primary" />
          </template>
        </q-table>
      </q-card>

      <q-dialog v-model="deleteDialog">
        <q-card style="min-width: 320px">
          <q-card-section class="text-h6">Delete RFQ</q-card-section>
          <q-card-section>
            Are you sure you want to delete RFQ <strong>{{ targetRfq?.company }}</strong>? This action cannot be undone.
          </q-card-section>
          <q-card-actions align="right">
            <q-btn flat label="Cancel" v-close-popup :disable="deleting" />
            <q-btn color="negative" label="Delete" unelevated :loading="deleting" @click="handleDelete" />
          </q-card-actions>
        </q-card>
      </q-dialog>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useAdminRfqsStore } from '../../stores/admin/adminRfqs';
import type { AdminRfqSummary } from '../../services/admin/types';

const router = useRouter();
const rfqStore = useAdminRfqsStore();
const { rfqs, loading, error } = storeToRefs(rfqStore);

const columns = [
  { name: 'id', label: 'ID', field: 'id', align: 'left', sortable: true },
  { name: 'company', label: 'Company', field: 'company', align: 'left', sortable: true },
  { name: 'contact', label: 'Contact', field: 'contactName', align: 'left' },
  { name: 'createdAt', label: 'Created', field: 'createdAt', align: 'left', sortable: true },
  { name: 'tokenStatus', label: 'Token Status', field: 'tokenStatus', align: 'left' },
  { name: 'actions', label: 'Actions', field: 'actions', align: 'right' },
];

const statusConfig: Record<string, { label: string; color: string }> = {
  active: { label: 'Active', color: 'positive' },
  expired: { label: 'Expired', color: 'orange' },
  disabled: { label: 'Disabled', color: 'negative' },
};

const search = ref('');
const pagination = ref({ page: 1, rowsPerPage: 10, sortBy: 'createdAt', descending: true });

const filteredRfqs = computed(() => {
  const term = search.value.trim().toLowerCase();
  if (!term) return rfqs.value;
  return rfqs.value.filter((rfq) => {
    return [rfq.id, rfq.company, rfq.contactName, rfq.tokenStatus]
      .filter(Boolean)
      .some((field) => String(field).toLowerCase().includes(term));
  });
});

const isInitialLoading = computed(() => loading.value && rfqs.value.length === 0);

const formatDate = (value?: string) => {
  if (!value) return '—';
  return new Date(value).toLocaleString();
};

const refreshData = () => {
  rfqStore.refresh();
};

const goToDetails = (row: AdminRfqSummary) => {
  router.push({ name: 'admin-rfq-details', params: { id: row.id } });
};

const deleteDialog = ref(false);
const targetRfq = ref<AdminRfqSummary | null>(null);
const deleting = ref(false);

const promptDelete = (row: AdminRfqSummary) => {
  targetRfq.value = row;
  deleteDialog.value = true;
};

const handleDelete = async () => {
  if (!targetRfq.value) return;
  deleting.value = true;
  try {
    await rfqStore.removeRfq(targetRfq.value.id);
    deleteDialog.value = false;
  } finally {
    deleting.value = false;
  }
};

onMounted(() => {
  if (!rfqs.value.length) {
    rfqStore.refresh();
  }
});
</script>

<style scoped>
.table-card {
  border-radius: 16px;
}

.rfq-table :deep(tbody tr) {
  cursor: pointer;
  transition: background 0.2s ease;
}

.rfq-table :deep(tbody tr:hover) {
  background-color: rgba(33, 150, 243, 0.08);
}

.search-input {
  min-width: 260px;
}
</style>
