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
import { getRFQByToken } from '../services/api';
import type { RFQ } from '@rfq-system/shared';

const route = useRoute();
const rfq = ref<RFQ | null>(null);
const isLoading = ref(false);
const errorMessage = ref<string | null>(null);

const token = computed(() => {
  const raw = route.params.token;
  return typeof raw === 'string' && raw.trim().length > 0 ? raw.trim() : null;
});

const tokenDisplay = computed(() => token.value ?? 'N/A');

const fetchRFQ = async (secureToken: string) => {
  isLoading.value = true;
  errorMessage.value = null;

  try {
    rfq.value = await getRFQByToken(secureToken);
  } catch (error) {
    rfq.value = null;
    errorMessage.value = error instanceof Error ? error.message : 'Unable to load RFQ details';
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

onMounted(() => {
  if (token.value) {
    void fetchRFQ(token.value);
  } else {
    errorMessage.value = 'Secure token missing.';
  }
});

watch(
  () => token.value,
  (next, prev) => {
    if (next && next !== prev) {
      void fetchRFQ(next);
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