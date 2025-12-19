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
          </template>

          <q-card-actions align="right">
            <q-btn flat color="primary" icon="home" label="Back to form" to="/" />
          </q-card-actions>
        </q-card>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { ApiError, getSecureLinkDetails, type SecureLinkDetailsResponse } from '../services/api';
import type { RFQ } from '@rfq-system/shared';

type SecureLinkState = 'loading' | 'valid' | 'expired' | 'invalid' | 'already-used' | 'error';

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

@media (max-width: 767px) {
  .secure-link-card__header {
    text-align: center;
  }
}
</style>
