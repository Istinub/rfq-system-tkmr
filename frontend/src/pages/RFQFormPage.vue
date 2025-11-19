<template>
  <q-page class="q-pa-md">
    <div class="row justify-center">
      <div class="col-12 col-md-8 col-lg-6">
        <q-card class="q-pa-md">
          <q-card-section>
            <div class="text-h5 q-mb-md">
              <q-icon name="request_quote" class="q-mr-sm" />
              Request for Quotation
            </div>
            <div class="text-subtitle2 text-grey-7">
              Fill out the form below to submit your RFQ
            </div>
          </q-card-section>

          <q-card-section>
            <q-form @submit="onSubmit" @reset="onReset" class="q-gutter-md">
              <!-- Company Information -->
              <div class="text-h6 q-mb-sm">Company Information</div>
              
              <q-input
                v-model="form.companyName"
                filled
                label="Company Name *"
                lazy-rules
                :rules="[val => val && val.length > 0 || 'Please enter company name']"
              >
                <template v-slot:prepend>
                  <q-icon name="business" />
                </template>
              </q-input>

              <q-input
                v-model="form.contactEmail"
                filled
                type="email"
                label="Contact Email *"
                lazy-rules
                :rules="[
                  val => val && val.length > 0 || 'Please enter email',
                  val => validateEmail(val) || 'Please enter a valid email'
                ]"
              >
                <template v-slot:prepend>
                  <q-icon name="email" />
                </template>
              </q-input>

              <q-input
                v-model="form.contactPhone"
                filled
                label="Contact Phone"
                mask="(###) ### - ####"
                hint="Optional"
              >
                <template v-slot:prepend>
                  <q-icon name="phone" />
                </template>
              </q-input>

              <!-- RFQ Items -->
              <div class="text-h6 q-mt-md q-mb-sm">Items</div>
              
              <div v-for="(item, index) in form.items" :key="index" class="q-mb-md">
                <q-card flat bordered>
                  <q-card-section>
                    <div class="row items-center q-mb-sm">
                      <div class="col text-subtitle1">Item #{{ index + 1 }}</div>
                      <q-btn
                        v-if="form.items.length > 1"
                        flat
                        dense
                        round
                        color="negative"
                        icon="delete"
                        @click="removeItem(index)"
                      />
                    </div>
                    
                    <q-input
                      v-model="item.productName"
                      filled
                      label="Product Name *"
                      class="q-mb-sm"
                      :rules="[val => val && val.length > 0 || 'Required']"
                    />
                    
                    <div class="row q-col-gutter-sm">
                      <div class="col-6">
                        <q-input
                          v-model.number="item.quantity"
                          filled
                          type="number"
                          label="Quantity *"
                          min="1"
                          :rules="[val => val > 0 || 'Must be greater than 0']"
                        />
                      </div>
                      <div class="col-6">
                        <q-input
                          v-model="item.unit"
                          filled
                          label="Unit *"
                          placeholder="e.g., pcs, kg, m"
                          :rules="[val => val && val.length > 0 || 'Required']"
                        />
                      </div>
                    </div>
                    
                    <q-input
                      v-model="item.description"
                      filled
                      type="textarea"
                      label="Description"
                      rows="2"
                      class="q-mt-sm"
                      hint="Optional additional details"
                    />
                  </q-card-section>
                </q-card>
              </div>

              <q-btn
                flat
                color="primary"
                label="Add Another Item"
                icon="add"
                @click="addItem"
                class="full-width"
              />

              <!-- Notes -->
              <div class="text-h6 q-mt-md q-mb-sm">Additional Notes</div>
              
              <q-input
                v-model="form.notes"
                filled
                type="textarea"
                label="Notes"
                rows="3"
                hint="Any additional information or requirements"
              />

              <!-- Submit buttons -->
              <div class="q-mt-md">
                <q-btn
                  label="Submit RFQ"
                  type="submit"
                  color="primary"
                  icon="send"
                  class="q-mr-sm"
                  :loading="submitting"
                />
                <q-btn
                  label="Reset"
                  type="reset"
                  color="grey"
                  flat
                  icon="refresh"
                />
              </div>
            </q-form>
          </q-card-section>
        </q-card>

        <!-- Success message -->
        <q-dialog v-model="showSuccess" persistent>
          <q-card>
            <q-card-section class="row items-center">
              <q-icon name="check_circle" color="positive" size="3em" class="q-mr-md" />
              <div>
                <div class="text-h6">RFQ Submitted Successfully!</div>
                <div class="text-subtitle2">Your request has been received.</div>
              </div>
            </q-card-section>
            <q-card-actions align="right">
              <q-btn flat label="OK" color="primary" @click="closeSuccess" />
            </q-card-actions>
          </q-card>
        </q-dialog>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRoute } from 'vue-router';
import { useQuasar } from 'quasar';
import { validateEmail } from '@rfq-system-tkmr/shared';
import type { CreateRFQRequest } from '@rfq-system-tkmr/shared';

const route = useRoute();
const $q = useQuasar();

interface RFQFormItem {
  productName: string;
  quantity: number;
  unit: string;
  description?: string;
}

interface RFQForm {
  companyName: string;
  contactEmail: string;
  contactPhone?: string;
  items: RFQFormItem[];
  notes?: string;
}

const form = ref<RFQForm>({
  companyName: '',
  contactEmail: '',
  contactPhone: '',
  items: [
    {
      productName: '',
      quantity: 1,
      unit: '',
      description: '',
    },
  ],
  notes: '',
});

const submitting = ref(false);
const showSuccess = ref(false);

const addItem = () => {
  form.value.items.push({
    productName: '',
    quantity: 1,
    unit: '',
    description: '',
  });
};

const removeItem = (index: number) => {
  form.value.items.splice(index, 1);
};

const onSubmit = async () => {
  submitting.value = true;
  
  try {
    const token = route.params.token as string | undefined;
    
    // Prepare request data
    const requestData: CreateRFQRequest = {
      companyName: form.value.companyName,
      contactEmail: form.value.contactEmail,
      contactPhone: form.value.contactPhone,
      items: form.value.items.map(item => ({
        productName: item.productName,
        quantity: item.quantity,
        unit: item.unit,
        description: item.description,
      })),
      notes: form.value.notes,
    };

    // TODO: Replace with actual API call
    console.log('Submitting RFQ:', requestData);
    console.log('Token:', token);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    showSuccess.value = true;
  } catch (error) {
    console.error('Error submitting RFQ:', error);
    $q.notify({
      type: 'negative',
      message: 'Failed to submit RFQ. Please try again.',
      position: 'top',
    });
  } finally {
    submitting.value = false;
  }
};

const onReset = () => {
  form.value = {
    companyName: '',
    contactEmail: '',
    contactPhone: '',
    items: [
      {
        productName: '',
        quantity: 1,
        unit: '',
        description: '',
      },
    ],
    notes: '',
  };
};

const closeSuccess = () => {
  showSuccess.value = false;
  onReset();
};
</script>

<style scoped lang="scss">
// Form styles
</style>
