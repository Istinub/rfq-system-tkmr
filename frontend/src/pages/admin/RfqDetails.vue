<template>
  <q-page class="q-pa-md q-pa-lg-lg">
    <div class="column q-gutter-lg">
      <q-breadcrumbs class="text-grey-7">
        <q-breadcrumbs-el label="Admin" icon="dashboard" to="/admin/dashboard" />
        <q-breadcrumbs-el label="RFQs" icon="assignment" to="/admin/rfqs" />
        <q-breadcrumbs-el :label="`RFQ #${routeId}`" icon="receipt" />
      </q-breadcrumbs>

      <div v-if="detailLoading" class="column items-center justify-center q-my-xl">
        <q-spinner size="64px" color="primary" />
        <div class="text-subtitle1 text-grey-7 q-mt-md">Loading RFQ details…</div>
      </div>

      <q-card v-else-if="detailError" class="q-pa-lg text-center">
        <div class="text-h6 q-mb-sm">Unable to load RFQ</div>
        <div class="text-grey-6 q-mb-md">{{ detailError }}</div>
        <q-btn color="primary" label="Retry" @click="loadDetails" />
      </q-card>

      <q-card v-else-if="!rfq" class="q-pa-lg text-center">
        <div class="text-h6 q-mb-sm">RFQ not found</div>
        <div class="text-grey-6 q-mb-md">The requested RFQ could not be located.</div>
        <q-btn color="primary" label="Back to RFQs" to="/admin/rfqs" />
      </q-card>

      <template v-else>
        <div class="row q-col-gutter-md">
          <div class="col-12 col-md-6">
            <q-card class="detail-card">
              <q-card-section>
                <div class="text-subtitle2 text-grey-6">Company</div>
                <div class="text-h6">{{ rfq.company }}</div>
              </q-card-section>
              <q-separator />
              <q-card-section class="row">
                <div class="col-12 col-sm-6">
                  <div class="text-caption text-grey-6">Contact</div>
                  <div class="text-body1">{{ rfq.contactName || '—' }}</div>
                  <div class="text-caption text-grey-6">{{ rfq.contactEmail || '—' }}</div>
                </div>
                <div class="col-12 col-sm-6">
                  <div class="text-caption text-grey-6">Created</div>
                  <div class="text-body1">{{ formatDate(rfq.createdAt) }}</div>
                  <div class="text-caption text-grey-5">{{ rfq.contactPhone || 'No phone provided' }}</div>
                </div>
              </q-card-section>
            </q-card>
          </div>

          <div class="col-12 col-md-6" v-if="secureLink">
            <q-card class="detail-card link-card" :class="linkStatusClass">
              <q-card-section class="row items-center justify-between">
                <div>
                  <div class="text-subtitle2 text-grey-5">Secure Link</div>
                  <div class="text-h6 font-mono">{{ maskedToken }}</div>
                </div>
                <q-badge :color="statusConfig[secureLink.status]?.color" outline>
                  {{ statusConfig[secureLink.status]?.label || secureLink.status }}
                </q-badge>
              </q-card-section>
              <q-separator />
              <q-card-section class="row q-col-gutter-md">
                <div class="col-6">
                  <div class="text-caption text-grey-6">Created</div>
                  <div class="text-body2">{{ formatDate(secureLink.createdAt) }}</div>
                </div>
                <div class="col-6">
                  <div class="text-caption text-grey-6">Expires</div>
                  <div class="text-body2">{{ formatDate(secureLink.expiresAt) }}</div>
                </div>
                <div class="col-6">
                  <div class="text-caption text-grey-6">Usage Count</div>
                  <div class="text-body2">{{ secureLink.accessCount }}</div>
                </div>
                <div class="col-6">
                  <div class="text-caption text-grey-6">Last Access</div>
                  <div class="text-body2">{{ secureLink.lastAccessAt ? formatDate(secureLink.lastAccessAt) : '—' }}</div>
                </div>
              </q-card-section>
              <q-card-actions align="left" class="q-gutter-sm">
                <q-btn
                  color="primary"
                  icon="open_in_new"
                  label="Open Secure Link"
                  :disable="!canOpenSecureLink || !secureLinkUrl"
                  @click="openSecureLink"
                >
                  <q-tooltip v-if="(!canOpenSecureLink || !secureLinkUrl) && openDisabledReason">
                    {{ openDisabledReason }}
                  </q-tooltip>
                </q-btn>
                <q-btn
                  flat
                  color="primary"
                  icon="content_copy"
                  label="Copy Secure Link"
                  :disable="!secureLinkUrl"
                  @click="copySecureLink"
                />
              </q-card-actions>
              <q-card-actions align="right">
                <q-btn flat color="warning" label="Disable" :loading="actionLoading" @click="handleDisable" />
                <q-btn color="primary" label="Regenerate" :loading="actionLoading" @click="handleRegenerate" />
              </q-card-actions>
            </q-card>
          </div>
          <div class="col-12 col-md-6" v-else>
            <q-card class="detail-card">
              <q-card-section>
                <div class="text-subtitle2 text-grey-6">Secure Link</div>
                <div class="text-grey-6 q-mb-md">No secure link metadata available.</div>
                <div class="text-body2 text-grey-7 q-mb-lg">
                  Generate a secure, shareable link so vendors can review this RFQ.
                </div>
                <q-btn
                  color="primary"
                  label="Generate Secure Link"
                  :loading="generateLoading"
                  :disable="generateLoading"
                  @click="handleGenerateSecureLink"
                />
              </q-card-section>
            </q-card>
          </div>
        </div>

        <q-card class="detail-card">
          <q-card-section>
            <div class="text-h6">Requested Items</div>
            <div class="text-caption text-grey-6">Line items provided by the requester</div>
          </q-card-section>
          <q-separator />
          <q-card-section>
            <q-table
              flat
              :rows="rfq.items"
              :columns="itemColumns"
              row-key="id"
              :rows-per-page-options="[5, 10, 20]"
              dense
            >
              <template #no-data>
                <div class="text-center text-grey-6 q-pa-md">No items provided.</div>
              </template>
            </q-table>
          </q-card-section>
        </q-card>

        <div class="row q-col-gutter-md">
          <div class="col-12 col-md-6">
            <q-card class="detail-card">
              <q-card-section>
                <div class="text-h6">Notes</div>
                <div class="text-caption text-grey-6">Additional context from the requester</div>
              </q-card-section>
              <q-separator />
              <q-card-section>
                <div v-if="rfq.notes" class="text-body2">{{ rfq.notes }}</div>
                <div v-else class="text-grey-6">No notes provided.</div>
              </q-card-section>
            </q-card>
          </div>

          <div class="col-12 col-md-6">
            <q-card class="detail-card">
              <q-card-section>
                <div class="text-h6">Attachments</div>
                <div class="text-caption text-grey-6">Supporting documents</div>
              </q-card-section>
              <q-separator />
              <q-card-section>
                <q-list bordered separator v-if="rfq.attachments.length">
                  <q-item v-for="attachment in rfq.attachments" :key="attachment.id">
                    <q-item-section>
                      <q-item-label>{{ attachment.fileName }}</q-item-label>
                      <q-item-label caption>{{ attachment.fileUrl ? 'Hosted file' : 'Inline data' }}</q-item-label>
                    </q-item-section>
                    <q-item-section side>
                      <q-btn flat dense icon="open_in_new" @click="openAttachment(attachment)" />
                    </q-item-section>
                  </q-item>
                </q-list>
                <div v-else class="text-grey-6">No attachments uploaded.</div>
              </q-card-section>
            </q-card>
          </div>
        </div>
      </template>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { storeToRefs } from 'pinia';
import { Notify } from 'quasar';
import { useAdminRfqsStore } from '../../stores/admin/adminRfqs';
import type { AdminAttachment } from '../../services/admin/types';

const route = useRoute();
const routeId = route.params.id as string;
const rfqStore = useAdminRfqsStore();
const { currentRfq, detailLoading, detailError } = storeToRefs(rfqStore);

const rfq = computed(() => currentRfq.value);
const secureLink = computed(() => currentRfq.value?.secureLink ?? null);

const getAppOrigin = () => {
  if (typeof window === 'undefined' || !window.location) {
    return '';
  }
  return window.location.origin;
};

const secureLinkUrl = computed(() => {
  if (!secureLink.value) {
    return null;
  }
  const origin = getAppOrigin();
  return `${origin || ''}/#/rfq/${secureLink.value.token}`;
});

const canOpenSecureLink = computed(() => Boolean(secureLinkUrl.value) && secureLink.value?.status === 'active');

const openDisabledReason = computed(() => {
  if (!secureLink.value) {
    return 'Secure link is not available for this RFQ yet.';
  }
  if (secureLink.value.status === 'expired') {
    return 'This secure link has expired and cannot be opened.';
  }
  if (secureLink.value.status === 'disabled') {
    return 'This secure link has been disabled.';
  }
  return '';
});

const statusConfig: Record<string, { label: string; color: string; text?: string }> = {
  active: { label: 'Active', color: 'positive' },
  expired: { label: 'Expired', color: 'warning' },
  disabled: { label: 'Disabled', color: 'negative' },
};

const itemColumns: Array<{
  name: string;
  label: string;
  field: string;
  align: 'left' | 'center' | 'right';
}> = [
  { name: 'name', label: 'Item', field: 'name', align: 'left' },
  { name: 'quantity', label: 'Qty', field: 'quantity', align: 'center' },
  { name: 'details', label: 'Details', field: 'details', align: 'left' },
];

const formatDate = (value?: string) => {
  if (!value) return '—';
  return new Date(value).toLocaleString();
};

const maskedToken = computed(() => {
  const token = secureLink.value?.token || '';
  if (token.length <= 8) return `${token.slice(0, 3)}••${token.slice(-2)}`;
  return `${token.slice(0, 4)}••••${token.slice(-4)}`;
});

const linkStatusClass = computed(() => {
  const status = secureLink.value?.status;
  if (status === 'expired') return 'link-expired';
  if (status === 'disabled') return 'link-disabled';
  return '';
});

const actionLoading = ref(false);
const generateLoading = ref(false);

const openSecureLink = () => {
  if (!canOpenSecureLink.value || !secureLinkUrl.value) {
    return;
  }

  if (typeof window !== 'undefined') {
    window.open(secureLinkUrl.value, '_blank', 'noopener');
  }
};

const copySecureLink = async () => {
  if (!secureLinkUrl.value) {
    return;
  }

  try {
    if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
      throw new Error('Clipboard unavailable');
    }
    await navigator.clipboard.writeText(secureLinkUrl.value);
    Notify.create({ type: 'positive', message: 'Secure link copied to clipboard.' });
  } catch (error) {
    Notify.create({ type: 'negative', message: 'Unable to copy secure link.' });
  }
};

const handleRegenerate = async () => {
  if (!rfq.value) return;
  actionLoading.value = true;
  try {
    await rfqStore.regenerateSecureLink(rfq.value.id);
    await loadDetails();
  } finally {
    actionLoading.value = false;
  }
};

const handleDisable = async () => {
  if (!secureLink.value) return;
  actionLoading.value = true;
  try {
    await rfqStore.disableSecureLink(secureLink.value.token);
    await loadDetails();
  } finally {
    actionLoading.value = false;
  }
};

const handleGenerateSecureLink = async () => {
  if (!rfq.value) return;
  generateLoading.value = true;
  try {
    await rfqStore.generateSecureLink(rfq.value.id);
    await loadDetails();
  } catch (error) {
    // store handles notifications via handleAdminError
  } finally {
    generateLoading.value = false;
  }
};

const openAttachment = (attachment: AdminAttachment) => {
  if (attachment.fileUrl) {
    window.open(attachment.fileUrl, '_blank');
    return;
  }

  // Inline/base64 payloads could be handled here if backend supports it.
  // TODO: Render inline preview when Base64 payloads are available
};

const loadDetails = async () => {
  await rfqStore.fetchRfqById(routeId);
};

onMounted(() => {
  loadDetails();
});
</script>

<style scoped>
.detail-card {
  border-radius: 16px;
}

.link-card.link-expired {
  border: 1px solid #f59e0b;
  background: rgba(245, 158, 11, 0.08);
}

.link-card.link-disabled {
  border: 1px solid #f87171;
  background: rgba(248, 113, 113, 0.08);
}

.font-mono {
  font-family: 'Roboto Mono', monospace;
}
</style>
