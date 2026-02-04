<template>
  <q-page class="q-pa-md q-pa-lg-lg">
    <div class="column q-gutter-lg">
      <q-breadcrumbs class="text-grey-7">
        <q-breadcrumbs-el label="Admin" icon="dashboard" to="/admin/dashboard" />
        <q-breadcrumbs-el label="Quotations" icon="request_quote" />
      </q-breadcrumbs>

      <q-card class="q-pa-lg">
        <div class="row items-center justify-between q-mb-md">
          <div>
            <div class="text-h6">Quotations</div>
            <div class="text-caption text-grey-6">Review and manage submitted quotations.</div>
          </div>
          <q-btn outline color="primary" label="Refresh" :loading="listLoading" @click="load" />
        </div>

        <q-separator class="q-mb-md" />

        <q-table
          flat
          :rows="quotations"
          :columns="columns"
          row-key="id"
          :loading="listLoading"
          :rows-per-page-options="[10, 20, 50]"
          dense
        >
          <template #body-cell-rfq="props">
            <q-td :props="props">
              <div class="text-weight-medium">{{ props.row.rfq.company }}</div>
              <div class="text-caption text-grey-6">{{ props.row.rfq.publicId || '—' }}</div>
            </q-td>
          </template>
          <template #body-cell-status="props">
            <q-td :props="props">
              <q-badge outline :color="statusColor[props.row.status] || 'grey'">{{ props.row.status }}</q-badge>
            </q-td>
          </template>
          <template #body-cell-updatedAt="props">
            <q-td :props="props">{{ formatDate(props.row.updatedAt) }}</q-td>
          </template>
          <template #body-cell-actions="props">
            <q-td :props="props">
              <div class="row q-gutter-xs">
                <q-btn flat dense color="primary" label="View" @click="openDetails(props.row.id)" />
                <q-btn flat dense color="negative" label="Delete" @click="confirmDelete(props.row.id)" />
              </div>
            </q-td>
          </template>
          <template #no-data>
            <div class="text-center text-grey-6 q-pa-md">No quotations found.</div>
          </template>
        </q-table>
      </q-card>
    </div>

  </q-page>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import type { QTableProps } from 'quasar';
import { useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useQuasar } from 'quasar';
import { deleteQuotation } from '../../services/admin/adminApi';
import { useAdminQuotationsStore } from '../../stores/admin/adminQuotations';

const router = useRouter();
const $q = useQuasar();
const store = useAdminQuotationsStore();
const { quotations, listLoading } = storeToRefs(store);

const columns = [
  { name: 'rfq', label: 'RFQ', field: 'rfq', align: 'left' },
  { name: 'vendorName', label: 'Vendor', field: 'vendorName', align: 'left' },
  { name: 'currency', label: 'Currency', field: 'currency', align: 'left' },
  { name: 'status', label: 'Status', field: 'status', align: 'left' },
  { name: 'updatedAt', label: 'Updated', field: 'updatedAt', align: 'left' },
  { name: 'actions', label: 'Actions', field: 'actions', align: 'right' },
] as const satisfies QTableProps['columns'];

const statusColor: Record<string, string> = {
  RECEIVED: 'primary',
  REVISED: 'orange',
  APPROVED: 'positive',
  REJECTED: 'negative',
  CUSTOMER_ACCEPTED: 'teal',
};

const formatDate = (value?: string) => {
  if (!value) return '—';
  return new Date(value).toLocaleString();
};

const load = () => store.fetchQuotations();

const confirmDelete = (id: string) => {
  $q.dialog({
    title: 'Delete quotation?',
    message: 'This action cannot be undone.',
    cancel: { label: 'Cancel', color: 'primary', flat: true },
    ok: { label: 'Delete', color: 'negative' },
    persistent: true,
  }).onOk(async () => {
    try {
      await deleteQuotation(id);
      await load();
      $q.notify({ type: 'positive', message: 'Quotation deleted' });
    } catch (error) {
      $q.notify({ type: 'negative', message: error instanceof Error ? error.message : 'Failed to delete quotation.' });
    }
  });
};

const openDetails = (id: string) => {
  router.push({ name: 'admin-quotation-details', params: { id } });
};

onMounted(load);
</script>
