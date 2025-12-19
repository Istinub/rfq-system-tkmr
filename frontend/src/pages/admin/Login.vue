<template>
  <div class="admin-login flex flex-center bg-grey-2 q-pa-md">
    <q-card class="q-pa-lg" style="min-width: 320px; max-width: 420px">
      <q-card-section>
        <div class="text-h5 text-center">Admin Access</div>
        <div class="text-subtitle2 text-center text-grey-7">Enter your API key to continue</div>
      </q-card-section>
      <q-separator inset />
      <q-card-section>
        <q-form @submit.prevent="onSubmit" class="q-gutter-md">
          <q-input
            v-model="keyInput"
            outlined
            type="password"
            label="Admin API Key"
            autocomplete="off"
            :disable="submitting"
            :rules="[(val) => !!val || 'API key is required']"
          />
          <q-btn
            label="Login"
            type="submit"
            color="primary"
            class="full-width"
            unelevated
            :loading="submitting"
          />
        </q-form>
      </q-card-section>
    </q-card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Notify } from 'quasar';
import { useAdminAuthStore } from '../../stores/admin/adminAuth';

const router = useRouter();
const route = useRoute();
const auth = useAdminAuthStore();
const keyInput = ref(auth.apiKey);
const submitting = ref(false);

const onSubmit = async () => {
  submitting.value = true;
  try {
    auth.login(keyInput.value);
    Notify.create({ type: 'positive', message: 'Admin key stored.' });
    const nextQuery = route.query.next;
    const nextTarget =
      typeof nextQuery === 'string' && nextQuery.startsWith('/admin') ? nextQuery : '/admin/dashboard';
    router.push(nextTarget);
  } finally {
    submitting.value = false;
  }
};
</script>

<style scoped>
.admin-login {
  min-height: 100vh;
}
</style>
