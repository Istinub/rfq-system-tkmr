<template>
  <q-page class="rfq-form-page q-pa-md q-pa-lg q-pa-xl-xl">
    <q-form ref="formRef" class="page-form" @submit.prevent="handleSubmit">
      <div class="row q-col-gutter-xl">
        <div class="col-12 col-md-3">
          <q-card class="nav-card">
            <q-card-section>
              <div class="text-subtitle1 text-weight-bold q-mb-sm">Offer Navigation</div>
              <q-input
                dense
                outlined
                clearable
                v-model="searchTerm"
                placeholder="Search sections"
                debounce="150"
                class="q-mb-md"
              >
                <template #prepend>
                  <q-icon name="search" />
                </template>
              </q-input>
              <q-scroll-area class="nav-scroll" visible>
                <q-list padding>
                  <template v-if="filteredSections.length">
                    <q-item
                      v-for="section in filteredSections"
                      :key="section.id"
                      clickable
                      v-ripple
                      :active="activeSection === section.id"
                      :class="['nav-link', { 'nav-link--active': activeSection === section.id }]"
                      @click="scrollToSection(section.id)"
                    >
                      <q-item-section>{{ section.label }}</q-item-section>
                    </q-item>
                  </template>
                  <q-item v-else class="text-grey">
                    <q-item-section>No matching sections</q-item-section>
                  </q-item>
                </q-list>
              </q-scroll-area>
            </q-card-section>
          </q-card>
        </div>

        <div class="col-12 col-md-9 sections-column">
          <q-card class="section-card rfq-section" id="general-information" data-section>
            <q-card-section>
              <SectionTitle label="General Information" />
              <div class="section-subheading">
                <div class="text-subtitle2 text-weight-bold">Contact Details</div>
                <div class="helper-text">Tell us who we should coordinate with for this request.</div>
              </div>
              <div class="row q-col-gutter-md q-mb-md">
                <div class="col-12 col-md-6">
                  <q-input outlined v-model="form.companyName" label="Company Name *" :rules="[required]" />
                </div>
                <div class="col-12 col-md-6">
                  <q-input outlined v-model="form.contactPerson" label="Contact Person *" :rules="[required]" />
                </div>
                <div class="col-12 col-md-6">
                  <q-input outlined v-model="form.email" type="email" label="Email *" :rules="[required, emailRule]" />
                </div>
                <div class="col-12 col-md-6">
                  <q-input outlined v-model="form.phone" label="Phone" :rules="[phoneInputRule]" hint="Optional" />
                </div>
                <div class="col-12 col-md-6">
                  <q-input outlined v-model="form.location" label="Location" />
                </div>
                <div class="col-12 col-md-6">
                  <q-input outlined v-model="form.billingAddress" label="Billing Address" type="textarea" autogrow />
                </div>
              </div>

              <div class="section-subheading q-mt-md">
                <div class="text-subtitle2 text-weight-bold">Requested Terms</div>
                <div class="helper-text">Share the original inquiry numbers and target expectations.</div>
              </div>
              <div class="row q-col-gutter-md">
                <div class="col-12 col-md-4">
                  <q-input outlined v-model="form.inquiryDate" type="date" label="Inquiry Date" />
                </div>
                <div class="col-12 col-md-4">
                  <q-input outlined v-model="form.inquiryNumber" label="Inquiry Number" />
                </div>
                <div class="col-12 col-md-4">
                  <q-input outlined v-model="form.replyByDate" type="date" label="Reply By" />
                </div>
                <div class="col-12 col-md-4">
                  <q-input outlined v-model="form.requestedPaymentTerms" label="Requested Payment Terms" />
                </div>
                <div class="col-12 col-md-4">
                  <q-input outlined v-model="form.requestedCurrency" label="Requested Currency" />
                </div>
                <div class="col-12 col-md-4">
                  <q-input outlined v-model="form.requestedQualityLevel" label="Requested Quality Level" />
                </div>
              </div>
            </q-card-section>
          </q-card>

          <q-card class="section-card rfq-section" id="delivery-terms" data-section>
            <q-card-section>
              <SectionTitle label="Offer &amp; Delivery Terms" />
              <div class="row q-col-gutter-md">
                <div class="col-12 col-md-6">
                  <q-input outlined v-model="form.referenceNumber" label="Reference Number" />
                </div>
                <div class="col-12 col-md-6">
                  <q-input outlined v-model="form.offerValidUntil" type="date" label="Offer Valid Until" />
                </div>
                <div class="col-12 col-md-6">
                  <q-input outlined v-model="form.offeredPaymentTerms" label="Offered Payment Terms" />
                </div>
                <div class="col-12 col-md-6">
                  <q-input outlined v-model="form.offeredCurrency" label="Offered Currency" />
                </div>
                <div class="col-12 col-md-6">
                  <q-input outlined v-model="form.offeredQualityLevel" label="Offered Quality Level" />
                </div>
                <div class="col-12 col-md-6">
                  <q-input outlined v-model="form.deliveryDaysFromApproval" type="number" min="0" label="Delivery Days (from approval)" />
                </div>
                <div class="col-12 col-md-6">
                  <q-input outlined v-model="form.offeredDeliveryTerms" label="Offered Delivery Terms" />
                </div>
                <div class="col-12 col-md-6">
                  <q-input outlined v-model="form.offeredItemsLocation" label="Items Location" />
                </div>
              </div>
            </q-card-section>
          </q-card>

          <q-card class="section-card rfq-section" id="documents" data-section>
            <q-card-section>
              <SectionTitle label="Documents" />
              <div class="helper-text q-mb-md">Upload related RFQ documents to support your offer.</div>
              <FileUpload v-model="form.attachments" />
              <div v-if="attachmentNames.length" class="documents-list q-mt-md">
                <q-list bordered dense>
                  <q-item v-for="(filename, idx) in attachmentNames" :key="`${filename}-${idx}`">
                    <q-item-section avatar>
                      <q-icon name="description" color="primary" />
                    </q-item-section>
                    <q-item-section>{{ filename }}</q-item-section>
                  </q-item>
                </q-list>
              </div>
              <div v-else class="helper-text text-grey">No files attached yet.</div>
            </q-card-section>
          </q-card>

          <q-card class="section-card rfq-section" id="requested-items" data-section>
            <q-card-section>
              <SectionTitle label="Requested Items" />
              <div class="column q-gutter-md">
                <RFQItemRow
                  v-for="(item, index) in form.items"
                  :key="item.id"
                  :item="item"
                  :index="index"
                  :removable="form.items.length > 1"
                  :currency-label="currencyLabel"
                  @update:item="updateItem(index, $event)"
                  @remove="removeItem"
                />
              </div>
              <div class="row justify-end q-mt-md">
                <q-btn
                  color="positive"
                  icon="add_circle"
                  unelevated
                  class="add-item-btn"
                  label="Add item"
                  @click="addItem"
                />
              </div>
            </q-card-section>
          </q-card>

          <q-card class="section-card rfq-section" id="additional-items" data-section>
            <q-card-section>
              <SectionTitle label="Additional Items" />
              <div class="helper-text q-mb-md">Capture ancillary costs, discounts, or notes that influence the offer.</div>
              <div class="row q-col-gutter-md">
                <div class="col-12 col-md-6">
                  <q-input outlined type="textarea" autogrow v-model="form.additionalItemTitle" label="Headline" placeholder="e.g., Packaging &amp; Handling" />
                </div>
                <div class="col-12 col-md-6">
                  <q-input outlined type="textarea" autogrow v-model="form.additionalItemDescription" label="Details" placeholder="Provide calculation or rationale" />
                </div>
              </div>
            </q-card-section>
          </q-card>

          <q-card class="section-card rfq-section" id="remarks" data-section>
            <q-card-section>
              <SectionTitle label="Remarks" />
              <div class="row q-col-gutter-md">
                <div class="col-12 col-md-6">
                  <q-input outlined type="textarea" autogrow v-model="form.requisitionRemark" label="Requisition Remark" placeholder="Anything the buyer should confirm internally" />
                </div>
                <div class="col-12 col-md-6">
                  <q-input outlined type="textarea" autogrow v-model="form.supplierRemark" label="Supplier Remark" placeholder="Commitments, exclusions, or extra clarifications" />
                </div>
              </div>
            </q-card-section>
          </q-card>

          <q-card class="section-card rfq-section" id="finish-offer" data-section>
            <q-card-section>
              <SectionTitle label="Finish Offer" />
              <div class="row q-col-gutter-md">
                <div class="col-12 col-sm-6">
                  <q-input
                    outlined
                    type="number"
                    min="0"
                    v-model.number="form.totalSum"
                    label="Offer Total"
                    :suffix="currencyLabel"
                  />
                </div>
              </div>
            </q-card-section>
          </q-card>

          <q-bar class="action-bar shadow-2">
            <q-space />
            <q-btn flat color="grey-7" label="Cancel" icon="close" @click="resetForm" :disable="isSubmitting" />
            <q-btn color="secondary" unelevated label="Export" icon="ios_share" @click="handleExport" :disable="isSubmitting" />
            <q-btn color="primary" unelevated label="Save offer" icon="save" type="submit" :loading="isSubmitting" />
          </q-bar>
        </div>
      </div>
    </q-form>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import { useQuasar } from 'quasar';
import SectionTitle from '../components/SectionTitle.vue';
import RFQItemRow from '../components/RFQItemRow.vue';
import FileUpload from '../components/FileUpload.vue';
import { emailRule, required } from '../validation/rules';
import { createRFQ } from '../services/api';
import type { RFQ } from '@rfq-system/shared';

const phoneInputRule = (value: string | null | undefined): true | string => {
  if (!value || value.trim().length === 0) {
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
  availability: string;
  pricePerUnit: number | null;
  discountPercent: number | null;
  positionSum: number | null;
};

type FormState = {
  companyName: string;
  contactPerson: string;
  email: string;
  phone: string;
  location: string;
  billingAddress: string;
  inquiryDate: string;
  inquiryNumber: string;
  replyByDate: string;
  requestedPaymentTerms: string;
  requestedCurrency: string;
  requestedQualityLevel: string;
  referenceNumber: string;
  offerValidUntil: string;
  offeredPaymentTerms: string;
  offeredCurrency: string;
  offeredQualityLevel: string;
  deliveryDaysFromApproval: string;
  offeredDeliveryTerms: string;
  offeredItemsLocation: string;
  items: FormItem[];
  attachments: File[];
  additionalItemTitle: string;
  additionalItemDescription: string;
  requisitionRemark: string;
  supplierRemark: string;
  totalSum: number | null;
};

const navSections = [
  { id: 'general-information', label: 'General Information' },
  { id: 'delivery-terms', label: 'Offer & Delivery Terms' },
  { id: 'documents', label: 'Documents' },
  { id: 'requested-items', label: 'Requested Items' },
  { id: 'additional-items', label: 'Additional Items' },
  { id: 'remarks', label: 'Remarks' },
  { id: 'finish-offer', label: 'Finish Offer' },
];

const $q = useQuasar();
const formRef = ref();
const isSubmitting = ref(false);
const searchTerm = ref('');
const activeSection = ref(navSections[0].id);

const createBlankItem = (): FormItem => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
  description: '',
  quantity: 1,
  unit: '',
  availability: '',
  pricePerUnit: null,
  discountPercent: null,
  positionSum: null,
});

const form = reactive<FormState>({
  companyName: '',
  contactPerson: '',
  email: '',
  phone: '',
  location: '',
  billingAddress: '',
  inquiryDate: '',
  inquiryNumber: '',
  replyByDate: '',
  requestedPaymentTerms: '',
  requestedCurrency: '',
  requestedQualityLevel: '',
  referenceNumber: '',
  offerValidUntil: '',
  offeredPaymentTerms: '',
  offeredCurrency: '',
  offeredQualityLevel: '',
  deliveryDaysFromApproval: '',
  offeredDeliveryTerms: '',
  offeredItemsLocation: '',
  items: [createBlankItem()],
  attachments: [],
  additionalItemTitle: '',
  additionalItemDescription: '',
  requisitionRemark: '',
  supplierRemark: '',
  totalSum: null,
});

const filteredSections = computed(() => {
  const term = searchTerm.value.trim().toLowerCase();
  if (!term) {
    return navSections;
  }
  return navSections.filter((section) => section.label.toLowerCase().includes(term));
});

const currencyLabel = computed(() => form.offeredCurrency || form.requestedCurrency || 'USD');

const attachmentNames = computed(() => form.attachments.map((file) => file.name || 'Attachment'));

const addItem = () => {
  form.items.push(createBlankItem());
};

const removeItem = (index: number) => {
  if (form.items.length === 1) {
    return;
  }
  form.items.splice(index, 1);
};

type ItemUpdatePayload = {
  description: string;
  quantity: number | null;
  unit: string;
  availability?: string;
  pricePerUnit?: number | null;
  discountPercent?: number | null;
  positionSum?: number | null;
};

const updateItem = (index: number, value: ItemUpdatePayload) => {
  form.items[index] = {
    ...form.items[index],
    description: value.description,
    unit: value.unit,
    availability:
      typeof value.availability === 'string' ? value.availability : form.items[index].availability,
    pricePerUnit:
      typeof value.pricePerUnit === 'number' || value.pricePerUnit === null
        ? value.pricePerUnit
        : form.items[index].pricePerUnit,
    discountPercent:
      typeof value.discountPercent === 'number' || value.discountPercent === null
        ? value.discountPercent
        : form.items[index].discountPercent,
    positionSum:
      typeof value.positionSum === 'number' || value.positionSum === null
        ? value.positionSum
        : form.items[index].positionSum,
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
  const attachments = await Promise.all(form.attachments.map(fileToBase64));
  const attachmentPayload = attachments.filter((entry) => entry.length > 0);

  const remarksSections = [
    form.additionalItemTitle || form.additionalItemDescription
      ? `Additional: ${[form.additionalItemTitle, form.additionalItemDescription].filter(Boolean).join('\n')}`
      : null,
    form.requisitionRemark ? `Requisition Remark: ${form.requisitionRemark}` : null,
    form.supplierRemark ? `Supplier Remark: ${form.supplierRemark}` : null,
  ].filter((entry): entry is string => Boolean(entry));

  const notes = remarksSections.join('\n\n').trim();

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
    notes: notes.length ? notes : undefined,
  };
};

const resetForm = () => {
  form.companyName = '';
  form.contactPerson = '';
  form.email = '';
  form.phone = '';
  form.location = '';
  form.billingAddress = '';
  form.inquiryDate = '';
  form.inquiryNumber = '';
  form.replyByDate = '';
  form.requestedPaymentTerms = '';
  form.requestedCurrency = '';
  form.requestedQualityLevel = '';
  form.referenceNumber = '';
  form.offerValidUntil = '';
  form.offeredPaymentTerms = '';
  form.offeredCurrency = '';
  form.offeredQualityLevel = '';
  form.deliveryDaysFromApproval = '';
  form.offeredDeliveryTerms = '';
  form.offeredItemsLocation = '';
  form.additionalItemTitle = '';
  form.additionalItemDescription = '';
  form.requisitionRemark = '';
  form.supplierRemark = '';
  form.totalSum = null;
  form.items.splice(0, form.items.length, createBlankItem());
  form.attachments.splice(0, form.attachments.length);
  formRef.value?.resetValidation?.();
};

const handleExport = () => {
  $q.notify({
    type: 'info',
    message: 'Export coming soon. For now, save the offer to continue.',
    position: 'top',
  });
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

const scrollToSection = (id: string) => {
  const element = document.getElementById(id);
  if (!element) {
    return;
  }
  const yOffset = -16;
  const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
  window.scrollTo({ top: y, behavior: 'smooth' });
};

let observer: IntersectionObserver | null = null;

onMounted(() => {
  const options: IntersectionObserverInit = {
    root: null,
    rootMargin: '-50% 0px -45% 0px',
    threshold: 0.1,
  };

  observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const targetId = entry.target.getAttribute('id');
        if (targetId) {
          activeSection.value = targetId;
        }
      }
    });
  }, options);

  document.querySelectorAll<HTMLElement>('.rfq-section').forEach((section) => {
    observer?.observe(section);
  });
});

onBeforeUnmount(() => {
  observer?.disconnect();
});
</script>

<style scoped lang="scss">
.rfq-form-page {
  background: var(--q-color-grey-2, #f5f5f5);
}

.page-form {
  max-width: 1200px;
  margin: 0 auto;
}

.nav-card {
  height: 100%;
  background: white;

  @media (min-width: 1024px) {
    position: sticky;
    top: 96px;
  }
}

.nav-scroll {
  max-height: 60vh;
}

.nav-link {
  border-radius: 8px;
  transition: background 0.2s ease;

  &--active {
    background: rgba(33, 150, 243, 0.12);
    color: var(--q-color-primary);
  }
}

.sections-column {
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding-bottom: 96px;
}

.section-card {
  background: white;
}

.section-subheading {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 12px;
}

.helper-text {
  font-size: 0.85rem;
  color: var(--q-color-grey-7, #616161);
}

.documents-list {
  border-radius: 8px;
  overflow: hidden;
}

.add-item-btn {
  border-radius: 999px;
  padding: 0.35rem 1.5rem;
}

.action-bar {
  position: sticky;
  bottom: 0;
  background: white;
  border-radius: 16px 16px 0 0;
  padding: 0.75rem 1.25rem;
  gap: 0.75rem;
  border-top: 1px solid rgba(0, 0, 0, 0.08);

  @media (max-width: 1023px) {
    position: static;
    border-radius: 12px;
    margin-top: 16px;
  }
}
</style>
