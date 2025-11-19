<template>
  <q-layout view="hHh lpR fFf">
    <q-header elevated class="bg-primary text-white">
      <q-toolbar>
        <q-toolbar-title>
          <q-icon name="request_quote" size="sm" class="q-mr-sm" />
          RFQ System - TKMR
        </q-toolbar-title>
        <q-btn flat dense round icon="info" @click="showInfo" />
      </q-toolbar>
    </q-header>

    <q-page-container>
      <router-view />
    </q-page-container>

    <q-footer elevated class="bg-grey-8 text-white">
      <q-toolbar>
        <q-toolbar-title class="text-center">
          <div class="text-caption">
            © {{ new Date().getFullYear() }} TKMR - Request for Quotation System
          </div>
        </q-toolbar-title>
      </q-toolbar>
    </q-footer>
  </q-layout>
</template>

<script setup lang="ts">
import { useQuasar } from 'quasar';

const $q = useQuasar();

const showInfo = () => {
  $q.notify({
    message: 'RFQ System v1.0.0 - Built with Quasar Framework',
    color: 'primary',
    icon: 'info',
    position: 'top',
  });
};
</script>

<style scoped lang="scss">
.q-toolbar-title {
  display: flex;
  align-items: center;
}
</style>
