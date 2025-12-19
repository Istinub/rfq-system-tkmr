<template>
  <q-page class="q-pa-md q-pa-lg-lg">
    <div class="column q-gutter-lg">
      <div class="row items-center justify-between q-col-gutter-md">
        <div>
          <div class="text-h4 text-weight-bold">Admin Dashboard</div>
          <div class="text-subtitle2 text-grey-6">At-a-glance visibility into RFQ and token activity</div>
        </div>
        <div class="text-right">
          <div class="text-caption text-grey-6">Last updated: {{ lastUpdatedDisplay }}</div>
          <q-btn
            flat
            dense
            icon="refresh"
            label="Refresh"
            class="q-mt-xs"
            :loading="loading"
            @click="handleRefresh"
          />
        </div>
      </div>

      <q-banner v-if="error" class="bg-negative text-white" rounded>
        <div>{{ error }}</div>
        <template #action>
          <q-btn color="white" flat dense label="Retry" @click="handleRefresh" />
        </template>
      </q-banner>

      <div v-if="isInitialLoading" class="dashboard-loading column items-center justify-center text-grey-7">
        <q-spinner color="primary" size="64px" />
        <div class="text-subtitle1 q-mt-md">Loading dashboard…</div>
      </div>

      <template v-else>
        <div class="row q-col-gutter-md">
          <div class="col-12 col-sm-6 col-md-3" v-for="card in statCards" :key="card.key">
            <q-card class="dashboard-card">
              <q-card-section>
                <div class="text-caption text-uppercase text-grey-6">{{ card.label }}</div>
                <div class="text-h4 text-weight-bold q-mt-sm">{{ card.value }}</div>
                <div class="text-caption text-grey-5 q-mt-xs">{{ card.caption }}</div>
              </q-card-section>
            </q-card>
          </div>
        </div>

        <div class="row q-col-gutter-md">
          <div class="col-12 col-md-7">
            <q-card class="dashboard-card full-height">
              <q-card-section class="row items-center justify-between">
                <div>
                  <div class="text-h6">RFQs per Month</div>
                  <div class="text-caption text-grey-6">Rolling submission trend</div>
                </div>
              </q-card-section>
              <q-separator />
              <q-card-section>
                <q-markup-table flat dense v-if="rfqsPerMonth.length">
                  <thead>
                    <tr>
                      <th>Month</th>
                      <th class="text-right">RFQs</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="item in rfqsPerMonth" :key="item.month">
                      <td>{{ item.month }}</td>
                      <td class="text-right">{{ formatNumber(item.count) }}</td>
                    </tr>
                  </tbody>
                </q-markup-table>
                <div v-else class="text-grey-6 text-center q-py-md">No RFQ data yet.</div>
              </q-card-section>
            </q-card>
          </div>

          <div class="col-12 col-md-5">
            <q-card class="dashboard-card full-height">
              <q-card-section class="row items-center justify-between">
                <div>
                  <div class="text-h6">Token Usage Breakdown</div>
                  <div class="text-caption text-grey-6">Share by status</div>
                </div>
              </q-card-section>
              <q-separator />
              <q-card-section>
                <q-list separator v-if="tokenUsageDisplay.length">
                  <q-item v-for="item in tokenUsageDisplay" :key="item.label">
                    <q-item-section>
                      <q-item-label class="text-weight-medium">{{ item.label }}</q-item-label>
                      <q-item-label caption>{{ formatNumber(item.value) }}</q-item-label>
                    </q-item-section>
                    <q-item-section side>
                      <div class="text-weight-bold">{{ item.percent }}%</div>
                    </q-item-section>
                  </q-item>
                </q-list>
                <div v-else class="text-grey-6 text-center q-py-md">No token activity recorded.</div>
              </q-card-section>
            </q-card>
          </div>
        </div>
      </template>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { storeToRefs } from 'pinia';
import { useAdminStatsStore } from '../../stores/admin/adminStats';

const statsStore = useAdminStatsStore();
const { stats, loading, error, lastUpdated } = storeToRefs(statsStore);

const formatNumber = (value?: number | null) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value.toLocaleString();
  }
  return '—';
};

const statCards = computed(() => {
  const data = stats.value;
  return [
    {
      key: 'rfqs',
      label: 'Total RFQs',
      value: formatNumber(data?.totalRfqs),
      caption: 'All time',
    },
    {
      key: 'active',
      label: 'Active secure links',
      value: formatNumber(data?.activeTokens),
      caption: 'Currently live',
    },
    {
      key: 'expired',
      label: 'Expired links',
      value: formatNumber(data?.expiredTokens),
      caption: 'Past 30 days',
    },
    {
      key: 'access',
      label: 'Access count',
      value: formatNumber(data?.totalAccesses),
      caption: 'Tracked requests',
    },
  ];
});

const rfqsPerMonth = computed(() => stats.value?.rfqsPerMonth ?? []);
const tokenUsageRaw = computed(() => stats.value?.tokenUsageBreakdown ?? []);

const tokenUsageDisplay = computed(() => {
  const list = tokenUsageRaw.value;
  const total = list.reduce((sum, item) => sum + (item.value || 0), 0);
  return list.map((item) => ({
    ...item,
    percent: total ? Math.round((item.value / total) * 100) : 0,
  }));
});

const isInitialLoading = computed(() => loading.value && !stats.value);

const lastUpdatedDisplay = computed(() => {
  if (!lastUpdated.value) {
    return 'Never';
  }
  return new Date(lastUpdated.value).toLocaleString();
});

const handleRefresh = () => {
  statsStore.fetchStats();
};

onMounted(() => {
  if (!stats.value) {
    statsStore.fetchStats();
  }
});
</script>

<style scoped>
.dashboard-card {
  border-radius: 16px;
  box-shadow: 0 6px 18px rgba(15, 23, 42, 0.08);
}

.dashboard-loading {
  min-height: 50vh;
}

.full-height {
  height: 100%;
}
</style>
