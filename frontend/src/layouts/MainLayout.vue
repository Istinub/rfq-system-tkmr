<template>
  <q-layout view="hHh lpR fFf">
    <q-header elevated class="bg-primary text-white">
      <q-toolbar>
        <div id="mobile-nav-slot" class="mobile-nav-slot" />
        <q-toolbar-title class="brand-title">
          <div class="column">
            <div class="text-weight-bold">TKMR</div>
            <div class="text-caption text-white-7">Request for Quotation Portal</div>
          </div>
        </q-toolbar-title>
        <q-btn flat dense round icon="info" text-color="white" ref="headerInfoBtn">
          <q-menu anchor="bottom right" self="top right">
            <div class="q-pa-md" style="min-width: 240px">
              <div class="text-subtitle1 text-weight-bold">RFQ System for the following companies</div>
              <div class="text-caption text-grey-7 q-mt-xs">Quasar framework - System built by Istinub Azad</div>
              <q-separator class="q-my-sm" />
              <q-list dense>
                <q-item>
                  <q-item-section>TKMR Marine & Offshore Engineering (HQ – Singapore)</q-item-section>
                </q-item>
                <q-item>
                  <q-item-section>PT TKMR Shipping Int’l (Indonesia)</q-item-section>
                </q-item>
                <q-item>
                  <q-item-section>TKMR Engineering PTE. LTD. (Singapore)</q-item-section>
                </q-item>
              </q-list>
            </div>
          </q-menu>
        </q-btn>
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
import { ref } from 'vue';

const headerInfoBtn = ref();

const logoHq = new URL('../../resources/TKMR.png', import.meta.url).href;
const logoPt = new URL('../../resources/PT TKMR.png', import.meta.url).href;
const logoDev = new URL('../../resources/TKMR Engineering PTE. LTD.png', import.meta.url).href;
</script>

<style scoped lang="scss">
.q-toolbar-title {
  display: flex;
  align-items: center;
}

.brand-title {
  gap: 10px;
  align-items: center;
}

.brand-logo {
  width: 32px;
  max-height: 32px;
}

.mobile-nav-slot {
  display: none;
  margin-right: 8px;
}

@media (max-width: 1023px) {
  .mobile-nav-slot {
    display: flex;
    align-items: center;
  }
}

.group-strip {
  padding: 12px 16px;
  background: #f5f7fa;
}

.group-strip-inner {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.group-logos {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.group-logo {
  height: 32px;
  width: 160px;
  max-width: 180px;
}

.group-logo :deep(img) {
  height: 32px;
  width: auto;
  object-fit: contain;
  display: block;
}
</style>
