<template>
  <q-page padding>
    <div class="row justify-center">
      <div class="col-12 col-md-8 col-lg-6">
        <q-card class="q-pa-md">
          <q-card-section>
            <div class="text-h5 q-mb-md">Request for Quotation</div>
            <div class="text-subtitle2 text-grey-7">Please fill out the form below to submit your RFQ</div>
          </q-card-section>

          <q-card-section>
            <q-form @submit="onSubmit" class="q-gutter-md">
              <!-- Company Information -->
              <div class="text-h6">Company Information</div>
              
              <q-input
                v-model="formData.companyName"
                label="Company Name *"
                outlined
                :rules="[val => !!val || 'Company name is required']"
              />

              <q-input
                v-model="formData.contactPerson"
                label="Contact Person *"
                outlined
                :rules="[val => !!val || 'Contact person is required']"
              />

              <q-input
                v-model="formData.email"
                label="Email *"
                type="email"
                outlined
                :rules="[
                  val => !!val || 'Email is required',
                  val => /.+@.+\..+/.test(val) || 'Email must be valid'
                ]"
              />

              <q-input
                v-model="formData.phone"
                label="Phone Number"
                outlined
              />

              <!-- Items -->
              <div class="text-h6 q-mt-md">Items</div>
              
              <div v-for="(item, index) in formData.items" :key="index" class="q-mb-md">
                <q-card flat bordered>
                  <q-card-section>
                    <div class="row q-col-gutter-md">
                      <div class="col-12">
                        <q-input
                          v-model="item.description"
                          label="Description *"
                          outlined
                          :rules="[val => !!val || 'Description is required']"
                        />
                      </div>
                      <div class="col-6">
                        <q-input
                          v-model.number="item.quantity"
                          label="Quantity *"
                          type="number"
                          outlined
                          :rules="[val => val > 0 || 'Quantity must be positive']"
                        />
                      </div>
                      <div class="col-6">
                        <q-input
                          v-model="item.unit"
                          label="Unit *"
                          outlined
                          :rules="[val => !!val || 'Unit is required']"
                        />
                      </div>
                    </div>
                    <div class="row justify-end q-mt-sm">
                      <q-btn
                        v-if="formData.items.length > 1"
                        flat
                        color="negative"
                        icon="delete"
                        label="Remove"
                        @click="removeItem(index)"
                      />
                    </div>
                  </q-card-section>
                </q-card>
              </div>

              <q-btn
                flat
                color="primary"
                icon="add"
                label="Add Item"
                @click="addItem"
              />

              <!-- Notes -->
              <q-input
                v-model="formData.notes"
                label="Additional Notes"
                type="textarea"
                outlined
                rows="3"
              />

              <!-- Submit Button -->
              <div class="row justify-end q-gutter-sm">
                <q-btn
                  label="Reset"
                  type="reset"
                  color="grey"
                  flat
                  @click="resetForm"
                />
                <q-btn
                  label="Submit RFQ"
                  type="submit"
                  color="primary"
                  :loading="loading"
                />
              </div>
            </q-form>
          </q-card-section>
        </q-card>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useQuasar } from 'quasar';
import { apiService } from '../services/api';
import type { RFQ, RFQItem } from '@rfq-system/shared';

const $q = useQuasar();

const loading = ref(false);

const formData = ref<Partial<RFQ>>({
  companyName: '',
  contactPerson: '',
  email: '',
  phone: '',
  items: [
    {
      description: '',
      quantity: 1,
      unit: ''
    }
  ],
  notes: ''
});

const addItem = () => {
  formData.value.items?.push({
    description: '',
    quantity: 1,
    unit: ''
  });
};

const removeItem = (index: number) => {
  formData.value.items?.splice(index, 1);
};

const resetForm = () => {
  formData.value = {
    companyName: '',
    contactPerson: '',
    email: '',
    phone: '',
    items: [
      {
        description: '',
        quantity: 1,
        unit: ''
      }
    ],
    notes: ''
  };
};

const onSubmit = async () => {
  loading.value = true;
  try {
    const response = await apiService.createRFQ(formData.value);
    
    $q.notify({
      type: 'positive',
      message: 'RFQ submitted successfully!',
      position: 'top'
    });
    
    console.log('RFQ Response:', response);
    resetForm();
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: 'Failed to submit RFQ. Please try again.',
      position: 'top'
    });
    console.error('Submit error:', error);
  } finally {
    loading.value = false;
  }
};
</script>
