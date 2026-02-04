<template>
  <q-page class="q-pa-lg">
    <div class="row justify-center">
      <div class="col-12 col-lg-9">
        <q-card class="secure-link-card">
          <q-inner-loading :showing="isLoading" color="primary" />

          <q-card-section class="secure-link-card__header text-white">
            <div class="text-h5 text-weight-bold">Secure RFQ Link</div>
            <div class="text-subtitle2">Access the requested RFQ details through this protected link.</div>
          </q-card-section>

          <q-separator />

          <q-card-section v-if="uiState !== 'valid'">
            <q-banner class="status-banner" :class="stateContext.variantClass">
              <template #avatar>
                <q-icon :name="stateContext.icon" size="32px" />
              </template>
              <div class="text-h6 text-weight-bold">{{ stateContext.title }}</div>
              <div class="text-body2 q-mt-xs">{{ stateContext.body }}</div>
              <div class="text-caption q-mt-sm" v-if="stateContext.guidance">{{ stateContext.guidance }}</div>
            </q-banner>
          </q-card-section>

          <template v-else>
            <q-card-section v-if="linkMeta" class="q-pt-lg q-pb-md">
              <q-banner class="status-banner status-banner--info valid-banner">
                <template #avatar>
                  <q-icon name="verified_user" size="32px" />
                </template>
                <div class="text-subtitle1 text-weight-bold">Link confirmed</div>
                <div class="text-body2 q-mt-xs">
                  Expires {{ linkMeta.expires }} · {{ linkMeta.usage }}
                </div>
              </q-banner>
            </q-card-section>

            <q-card-section v-if="rfq">
              <div class="q-gutter-y-lg">
                <section>
                  <div class="text-h6 text-weight-bold q-mb-sm">Company</div>
                  <q-list bordered>
                    <q-item>
                      <q-item-section>
                        <q-item-label caption>Company</q-item-label>
                        <q-item-label>{{ rfq.company }}</q-item-label>
                      </q-item-section>
                    </q-item>
                    <q-item>
                      <q-item-section>
                        <q-item-label caption>Contact</q-item-label>
                        <q-item-label>{{ rfq.contactName }}</q-item-label>
                      </q-item-section>
                      <q-item-section side>
                        <q-item-label>{{ rfq.contactEmail }}</q-item-label>
                        <q-item-label caption v-if="rfq.contactPhone">{{ rfq.contactPhone }}</q-item-label>
                      </q-item-section>
                    </q-item>
                  </q-list>
                </section>

                <section>
                  <div class="text-h6 text-weight-bold q-mb-sm">Items</div>
                  <q-list bordered separator>
                    <q-item v-for="(item, index) in rfq.items" :key="item.id || index">
                      <q-item-section>
                        <q-item-label class="text-weight-bold">#{{ index + 1 }} · {{ item.name }}</q-item-label>
                        <q-item-label caption>Quantity: {{ item.quantity }}</q-item-label>
                        <q-item-label caption v-if="item.details">Details: {{ item.details }}</q-item-label>
                      </q-item-section>
                    </q-item>
                  </q-list>
                </section>

                <section v-if="rfq.attachments?.length">
                  <div class="text-h6 text-weight-bold q-mb-sm">Attachments</div>
                  <q-list bordered>
                    <q-item v-for="(attachment, index) in rfq.attachments" :key="attachment.id || index">
                      <q-item-section>
                        <q-item-label>Attachment #{{ index + 1 }}</q-item-label>
                        <q-item-label caption>{{ attachment.fileName }}</q-item-label>
                        <q-item-label caption>
                          <a
                            :href="attachment.fileUrl"
                            target="_blank"
                            rel="noopener"
                            class="text-primary"
                          >
                            {{ attachment.fileUrl }}
                          </a>
                        </q-item-label>
                        <q-item-label caption v-if="attachment.fileSize !== null && attachment.fileSize !== undefined">
                          Size: {{ formatFileSize(attachment.fileSize) }}
                        </q-item-label>
                      </q-item-section>
                    </q-item>
                  </q-list>
                </section>

              </div>
            </q-card-section>

            <q-card-section v-if="uiState === 'valid' && rfq">
              <div class="q-gutter-md">
                <div class="text-h6 text-weight-bold">Quotation</div>
                <div class="row items-center q-gutter-sm">
                  <q-btn color="primary" label="Create quotation" @click="quoteDialog = true" />
                  <q-btn outline color="primary" label="Email quotation" :href="mailtoHref" />
                </div>
                <q-banner dense class="bg-blue-1 text-blue-9">
                  You can create and submit your quotation by using the 'Create quotation' button above.
                  Alternatively, you may send your quotation via email using the Email button,
                  or manually email your quotation to rfqtkmr@gmail.com.
                </q-banner>
                <div class="text-caption text-grey-7">
                  <div class="text-weight-medium">TKMR Contact Details</div>
                  <div>TKMR Marine &amp; Offshore Engineering Pte. Ltd.</div>
                  <div>Email: rfqtkmr@gmail.com</div>
                  <!-- Phone: -->
                </div>
              </div>
            </q-card-section>
          </template>
        </q-card>
      </div>
    </div>

    <q-dialog v-model="quoteDialog" persistent>
      <q-card class="quote-dialog-card q-pa-md">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6">Quotation</div>
          <q-space />
          <q-btn dense flat round icon="close" @click="quoteDialog = false" />
        </q-card-section>

        <q-card-section class="q-gutter-md q-mt-md">
          <div class="q-gutter-md">
            <div class="text-subtitle1 text-weight-bold">Vendor Information</div>
            <q-separator spaced />
            <div class="row q-col-gutter-md">
              <div class="col-12 col-md-6">
                <q-input v-model="quotationForm.vendorName" label="Vendor name" dense outlined required />
              </div>
              <div class="col-12 col-md-6">
                <q-input v-model="quotationForm.contactName" label="Contact name" dense outlined />
              </div>
              <div class="col-12 col-md-6">
                <q-input v-model="quotationForm.contactEmail" label="Contact email" type="email" dense outlined />
              </div>
              <div class="col-12 col-md-6">
                <q-input v-model="quotationForm.contactPhone" label="Contact phone" dense outlined />
              </div>
            </div>
          </div>

          <div class="logo-upload">
            <div class="text-subtitle2 text-weight-medium">You can upload a Company Logo</div>
            <input
              ref="logoInput"
              type="file"
              class="hidden"
              accept="image/png, image/jpeg, image/webp"
              @change="onLogoSelected"
            />
            <q-btn
              outline
              color="primary"
              label="Upload Company Logo (optional)"
              @click="triggerLogoUpload"
            />
            <div v-if="logoPreviewUrl" class="q-mt-xs">
              <img :src="logoPreviewUrl" alt="Selected logo" class="logo-preview" />
              <div>
                <q-btn
                  flat
                  dense
                  color="grey-7"
                  label="Remove logo"
                  @click="removeLogo"
                />
              </div>
            </div>
            <div class="text-caption text-grey-7">
              This logo will appear on the generated quotation PDF.
            </div>
          </div>

          <div class="q-gutter-md">
            <div class="row items-center justify-between q-col-gutter-sm">
              <div class="col-auto text-subtitle1 text-weight-bold">Quoted Items</div>
              <div class="col-auto">
                <q-select
                  v-model="quotationForm.currency"
                  :options="currencyOptions"
                  label="Currency"
                  dense
                  outlined
                />
              </div>
            </div>
            <div class="text-caption text-grey-7">
              All prices should be entered in the selected currency.
            </div>
            <q-separator spaced />
            <q-table
              class="q-mt-sm"
              flat
              square
              hide-bottom
              :rows="rfq?.items || []"
              :columns="itemColumns"
              row-key="id"
            >
              <template #body-cell-unitPrice="props">
                <q-td :props="props">
                  <q-input
                    v-model.number="quotationForm.lines[props.rowIndex].unitPrice"
                    type="number"
                    min="0"
                    dense
                    outlined
                    step="0.01"
                    :disable="quoteSubmitLoading"
                    :placeholder="`Unit price for ${props.row.name}`"
                  />
                </q-td>
              </template>
              <template #body-cell-lineTotal="props">
                <q-td :props="props">
                  {{ formatCurrency(displayLineTotal(props.rowIndex)) }}
                </q-td>
              </template>
            </q-table>

            <div class="row justify-end text-weight-bold q-mt-md">
              <div class="col-auto">Subtotal: {{ formatCurrency(totalAmount) }}</div>
            </div>
          </div>

          <div class="q-gutter-md">
            <div class="text-subtitle1 text-weight-bold">Additional Notes</div>
            <q-separator spaced />
            <div class="row q-col-gutter-md">
              <div class="col-12">
                <q-input
                  v-model="quotationForm.notes"
                  type="textarea"
                  label="Notes (optional)"
                  outlined
                  dense
                  autogrow
                />
              </div>
            </div>
          </div>
        </q-card-section>

        <q-separator spaced />

        <q-card-actions align="right">
          <q-btn flat label="Cancel" color="primary" v-close-popup />
          <q-btn color="primary" label="Submit Quotation" :loading="quoteSubmitLoading" :disable="quoteSubmitLoading" @click="onDialogSubmit" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { ApiError, getSecureLinkDetails, submitQuotation, type SecureLinkDetailsResponse } from '../services/api';
import type { QTableProps } from 'quasar';
import { useQuasar } from 'quasar';
import type { RFQ } from '@rfq-system/shared';

type SecureLinkState = 'loading' | 'valid' | 'expired' | 'invalid' | 'already-used' | 'error';

type RfqItem = RFQ['items'][number];

type StateContext = {
  title: string;
  body: string;
  guidance?: string;
  icon: string;
  variantClass: string;
};

const route = useRoute();
const rfq = ref<RFQ | null>(null);
const secureLink = ref<SecureLinkDetailsResponse['secureLink'] | null>(null);
const isLoading = ref(false);
const uiState = ref<SecureLinkState>('loading');
const stateOverride = ref<Partial<StateContext> | null>(null);
const quoteSubmitLoading = ref(false);
const currencyOptions = ['USD', 'AUD', 'SGD', 'EUR'];
const quoteDialog = ref(false);
const $q = useQuasar();
const logoInput = ref<HTMLInputElement | null>(null);
const logoPreviewUrl = ref('');
const quotationForm = reactive({
  vendorName: '',
  currency: 'USD',
  contactName: '',
  contactEmail: '',
  contactPhone: '',
  notes: '',
  logoFile: null as File | null,
  lines: [] as Array<{ rfqItemId: string; unitPrice: number }>,
});

const triggerLogoUpload = () => {
  logoInput.value?.click();
};

const onLogoSelected = (event: Event) => {
  const target = event.target as HTMLInputElement | null;
  const file = target?.files?.[0] ?? null;
  quotationForm.logoFile = file;
};

const removeLogo = () => {
  quotationForm.logoFile = null;
  if (logoInput.value) {
    logoInput.value.value = '';
  }
};

watch(
  () => quotationForm.logoFile,
  (next, previous) => {
    if (logoPreviewUrl.value) {
      URL.revokeObjectURL(logoPreviewUrl.value);
      logoPreviewUrl.value = '';
    }
    if (next) {
      logoPreviewUrl.value = URL.createObjectURL(next);
    }
    if (!next && previous && logoInput.value) {
      logoInput.value.value = '';
    }
  }
);

onUnmounted(() => {
  if (logoPreviewUrl.value) {
    URL.revokeObjectURL(logoPreviewUrl.value);
  }
});

const STATE_CONTEXT: Record<SecureLinkState, StateContext> = {
  loading: {
    title: 'Validating secure link…',
    body: 'Please wait while we confirm this secure RFQ link.',
    icon: 'hourglass_top',
    guidance: undefined,
    variantClass: 'status-banner--info',
  },
  valid: {
    title: 'Link confirmed',
    body: 'You can now review the RFQ details.',
    guidance: undefined,
    icon: 'verified_user',
    variantClass: 'status-banner--success',
  },
  expired: {
    title: 'This link has expired',
    body: 'The access window for this secure link has closed.',
    guidance: 'Please contact the requester for a new link if you still need access.',
    icon: 'schedule',
    variantClass: 'status-banner--warning',
  },
  invalid: {
    title: 'Invalid secure link',
    body: 'The provided link is malformed or missing required information.',
    guidance: 'Double-check the URL or ask the requester to resend a valid link.',
    icon: 'error_outline',
    variantClass: 'status-banner--danger',
  },
  'already-used': {
    title: 'This link has already been used',
    body: 'One-time or disabled links cannot be opened more than once.',
    guidance: 'Please contact the requester for a fresh secure link.',
    icon: 'lock',
    variantClass: 'status-banner--warning',
  },
  error: {
    title: 'Unable to load secure link',
    body: 'An unexpected issue prevented us from validating this link.',
    guidance: 'Try again later or let the requester know there was an issue.',
    icon: 'warning_amber',
    variantClass: 'status-banner--danger',
  },
};

const applyState = (state: SecureLinkState, override?: Partial<StateContext>) => {
  uiState.value = state;
  stateOverride.value = override ?? null;
};

const stateContext = computed(() => {
  const base = STATE_CONTEXT[uiState.value];
  return stateOverride.value ? { ...base, ...stateOverride.value } : base;
});

const token = computed(() => {
  const raw = route.params.token;
  return typeof raw === 'string' && raw.trim().length > 0 ? raw.trim() : null;
});

const fetchSecureLink = async (secureToken: string) => {
  isLoading.value = true;
  applyState('loading');

  try {
    const result = await getSecureLinkDetails(secureToken);
    rfq.value = result.rfq;
    secureLink.value = result.secureLink;
    applyState('valid');
  } catch (error) {
    rfq.value = null;
    secureLink.value = null;
    handleSecureLinkError(error);
  } finally {
    isLoading.value = false;
  }
};

const handleSecureLinkError = (error: unknown) => {
  if (error instanceof ApiError) {
    switch (error.status) {
      case 400:
        applyState('invalid', {
          title: 'Invalid secure link token',
          body: 'We could not validate this link because the token is invalid.',
        });
        return;
      case 409:
        applyState('invalid', {
          title: 'TKMR contact not configured',
          body: 'This secure link is not ready yet because TKMR contact details are missing.',
          guidance: 'Please contact TKMR to configure the contact details and re-open the link.',
          icon: 'warning_amber',
          variantClass: 'status-banner--warning',
        });
        return;
      case 404:
        applyState('invalid', {
          title: 'Secure link not found',
          body: 'This link does not match any RFQ we can share anymore.',
        });
        return;
      case 410:
        applyState('expired');
        return;
      case 401:
      case 403:
        applyState('already-used', {
          body: 'This link has already been opened or is disabled.',
        });
        return;
      default:
        applyState('error');
        return;
    }
  }

  applyState('error');
};

const formatDateTime = (value: string | null | undefined): string => {
  if (!value) {
    return '—';
  }

  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value));
  } catch (error) {
    return value;
  }
};

const formatFileSize = (value: number | null | undefined): string => {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '—';
  }

  if (value < 1024) {
    return `${value} B`;
  }

  const units = ['KB', 'MB', 'GB'];
  let size = value / 1024;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
};

const linkMeta = computed(() => {
  if (!secureLink.value) {
    return null;
  }

  return {
    expires: formatDateTime(secureLink.value.expiresAt),
    usage: secureLink.value.oneTime ? 'One-time access link' : 'Multi-use access link',
  };
});

const itemColumns: QTableProps['columns'] = [
  { name: 'name', label: 'Item', field: 'name', align: 'left' },
  { name: 'quantity', label: 'Qty', field: 'quantity', align: 'right' },
  { name: 'unitPrice', label: 'Unit Price', field: 'unitPrice', align: 'right' },
  { name: 'lineTotal', label: 'Line Total', field: 'lineTotal', align: 'right' },
];

const syncLinesWithItems = () => {
  if (!rfq.value) return;
  quotationForm.lines = rfq.value.items.map((item: RfqItem) => ({ rfqItemId: item.id, unitPrice: quotationForm.lines.find((l) => l.rfqItemId === item.id)?.unitPrice ?? 0 }));
};

const displayLineTotal = (index: number): number => {
  if (!rfq.value) return 0;
  const item = rfq.value.items[index];
  const line = quotationForm.lines[index];
  if (!item || !line) return 0;
  return item.quantity * (line.unitPrice || 0);
};

const totalAmount = computed(() => {
  if (!rfq.value) return 0;
  return rfq.value.items.reduce((sum: number, _item: RfqItem, idx: number) => sum + displayLineTotal(idx), 0);
});

const formatCurrency = (value: number) => {
  const currency = quotationForm.currency || 'USD';
  const formatter = new Intl.NumberFormat(undefined, { style: 'currency', currency, minimumFractionDigits: 2 });
  return formatter.format(Number.isFinite(value) ? value : 0);
};

const mailtoHref = computed(() => {
  if (!rfq.value) return '#';
  const rfqRef = rfq.value.publicId || 'RFQ Reference unavailable';
  const subject = encodeURIComponent(`Quotation for ${rfqRef}`);

  const bodyLines = [] as string[];
  const vendorName = quotationForm.vendorName?.trim();
  if (vendorName) {
    bodyLines.push(`Vendor: ${vendorName}`);
  }
  bodyLines.push(`RFQ Reference: ${rfqRef}`);
  bodyLines.push(`Company: ${rfq.value?.company || ''}`);
  bodyLines.push('Details: Please find our quotation attached.');

  const body = encodeURIComponent(bodyLines.join('\n'));
  return `mailto:rfqtkmr@gmail.com?subject=${subject}&body=${body}`;
});

watch(
  () => rfq.value,
  (next) => {
    if (next) {
      syncLinesWithItems();
    }
  }
);

const validateForm = () => {
  if (!quotationForm.vendorName.trim()) {
    $q.notify({ type: 'negative', message: 'Vendor name is required.' });
    return false;
  }
  const hasMissing = quotationForm.lines.some((line) => !line || Number.isNaN(line.unitPrice));
  if (hasMissing) {
    $q.notify({ type: 'negative', message: 'Please provide unit prices for all items.' });
    return false;
  }
  return true;
};

const onDialogSubmit = async () => {
  if (!token.value || !rfq.value) return;
  if (!validateForm()) {
    return;
  }
  quoteSubmitLoading.value = true;
  try {
    const payload = {
      vendorName: quotationForm.vendorName.trim(),
      method: 'FORM' as const,
      currency: quotationForm.currency,
      contactName: quotationForm.contactName || undefined,
      contactEmail: quotationForm.contactEmail || undefined,
      contactPhone: quotationForm.contactPhone || undefined,
      notes: quotationForm.notes || undefined,
      lines: quotationForm.lines.map((line) => ({ rfqItemId: line.rfqItemId, unitPrice: Number(line.unitPrice) || 0 })),
    };

    const response = await submitQuotation(token.value, payload, quotationForm.logoFile);
    quoteDialog.value = false;
    const link = response?.quotation?.quotationLink;
    $q.notify({
      type: 'positive',
      message: 'Quotation submitted successfully',
      actions: link ? [{ label: 'Open', color: 'white', handler: () => window.open(link, '_blank') }] : undefined,
    });
  } catch (error) {
    const message = error instanceof ApiError ? error.message : 'Failed to submit quotation.';
    $q.notify({ type: 'negative', message });
  } finally {
    quoteSubmitLoading.value = false;
  }
};

onMounted(() => {
  if (token.value) {
    void fetchSecureLink(token.value);
  } else {
    applyState('invalid', {
      title: 'Secure token missing',
      body: 'This page requires a secure token to load the RFQ details.',
    });
  }
});

watch(
  () => token.value,
  (next, prev) => {
    if (next && next !== prev) {
      void fetchSecureLink(next);
      return;
    }

    if (!next) {
      rfq.value = null;
      secureLink.value = null;
      applyState('invalid', {
        title: 'Secure token missing',
        body: 'This page requires a secure token to load the RFQ details.',
      });
    }
  }
);
</script>

<style scoped lang="scss">
.secure-link-card {
  max-width: 960px;
  margin: 0 auto;
  overflow: hidden;
}

.secure-link-card__header {
  background: linear-gradient(120deg, #1d4ed8, #0ea5e9);
}

.logo-preview {
  max-height: 60px;
  border: 1px solid rgba(148, 163, 184, 0.6);
  border-radius: 8px;
  padding: 4px;
}

.logo-upload {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border: 1px dashed rgba(148, 163, 184, 0.7);
  border-radius: 12px;
  background: rgba(219, 234, 254, 0.35);
}

.status-banner {
  border-radius: 16px;
  border: 1px solid transparent;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);
}

.status-banner--info {
  background: #e0f2fe;
  border-color: #7dd3fc;
  color: #075985;
}

.status-banner--warning {
  background: #fff7ed;
  border-color: #fdba74;
  color: #9a3412;
}

.status-banner--danger {
  background: #fee2e2;
  border-color: #f87171;
  color: #7f1d1d;
}

.status-banner--success {
  background: #dcfce7;
  border-color: #86efac;
  color: #166534;
}

.valid-banner {
  margin-bottom: 12px;
}

.quote-dialog-card {
  max-width: 720px;
  width: 100%;
}

@media (max-width: 599px) {
  .quote-dialog-card {
    max-width: 100vw;
    width: 100vw;
    border-radius: 0;
  }

  .quote-dialog-card .q-card__section,
  .quote-dialog-card .q-card__actions {
    padding-left: 16px;
    padding-right: 16px;
  }
}

@media (max-width: 767px) {
  .secure-link-card__header {
    text-align: center;
  }
}
</style>
