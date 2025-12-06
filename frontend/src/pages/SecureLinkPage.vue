<template>
  <q-page class="q-pa-lg">
    <div class="row justify-center">
      <div class="col-12 col-lg-9">
        <q-card class="rfq-card">
          <q-inner-loading :showing="isLoading" color="primary" />

          <q-card-section class="bg-primary text-white">
            <div class="text-h5 text-weight-bold">Secure RFQ Link</div>
            <div class="text-subtitle2">Token: {{ tokenDisplay }}</div>
          </q-card-section>

          <q-separator />

          <q-card-section v-if="errorMessage">
            <q-banner class="bg-negative text-white">
              <div class="text-subtitle1">{{ errorMessage }}</div>
            </q-banner>
          </q-card-section>

          <q-card-section v-else-if="rfq">
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

              <section v-if="secureLink">
                <div class="text-h6 text-weight-bold q-mb-sm">Secure Link Details</div>
                <q-list bordered>
                  <q-item>
                    <q-item-section>
                      <q-item-label caption>Token</q-item-label>
                      <q-item-label>{{ secureLink.token }}</q-item-label>
                    </q-item-section>
                  </q-item>
                  <q-item>
                    <q-item-section>
                      <q-item-label caption>Created</q-item-label>
                      <q-item-label>{{ formatDateTime(secureLink.createdAt) }}</q-item-label>
                    </q-item-section>
                  </q-item>
                  <q-item>
                    <q-item-section>
                      <q-item-label caption>Expires</q-item-label>
                      <q-item-label>{{ formatDateTime(secureLink.expiresAt) }}</q-item-label>
                    </q-item-section>
                  </q-item>
                  <q-item>
                    <q-item-section>
                      <q-item-label caption>One-Time Access</q-item-label>
                      <q-item-label>{{ secureLink.oneTime ? 'Yes' : 'No' }}</q-item-label>
                    </q-item-section>
                  </q-item>
                  <q-item>
                    <q-item-section>
                      <q-item-label caption>Access Count</q-item-label>
                      <q-item-label>{{ secureLink.accessCount }}</q-item-label>
                    </q-item-section>
                  </q-item>
                  <q-item>
                    <q-item-section>
                      <q-item-label caption>First Access</q-item-label>
                      <q-item-label>{{ formatDateTime(secureLink.firstAccessAt) }}</q-item-label>
                    </q-item-section>
                  </q-item>
                  <q-item>
                    <q-item-section>
                      <q-item-label caption>Last Access IP</q-item-label>
                      <q-item-label>{{ secureLink.lastAccessIP ?? '—' }}</q-item-label>
                    </q-item-section>
                  </q-item>
                </q-list>
              </section>
            </div>
          </q-card-section>

          <q-card-section v-else>
            <div class="text-body1 text-grey-7">No RFQ data available.</div>
          </q-card-section>

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
import { getSecureLinkDetails, type SecureLinkDetailsResponse } from '../services/api';
import type { RFQ } from '@rfq-system/shared';

const route = useRoute();
const rfq = ref<RFQ | null>(null);
const secureLink = ref<SecureLinkDetailsResponse['secureLink'] | null>(null);
const isLoading = ref(false);
const errorMessage = ref<string | null>(null);

const token = computed(() => {
  const raw = route.params.token;
  return typeof raw === 'string' && raw.trim().length > 0 ? raw.trim() : null;
});

const tokenDisplay = computed(() => secureLink.value?.token ?? token.value ?? 'N/A');

const fetchSecureLink = async (secureToken: string) => {
  isLoading.value = true;
  errorMessage.value = null;

  try {
    const result = await getSecureLinkDetails(secureToken);
    rfq.value = result.rfq;
    secureLink.value = result.secureLink;
  } catch (error) {
    rfq.value = null;
    secureLink.value = null;
    errorMessage.value = error instanceof Error ? error.message : 'Unable to load secure link details';
  } finally {
    isLoading.value = false;
  }
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

onMounted(() => {
  if (token.value) {
    void fetchSecureLink(token.value);
  } else {
    errorMessage.value = 'Secure token missing.';
  }
});

watch(
  () => token.value,
  (next, prev) => {
    if (next && next !== prev) {
      void fetchSecureLink(next);
    }
  }
);
</script>

<style scoped lang="scss">
.rfq-card {
  max-width: 960px;
  margin: 0 auto;
}
</style>