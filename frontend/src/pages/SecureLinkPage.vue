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
                      <q-item-label>{{ rfq.contact.name }}</q-item-label>
                    </q-item-section>
                    <q-item-section side>
                      <q-item-label>{{ rfq.contact.email }}</q-item-label>
                      <q-item-label caption v-if="rfq.contact.phone">{{ rfq.contact.phone }}</q-item-label>
                    </q-item-section>
                  </q-item>
                </q-list>
              </section>

              <section>
                <div class="text-h6 text-weight-bold q-mb-sm">Items</div>
                <q-list bordered separator>
                  <q-item v-for="(item, index) in rfq.items" :key="index">
                    <q-item-section>
                      <q-item-label class="text-weight-bold">#{{ index + 1 }} · {{ item.description }}</q-item-label>
                      <q-item-label caption>
                        Quantity: {{ item.quantity }}<span v-if="item.unit"> {{ item.unit }}</span>
                      </q-item-label>
                      <q-item-label caption v-if="item.unitPrice">
                        Unit price: {{ formatCurrency(item.unitPrice) }}
                      </q-item-label>
                    </q-item-section>
                  </q-item>
                </q-list>
              </section>

              <section v-if="rfq.notes">
                <div class="text-h6 text-weight-bold q-mb-sm">Notes</div>
                <q-markup-table dense flat bordered>
                  <tbody>
                    <tr>
                      <td>{{ rfq.notes }}</td>
                    </tr>
                  </tbody>
                </q-markup-table>
              </section>

              <section v-if="rfq.attachments?.length">
                <div class="text-h6 text-weight-bold q-mb-sm">Attachments</div>
                <q-list bordered>
                  <q-item v-for="(attachment, index) in rfq.attachments" :key="index">
                    <q-item-section>
                      <q-item-label>Attachment #{{ index + 1 }}</q-item-label>
                      <q-item-label caption>{{ attachment.slice(0, 32) }}...</q-item-label>
                    </q-item-section>
                  </q-item>
                </q-list>
              </section>

              <section v-if="link">
                <div class="text-h6 text-weight-bold q-mb-sm">Secure Link Details</div>
                <q-list bordered>
                  <q-item>
                    <q-item-section>
                      <q-item-label caption>Created</q-item-label>
                      <q-item-label>{{ formatDateTime(link.createdAt) }}</q-item-label>
                    </q-item-section>
                  </q-item>
                  <q-item>
                    <q-item-section>
                      <q-item-label caption>Expires</q-item-label>
                      <q-item-label>{{ formatDateTime(link.expires) }}</q-item-label>
                    </q-item-section>
                  </q-item>
                  <q-item>
                    <q-item-section>
                      <q-item-label caption>One-Time Access</q-item-label>
                      <q-item-label>{{ formatBoolean(link.oneTime) }}</q-item-label>
                    </q-item-section>
                  </q-item>
                  <q-item>
                    <q-item-section>
                      <q-item-label caption>First Access</q-item-label>
                      <q-item-label>{{ formatDateTime(link.firstAccessAt) }}</q-item-label>
                    </q-item-section>
                  </q-item>
                  <q-item>
                    <q-item-section>
                      <q-item-label caption>Access Count</q-item-label>
                      <q-item-label>{{ link.accessCount }}</q-item-label>
                    </q-item-section>
                  </q-item>
                </q-list>

                <div class="q-mt-lg">
                  <div class="text-subtitle1 text-weight-bold q-mb-sm">Access Logs</div>
                  <div v-if="!hasAccessLogs" class="text-body2 text-grey-7">No access requests recorded yet.</div>
                  <q-markup-table v-else flat bordered>
                    <thead>
                      <tr>
                        <th class="text-left">Time</th>
                        <th class="text-left">IP Address</th>
                        <th class="text-left">User Agent</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="(entry, index) in accessLogs" :key="index">
                        <td>{{ formatDateTime(entry.time) }}</td>
                        <td>{{ entry.ip ?? '—' }}</td>
                        <td>{{ entry.userAgent ?? '—' }}</td>
                      </tr>
                    </tbody>
                  </q-markup-table>
                </div>
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
const link = ref<SecureLinkDetailsResponse['link'] | null>(null);
const isLoading = ref(false);
const errorMessage = ref<string | null>(null);

const token = computed(() => {
  const raw = route.params.token;
  return typeof raw === 'string' && raw.trim().length > 0 ? raw.trim() : null;
});

const tokenDisplay = computed(() => link.value?.token ?? token.value ?? 'N/A');
const accessLogs = computed(() => link.value?.accessLogs ?? []);
const hasAccessLogs = computed(() => accessLogs.value.length > 0);

const fetchSecureLink = async (secureToken: string) => {
  isLoading.value = true;
  errorMessage.value = null;

  try {
    const result = await getSecureLinkDetails(secureToken);
    rfq.value = result.rfq;
    link.value = result.link;
  } catch (error) {
    rfq.value = null;
    link.value = null;
    errorMessage.value = error instanceof Error ? error.message : 'Unable to load secure link details';
  } finally {
    isLoading.value = false;
  }
};

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(value);
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

const formatBoolean = (value: boolean): string => (value ? 'Yes' : 'No');

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