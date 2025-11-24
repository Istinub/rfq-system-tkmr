<template>
  <div class="section-title">
    <div class="text-subtitle1 text-weight-bold">{{ label }}</div>
    <q-separator class="q-mt-sm" />
  </div>
</template>

<script setup lang="ts">
defineProps<{ label: string }>();
</script>

<style scoped>
.section-title {
  width: 100%;
}
</style>
