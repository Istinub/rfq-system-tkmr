<template>
  <q-page class="rfq-form-page q-pa-md q-pa-lg q-pa-xl-xl">
    <q-form ref="formRef" class="page-form" @submit.prevent="onSubmit">
      <div class="row q-col-gutter-xl">
        <div class="col-12 col-md-3">
          <div class="nav-sticky">
            <OfferNavigation
              :sections="navigationSections"
              :active-section="activeSection"
              @scroll-to="scrollTo"
            />
          </div>
        </div>

        <div class="col-12 col-md-9 sections-column">
          <div id="general-info" class="section-anchor">
            <q-card class="section-card rfq-section">
              <q-card-section>
                <SectionTitle label="Contact Information" />
                <div class="section-subheading">
                  <div class="text-subtitle2 text-weight-bold">Who should we reach out to?</div>
                  <div class="helper-text">Provide the primary contact for this RFQ.</div>
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
                </div>
              </q-card-section>
            </q-card>
          </div>

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

          <div id="requested-items" class="section-anchor">
            <q-card class="section-card rfq-section">
              <q-card-section>
                <SectionTitle label="Requested Items" />
                <div class="helper-text q-mb-md">List the products or services needed. At least one item is required.</div>
                <div class="column q-gutter-md">
                  <div
                    v-for="(item, index) in form.items"
                    :key="item.id"
                    :id="`requested-item-${index}`"
                  >
                    <RFQItemRow
                      :item="item"
                      :index="index"
                      :removable="form.items.length > 1"
                      @update:item="updateItem(index, $event)"
                      @remove="removeItem"
                    />
                  </div>
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
          </div>

          <div class="action-bar">
            <div class="row justify-end items-center q-gutter-sm q-pa-md">
              <q-btn flat color="grey-7" label="Cancel" @click="onReset" :disable="isSubmitting" />
              <q-btn outline color="primary" icon="upload" label="Export" @click="onExport" :disable="isSubmitting" />
              <q-btn unelevated color="primary" icon="save" label="Save Offer" @click="onSubmit" :loading="isSubmitting" />
            </div>
          </div>
        </div>
      </div>
    </q-form>

    <div class="group-strip q-mt-xl">
      <q-separator spaced />
      <div class="group-strip-inner">
        <div class="text-caption text-weight-bold text-grey-8">Companies of the TKMR</div>
        <div class="group-logos">
          <q-img :src="tkmrLogo" class="group-logo" fit="contain" />
          <q-img :src="ptTkmrLogo" class="group-logo" fit="contain" />
          <q-img :src="devTechLogo" class="group-logo" fit="contain" />
        </div>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import { useQuasar } from 'quasar';
import SectionTitle from '../components/SectionTitle.vue';
import RFQItemRow from '../components/RFQItemRow.vue';
import FileUpload from '../components/FileUpload.vue';
import OfferNavigation from '../components/OfferNavigation.vue';
import { emailRule, required } from '../validation/rules';
import { createRFQ } from '../services/api';
import type { RFQRequest } from '@rfq-system/shared';

const tkmrLogo = new URL('../../resources/TKMR.png', import.meta.url).href;
const ptTkmrLogo = new URL('../../resources/PT TKMR.png', import.meta.url).href;
const devTechLogo = new URL('../../resources/TKMR Engineering PTE. LTD.png', import.meta.url).href;

const phoneInputRule = (value: string | null | undefined): true | string => {
  if (!value || value.trim().length === 0) {
    return true;
  }
  const digits = value.replace(/\D/g, '');
  return digits.length >= 7 ? true : 'Enter a valid phone number';
};

type FormItem = {
  id: string;
  name: string;
  quantity: number | null;
  details: string;
};

type SectionChild = {
  id: string;
  label: string;
};

type SectionInfo = {
  id: string;
  label: string;
  children?: SectionChild[];
};

type FormState = {
  companyName: string;
  contactPerson: string;
  email: string;
  phone: string;
  items: FormItem[];
  attachments: File[];
};

const baseSections: SectionInfo[] = [
  {
    id: 'general-info',
    label: 'Contact Information',
  },
  { id: 'documents', label: 'Documents' },
  { id: 'requested-items', label: 'Requested Items' },
];

const $q = useQuasar();
const formRef = ref();
const infoBtnRef = ref();
const isSubmitting = ref(false);
const activeSection = ref(baseSections[0].id);

const createBlankItem = (): FormItem => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
  name: '',
  quantity: 1,
  details: '',
});

const form = reactive<FormState>({
  companyName: '',
  contactPerson: '',
  email: '',
  phone: '',
  items: [createBlankItem()],
  attachments: [],
});

const attachmentNames = computed(() => form.attachments.map((file) => file.name || 'Attachment'));

const navigationSections = computed(() =>
  baseSections.map((section) => {
    if (section.id === 'requested-items') {
      return {
        ...section,
        children: form.items.map((_, index) => ({ id: `requested-item-${index}`, label: `Item #${index + 1}` })),
      };
    }
    return section;
  })
);

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
  name: string;
  quantity: number | null;
  details?: string;
};

const updateItem = (index: number, value: ItemUpdatePayload) => {
  form.items[index] = {
    ...form.items[index],
    name: value.name,
    details: typeof value.details === 'string' ? value.details : form.items[index].details,
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

const buildPayload = async (): Promise<RFQRequest> => {
  const attachments = await Promise.all(
    form.attachments.map(async (file) => ({
      fileName: file.name,
      fileUrl: await fileToBase64(file),
      fileSize: file.size,
    }))
  );
  const attachmentPayload = attachments.filter((entry) => entry.fileUrl.length > 0);

  const itemsPayload = form.items
    .map(({ name, quantity, details }) => ({
      name: name.trim(),
      quantity: typeof quantity === 'number' ? quantity : Number(quantity ?? 0),
      details: details.trim() ? details.trim() : undefined,
    }))
    .filter((item) => item.name.length > 0 && Number.isFinite(item.quantity) && item.quantity > 0);

  if (itemsPayload.length === 0) {
    throw new Error('Add at least one requested item before submitting.');
  }

  return {
    company: form.companyName.trim(),
    contactName: form.contactPerson.trim(),
    contactEmail: form.email.trim(),
    contactPhone: form.phone.trim() || undefined,
    items: itemsPayload,
    attachments: attachmentPayload.length ? attachmentPayload : undefined,
  };
};

const resetForm = () => {
  form.companyName = '';
  form.contactPerson = '';
  form.email = '';
  form.phone = '';
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
    const { rfq: { id } } = await createRFQ(payload);


    $q.notify({
      type: 'positive',
      message: `RFQ ${id} submitted successfully.`,
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

const scrollTo = (id: string) => {
  const element = document.getElementById(id);
  if (!element) {
    return;
  }
  const yOffset = -120;
  const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
  window.scrollTo({ top: y, behavior: 'smooth' });
};

let sectionObserver: IntersectionObserver | null = null;

onMounted(() => {
  const options: IntersectionObserverInit = {
    root: null,
    rootMargin: '-40% 0px -50% 0px',
    threshold: 0.1,
  };

  sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const targetId = entry.target.getAttribute('id');
        if (targetId) {
          activeSection.value = targetId;
        }
      }
    });
  }, options);

  baseSections.forEach(({ id }) => {
    const el = document.getElementById(id);
    if (el) {
      sectionObserver?.observe(el);
    }
  });
});

onBeforeUnmount(() => {
  sectionObserver?.disconnect();
});

const onReset = () => {
  resetForm();
};

const onExport = () => {
  handleExport();
};

const onSubmit = () => {
  handleSubmit();
};
</script>

<style scoped lang="scss">
.rfq-form-page {
  background: var(--q-color-grey-2, #f5f5f5);
}

.page-form {
  max-width: 1200px;
  margin: 0 auto;
}

.brand-header {
  max-width: 1200px;
  margin: 0 auto;
}

.brand-logo {
  width: 32px;
  max-height: 32px;
}

@media (max-width: 767px) {
  .brand-logo {
    width: 28px;
    max-height: 28px;
  }
}

.sections-column {
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding-bottom: 0;
}

.section-card {
  background: white;
}

@media (min-width: 1024px) {
  .nav-sticky {
    position: sticky;
    top: 96px;
    align-self: flex-start;
    width: 100%;
  }
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
  left: 0;
  right: 0;
  background: #ffffff;
  border-top: 1px solid #dce0e5;
  z-index: 100;
  box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.12);
}

.group-strip {
  max-width: 1200px;
  margin: 0 auto 24px;
}

.group-strip-inner {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 12px;
}

.group-logos {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 24px;
  flex-wrap: nowrap;
  width: 100%;
}

.group-logo {
  width: 180px;
  height: 48px;
  max-width: 200px;
}

.group-logo :deep(img) {
  height: 100%;
  width: auto;
  object-fit: contain;
  display: block;
}

@media (max-width: 767px) {
  .group-logos {
    gap: 16px;
    flex-wrap: wrap;
  }

  .group-logo {
    width: 150px;
    height: 36px;
  }
}
</style>
