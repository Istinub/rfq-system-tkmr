<template>
  <q-card flat bordered class="rfq-item-row">
    <q-card-section>
      <div class="row items-center justify-between q-mb-md">
        <div class="text-subtitle1">Item #{{ index + 1 }}</div>
        <q-btn
          v-if="removable"
          dense
          round
          flat
          color="negative"
          icon="delete"
          @click="handleRemove"
        />
      </div>

      <div class="row q-col-gutter-md">
        <div class="col-12">
          <q-input
            outlined
            v-model="localItem.name"
            label="Item Name *"
            :rules="[required]"
            placeholder="What do you need?"
          />
        </div>
      </div>

      <div class="row q-col-gutter-md">
        <div class="col-12 col-sm-6 col-md-4">
          <q-input
            outlined
            type="number"
            v-model.number="localItem.quantity"
            label="Quantity *"
            :rules="[required]"
            min="1"
          />
        </div>
        <div class="col-12 col-sm-6 col-md-8">
          <q-input
            outlined
            type="textarea"
            autogrow
            v-model="localItem.details"
            label="Details"
            placeholder="Add specs, preferred brands, delivery expectations, etc."
          />
        </div>
      </div>
    </q-card-section>
  </q-card>
</template>

<script setup lang="ts">
import { reactive, watch } from 'vue';
import { required } from '../validation/rules';

type RFQItemRowModel = {
  name: string;
  quantity: number | null;
  details?: string;
};

const props = withDefaults(
  defineProps<{
    item: RFQItemRowModel;
    index: number;
    removable?: boolean;
  }>(),
  {
    removable: false,
  }
);

const emit = defineEmits<{
  (e: 'update:item', value: RFQItemRowModel): void;
  (e: 'remove', index: number): void;
}>();

const localItem = reactive<RFQItemRowModel>({ ...props.item });

watch(
  () => props.item,
  (value) => {
    Object.assign(localItem, value);
  },
  { deep: true }
);

watch(
  () => ({ ...localItem }),
  (value) => {
    const quantityValue =
      value.quantity === null || Number.isNaN(Number(value.quantity))
        ? null
        : Number(value.quantity);

    emit('update:item', {
      name: value.name,
      quantity: quantityValue,
      details: value.details?.trim() || undefined,
    });
  },
  { deep: true }
);

const handleRemove = () => {
  emit('remove', props.index);
};
</script>

<style scoped>
.rfq-item-row {
  background-color: var(--q-color-grey-1, #f5f5f5);
  padding: 16px;
}

.rfq-item-row :deep(.q-input) {
  width: 100%;
}
</style>
