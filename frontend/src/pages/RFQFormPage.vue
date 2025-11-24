<template>
  <q-page class="q-pa-lg">
    <div class="row justify-center">
      <div class="col-12 col-lg-9">
        <q-card class="rfq-card">
          <q-card-section class="bg-primary text-white">
            <div class="row items-center no-wrap">
              <q-icon name="request_quote" size="2rem" class="q-mr-md" />
              <div>
                <div class="text-h5 text-weight-bold">Request for Quotation</div>
                <div class="text-subtitle2">Provide your details and we will prepare a tailored quote.</div>
              </div>
            </div>
          </q-card-section>

          <q-separator />

          <q-card-section>
            <q-form ref="formRef" class="q-gutter-y-xl" @submit.prevent="handleSubmit">
              <section>
                <SectionTitle label="Company Information" />
                <div class="row q-col-gutter-md">
                  <div class="col-12 col-md-6">
                    <q-input
                      outlined
                      v-model="form.companyName"
                      label="Company Name *"
                      :rules="[required]"
                    >
                      <template #prepend>
                        <q-icon name="apartment" />
                      </template>
                    </q-input>
                  </div>
                  <div class="col-12 col-md-6">
                    <q-input
                      outlined
                      v-model="form.contactPerson"
                      label="Contact Person *"
                      :rules="[required]"
                    >
                      <template #prepend>
                        <q-icon name="person" />
                      </template>
                    </q-input>
                  </div>
                  <div class="col-12 col-md-6">
                    <q-input
                      outlined
                      v-model="form.email"
                      label="Email *"
                      type="email"
                      :rules="[required, emailRule]"
                    >
                      <template #prepend>
                        <q-icon name="email" />
                      </template>
                    </q-input>
                  </div>
                  <div class="col-12 col-md-6">
                    <q-input
                      outlined
                      v-model="form.phone"
                      label="Phone"
                      :rules="[phoneInputRule]"
                      hint="Optional"
                    >
                      <template #prepend>
                        <q-icon name="call" />
                      </template>
                    </q-input>
                  </div>
                </div>
              </section>

              <section>
                <SectionTitle label="Items" />

                <RFQItemRow
                  v-for="(item, index) in form.items"
                  :key="item.id"
                  :item="item"
                  :index="index"
                  :removable="form.items.length > 1"
                  @update:item="updateItem(index, $event)"
                  @remove="removeItem"
                />

                <div class="row justify-end">
                  <q-btn color="primary" flat icon="add" label="Add Item" @click="addItem" />
                </div>
              </section>

              <section>
                <SectionTitle label="Attachments" />
                <FileUpload v-model="form.attachments" />
              </section>

              <section>
                <SectionTitle label="Additional Notes" />
                <q-input
                  outlined
                  type="textarea"
                  v-model="form.notes"
                  rows="4"
                  autogrow
                  placeholder="Provide delivery timelines, special instructions, or other details"
                />
              </section>

              <div class="row justify-end q-col-gutter-sm">
                <div class="col-auto">
                  <q-btn
                    outline
                    color="primary"
                    label="Reset"
                    icon="refresh"
                    @click="resetForm"
                    :disable="isSubmitting"
                  />
                </div>
                <div class="col-auto">
                  <q-btn
                    unelevated
                    color="primary"
                    label="Submit RFQ"
                    icon="send"
                    type="submit"
                    :loading="isSubmitting"
                  />
                </div>
              </div>
            </q-form>
          </q-card-section>
        </q-card>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue';
import { useQuasar } from 'quasar';
import SectionTitle from '../components/SectionTitle.vue';
import RFQItemRow from '../components/RFQItemRow.vue';
import FileUpload from '../components/FileUpload.vue';
import { emailRule, required } from '../validation/rules';
import { createRFQ } from '../services/api';
import type { RFQ } from '@rfq-system/shared';

const phoneInputRule = (value: string | null | undefined): true | string => {
  if (value === null || value === undefined || value.trim().length === 0) {
    return true;
  }

  const digits = value.replace(/\D/g, '');
  return digits.length >= 7 ? true : 'Enter a valid phone number';
};

type FormItem = {
  id: string;
  description: string;
  quantity: number;
  unit: string;
};

type FormState = {
  companyName: string;
  contactPerson: string;
  email: string;
  phone: string;
  items: FormItem[];
  attachments: File[];
  notes: string;
};

const $q = useQuasar();
const formRef = ref();
const isSubmitting = ref(false);

const createBlankItem = (): FormItem => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
  description: '',
  quantity: 1,
  unit: '',
});

const form = reactive<FormState>({
  companyName: '',
  contactPerson: '',
  email: '',
  phone: '',
  items: [createBlankItem()],
  attachments: [],
  notes: '',
});

const addItem = () => {
  form.items.push(createBlankItem());
};

const removeItem = (index: number) => {
  if (form.items.length === 1) {
    return;
  }
  form.items.splice(index, 1);
};

const updateItem = (index: number, value: { description: string; quantity: number | null; unit: string }) => {
  form.items[index] = {
    ...form.items[index],
    description: value.description,
    unit: value.unit,
    quantity: typeof value.quantity === 'number' ? value.quantity : form.items[index].quantity,
  };
};

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      resolve(result);
    };
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });

const buildPayload = async (): Promise<RFQ> => {
  const trimmedNotes = form.notes.trim();
  const attachments = await Promise.all(form.attachments.map(fileToBase64));
  const attachmentPayload = attachments.filter((entry) => entry.length > 0);

  return {
    company: form.companyName.trim(),
    contact: {
      name: form.contactPerson.trim(),
      email: form.email.trim(),
      phone: form.phone.trim() || undefined,
    },
    items: form.items.map(({ description, quantity, unit }) => ({
      description: description.trim(),
      quantity,
      unit: unit.trim(),
    })),
    attachments: attachmentPayload.length ? attachmentPayload : undefined,
    notes: trimmedNotes || undefined,
  };
};

const resetForm = () => {
  form.companyName = '';
  form.contactPerson = '';
  form.email = '';
  form.phone = '';
  form.notes = '';
  form.attachments = [];
  form.items.splice(0, form.items.length, createBlankItem());
  formRef.value?.resetValidation?.();
};

const handleSubmit = async () => {
  if (isSubmitting.value) {
    return;
  }

  isSubmitting.value = true;

  try {
    const payload = await buildPayload();
    const { id, secureLinkToken } = await createRFQ(payload);

    $q.notify({
      type: 'positive',
      message: secureLinkToken
        ? `RFQ ${id} submitted. Secure token generated.`
        : `RFQ ${id} submitted successfully.`,
      position: 'top',
    });

    resetForm();
  } catch (error) {
    console.error('RFQ submission failed', error);
    $q.notify({
      type: 'negative',
      message: error instanceof Error ? error.message : 'Unable to submit RFQ',
      position: 'top',
    });
  } finally {
    isSubmitting.value = false;
  }
};
</script>

<style scoped lang="scss">
.rfq-card {
  max-width: 960px;
  margin: 0 auto;
}

section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
</style>
