<template>
  <q-page class="q-pa-md q-pa-lg-lg">
    <div class="column q-gutter-lg">
      <q-breadcrumbs class="text-grey-7">
        <q-breadcrumbs-el label="Admin" icon="dashboard" to="/admin/dashboard" />
        <q-breadcrumbs-el label="Quotations" icon="request_quote" to="/admin/quotations" />
        <q-breadcrumbs-el :label="quotation ? quotation.rfq.publicId || quotation.rfq.company : 'Quotation'" icon="description" />
      </q-breadcrumbs>

      <q-card v-if="detailLoading" class="q-pa-lg text-center">
        <q-spinner size="48px" color="primary" />
        <div class="text-subtitle2 text-grey-7 q-mt-md">Loading quotation…</div>
      </q-card>

      <q-card v-else-if="!quotation" class="q-pa-lg text-center">
        <div class="text-h6 q-mb-sm">Quotation not found</div>
        <div class="text-grey-6 q-mb-md">The requested quotation could not be located.</div>
        <q-btn color="primary" label="Back to quotations" to="/admin/quotations" />
      </q-card>

      <template v-else>
        <q-card class="detail-card">
          <q-card-section>
            <div class="header-wrap">
              <div class="header-left">
                <div class="text-h6">Quotation</div>
                <div class="text-caption text-grey-6">
                  RFQ: {{ quotation.rfq.publicId || '—' }} · Company: {{ quotation.rfq.company }}
                </div>
              </div>
              <div class="header-right">
                <q-badge outline :color="statusConfig[quotation.status]?.color || 'grey'">
                  {{ statusConfig[quotation.status]?.label || quotation.status }}
                </q-badge>
                <q-btn dense flat round no-caps color="primary" icon="open_in_new" :disable="!pdfUrl" :href="pdfUrl" target="_blank">
                  <q-tooltip>Open in new tab</q-tooltip>
                </q-btn>
                <q-btn v-if="quotation?.status === 'RECEIVED'" size="md" dense no-caps unelevated color="positive" icon="check_circle" label="Approve" @click="confirmApprove" />
                <q-btn v-if="quotation?.status === 'RECEIVED'" size="md" dense no-caps outline color="negative" icon="cancel" label="Reject" @click="confirmReject" />
                <q-btn v-if="quotation?.status === 'APPROVED'" size="md" dense no-caps outline color="teal" icon="verified" label="Customer Accepted" @click="confirmCustomerAccepted" />
                <q-btn-dropdown dense no-caps flat icon="more_vert">
                  <q-list padding style="min-width: 180px">
                    <q-item clickable v-close-popup @click="confirmDelete">
                      <q-item-section class="text-negative">Delete quotation</q-item-section>
                    </q-item>
                  </q-list>
                </q-btn-dropdown>
              </div>
            </div>
          </q-card-section>

          <q-separator />

          <q-card-section class="q-pa-md">
            <q-banner v-if="!pdfUrl" dense class="bg-grey-2 text-grey-8">
              PDF preview is not available for this quotation.
            </q-banner>
            <div v-else class="pdf-frame">
              <iframe :src="pdfUrl" class="pdf-iframe" />
            </div>
          </q-card-section>
        </q-card>
      </template>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useQuasar } from 'quasar';
import { useAdminQuotationsStore } from '../../stores/admin/adminQuotations';
import type { AdminQuotationStatus } from '../../services/admin/types';
import { deleteQuotation } from '../../services/admin/adminApi';
import { adminUpdateQuotationStatus } from '../../services/api';

const route = useRoute();
const router = useRouter();
const quotationId = route.params.id as string;
const store = useAdminQuotationsStore();
const { currentQuotation, detailLoading } = storeToRefs(store);
const $q = useQuasar();

const quotation = computed(() => currentQuotation.value);
const statusConfig: Record<AdminQuotationStatus, { label: string; color: string }> = {
  RECEIVED: { label: 'RECEIVED', color: 'primary' },
  REVISED: { label: 'REVISED', color: 'orange' },
  APPROVED: { label: 'APPROVED', color: 'positive' },
  REJECTED: { label: 'REJECTED', color: 'negative' },
  CUSTOMER_ACCEPTED: { label: 'CUSTOMER ACCEPTED', color: 'teal' },
};

const pdfUrl = computed(() => {
  const link = quotation.value?.quotationLink?.trim();
  if (!link || link === 'MANUAL_EMAIL') return '';
  const match = link.match(/\/file\/d\/([^/]+)\/view/);
  if (match) {
    return `https://drive.google.com/file/d/${match[1]}/preview`;
  }
  return link;
});

const load = () => store.fetchQuotation(quotationId);

const handleStatusAction = async (
  status: 'APPROVED' | 'REJECTED' | 'CUSTOMER_ACCEPTED',
  successMessage: string,
  reason?: string
) => {
  if (!quotation.value) return;
  try {
    const response = await adminUpdateQuotationStatus(quotationId, status, reason);
    if (response.emailedWarning?.message) {
      $q.notify({ type: 'warning', message: response.emailedWarning.message });
    }
    if (response.quotation) {
      store.currentQuotation = response.quotation;
    } else {
      await store.fetchQuotation(quotationId);
    }
    $q.notify({ type: 'positive', message: successMessage });
  } catch (error) {
    $q.notify({ type: 'negative', message: error instanceof Error ? error.message : 'Action failed.' });
  }
};

const confirmApprove = () => {
  $q.dialog({
    title: 'Approve quotation?',
    message: 'This will email the customer contact.',
    cancel: { label: 'Cancel', color: 'primary', flat: true },
    ok: { label: 'Approve', color: 'primary' },
    persistent: true,
  }).onOk(() => handleStatusAction('APPROVED', 'Quotation approved'));
};

const confirmReject = () => {
  $q.dialog({
    title: 'Reject quotation?',
    message: 'Please notify vendor manually.',
    prompt: {
      model: '',
      type: 'textarea',
      label: 'Reason (optional)',
      isValid: () => true,
    },
    cancel: { label: 'Cancel', color: 'primary', flat: true },
    ok: { label: 'Reject', color: 'negative' },
    persistent: true,
  }).onOk((reason) => {
    const trimmed = typeof reason === 'string' ? reason.trim() : '';
    handleStatusAction('REJECTED', 'Quotation rejected', trimmed || undefined);
  });
};

const confirmCustomerAccepted = () => {
  $q.dialog({
    title: 'Mark customer accepted?',
    message: 'Are you sure? You need to manually send this email to the Customer.',
    cancel: { label: 'Cancel', color: 'primary', flat: true },
    ok: { label: 'Confirm', color: 'positive' },
    persistent: true,
  }).onOk(() => handleStatusAction('CUSTOMER_ACCEPTED', 'Marked as customer accepted'));
};

const confirmDelete = () => {
  $q.dialog({
    title: 'Delete quotation?',
    message: 'This action cannot be undone.',
    cancel: { label: 'Cancel', color: 'primary', flat: true },
    ok: { label: 'Delete', color: 'negative' },
    persistent: true,
  }).onOk(async () => {
    try {
      await deleteQuotation(quotationId);
      $q.notify({ type: 'positive', message: 'Quotation deleted' });
      router.push('/admin/quotations');
    } catch (error) {
      $q.notify({ type: 'negative', message: error instanceof Error ? error.message : 'Failed to delete quotation.' });
    }
  });
};

onMounted(load);
</script>

<style scoped>
.detail-card {
  width: 100%;
}

.header-wrap {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.header-left {
  min-width: 260px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

@media (min-width: 1024px) {
  .header-right {
    flex-wrap: nowrap;
  }
}

.pdf-frame {
  background: #f7f7f7;
  border: 1px solid #e0e0e0;
  border-radius: 12px;
  overflow: hidden;
  height: calc(100vh - 260px);
  min-height: 640px;
}

.pdf-iframe {
  width: 100%;
  height: 100%;
  border: 0;
  display: block;
}
</style>
