<template>
  <div class="file-upload">
    <input
      ref="fileInput"
      type="file"
      class="file-input"
      multiple
      :accept="accept"
      @change="handleFileSelection"
    />

    <div class="row items-center q-col-gutter-sm q-mb-sm">
      <div class="col-auto">
        <q-btn
          color="primary"
          outline
          icon="upload_file"
          label="Add Files"
          @click="triggerFileDialog"
        />
      </div>
      <div class="col">
        <div class="text-caption text-grey-7">
          {{ modelValue.length }} / {{ maxFiles }} files selected
        </div>
      </div>
    </div>

    <q-list bordered separator v-if="modelValue.length > 0">
      <q-item v-for="(file, index) in modelValue" :key="fileKey(file, index)">
        <q-item-section>
          <div class="file-name ellipsis">{{ file.name }}</div>
          <div class="text-caption text-grey-7">{{ formatSize(file.size) }}</div>
        </q-item-section>
        <q-item-section side>
          <q-btn
            flat
            dense
            round
            color="negative"
            icon="close"
            @click="removeFile(index)"
          />
        </q-item-section>
      </q-item>
    </q-list>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';

const props = withDefaults(
  defineProps<{
    modelValue: File[];
    maxFiles?: number;
    accept?: string;
  }>(),
  {
    maxFiles: 5,
    accept: '.pdf,.jpg,.jpeg,.png',
  }
);

const emit = defineEmits<{
  (event: 'update:modelValue', value: File[]): void;
}>();

const fileInput = ref<HTMLInputElement | null>(null);

const currentFiles = computed(() => props.modelValue);

const triggerFileDialog = () => {
  fileInput.value?.click();
};

const mergeFiles = (existing: File[], incoming: File[]): File[] => {
  const map = new Map<string, File>();

  const buildKey = (file: File) => `${file.name}-${file.size}-${file.lastModified}`;

  [...existing, ...incoming].forEach((file) => {
    const key = buildKey(file);
    if (!map.has(key)) {
      map.set(key, file);
    }
  });

  return Array.from(map.values()).slice(0, props.maxFiles);
};

const handleFileSelection = (event: Event) => {
  const input = event.target as HTMLInputElement | null;
  const files = input?.files ? Array.from(input.files) : [];

  if (files.length === 0) {
    return;
  }

  const merged = mergeFiles(currentFiles.value, files);
  emit('update:modelValue', merged);

  if (input) {
    input.value = '';
  }
};

const removeFile = (index: number) => {
  const next = currentFiles.value.filter((_, idx) => idx !== index);
  emit('update:modelValue', next);
};

const formatSize = (bytes: number): string => {
  if (bytes === 0) {
    return '0 B';
  }

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const value = bytes / Math.pow(k, i);
  return `${value.toFixed(value >= 10 || i === 0 ? 0 : 1)} ${sizes[i]}`;
};

const fileKey = (file: File, index: number): string => `${file.name}-${file.lastModified}-${index}`;
</script>

<style scoped>
.file-input {
  display: none;
}

.file-upload {
  width: 100%;
}

.file-name {
  font-weight: 500;
}
</style>
