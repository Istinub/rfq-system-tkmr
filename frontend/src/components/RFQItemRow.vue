<template>
  <q-card flat bordered class="rfq-item-row">
    <q-card-section>
      <div class="row items-center justify-between q-mb-sm">
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

      <div class="column q-gutter-md">
        <q-input
          outlined
          v-model="localItem.description"
          label="Description *"
          :rules="[required]"
        />

        <div class="row q-col-gutter-md">
          <div class="col-12 col-md-4">
            <q-input
              outlined
              type="number"
              v-model.number="localItem.quantity"
              label="Quantity *"
              :rules="[required]"
              min="1"
            />
          </div>
          <div class="col-12 col-md-8">
            <q-input
              outlined
              v-model="localItem.unit"
              label="Unit *"
              placeholder="e.g., pcs, kg, m"
              :rules="[required]"
            />
          </div>
        </div>

        <div class="row q-col-gutter-md">
          <div class="col-12 col-md-6">
            <q-input
              outlined
              v-model="localItem.availability"
              label="Availability"
              placeholder="e.g., In stock, 2 weeks lead"
            />
          </div>
          <div class="col-12 col-sm-6 col-md-3">
            <q-input
              outlined
              type="number"
              v-model.number="localItem.pricePerUnit"
              label="Price / Unit"
              :suffix="currencyLabel"
              min="0"
            />
          </div>
          <div class="col-12 col-sm-6 col-md-3">
            <q-input
              outlined
              type="number"
              v-model.number="localItem.discountPercent"
              label="Discount %"
              suffix="%"
              min="0"
              max="100"
            />
          </div>
        </div>

        <div class="row q-col-gutter-md">
          <div class="col-12 col-md-6">
            <q-input
              outlined
              type="number"
              v-model.number="localItem.positionSum"
              label="Position Sum"
              :suffix="currencyLabel"
              min="0"
            />
          </div>
        </div>
      </div>
    </q-card-section>
  </q-card>
</template>

<script setup lang="ts">
import { reactive, watch } from 'vue';
import { required } from '../validation/rules';

type RFQItemRowModel = {
  description: string;
  quantity: number | null;
  unit: string;
  availability?: string;
  pricePerUnit?: number | null;
  discountPercent?: number | null;
  positionSum?: number | null;
};

const props = withDefaults(
  defineProps<{
    item: RFQItemRowModel;
    index: number;
    removable?: boolean;
    currencyLabel?: string;
  }>(),
  {
    removable: false,
    currencyLabel: 'USD',
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

    const priceValue =
      value.pricePerUnit === null || value.pricePerUnit === undefined || Number.isNaN(Number(value.pricePerUnit))
        ? null
        : Number(value.pricePerUnit);
    const discountValue =
      value.discountPercent === null || value.discountPercent === undefined || Number.isNaN(Number(value.discountPercent))
        ? null
        : Number(value.discountPercent);
    const positionSumValue =
      value.positionSum === null || value.positionSum === undefined || Number.isNaN(Number(value.positionSum))
        ? null
        : Number(value.positionSum);

    emit('update:item', {
      description: value.description,
      quantity: quantityValue,
      unit: value.unit,
      availability: value.availability,
      pricePerUnit: priceValue,
      discountPercent: discountValue,
      positionSum: positionSumValue,
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
</style>
