<template>
  <q-card class="nav-card q-pa-md">
    <div class="nav-header text-subtitle1 text-weight-bold">Offer Navigation</div>
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
      <q-list padding class="nav-list">
        <template v-if="filteredSections.length">
          <div
            v-for="section in filteredSections"
            :key="section.id"
            class="nav-section"
          >
            <q-item
              clickable
              v-ripple
              :active="props.activeSection === section.id"
              :class="[
                'nav-section-item',
                props.activeSection === section.id ? 'nav-section-item--active' : '',
              ]"
              @click="handleScroll(section.id)"
            >
              <q-item-section avatar class="nav-indicator-wrapper">
                <span
                  :class="[
                    'nav-indicator',
                    props.activeSection === section.id ? 'nav-indicator--active' : '',
                  ]"
                />
              </q-item-section>
              <q-item-section class="nav-section-content">
                <div class="section-label">{{ section.label }}</div>
              </q-item-section>
            </q-item>
            <div v-if="section.children && section.children.length" class="nav-subitems">
              <div v-for="child in section.children" :key="child.label" class="nav-subitem">
                <span class="nav-subitem-icon" />
                <span class="nav-subitem-label">{{ child.label }}</span>
              </div>
            </div>
          </div>
        </template>
        <div v-else class="text-grey text-caption">No matching sections</div>
      </q-list>
    </q-scroll-area>
  </q-card>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';

type SectionChild = {
  label: string;
};

type SectionInfo = {
  id: string;
  label: string;
  children?: SectionChild[];
};

const props = defineProps<{
  sections: SectionInfo[];
  activeSection: string;
}>();

const emit = defineEmits<{
  (e: 'scrollTo', id: string): void;
}>();

const searchTerm = ref('');

const filteredSections = computed(() => {
  const term = searchTerm.value.trim().toLowerCase();
  if (!term) {
    return props.sections;
  }
  return props.sections.filter((section) => {
    const sectionMatches = section.label.toLowerCase().includes(term);
    const childMatches = section.children?.some((child) => child.label.toLowerCase().includes(term));
    return sectionMatches || childMatches;
  });
});

const handleScroll = (sectionId: string) => {
  emit('scrollTo', sectionId);
};
</script>

<style scoped lang="scss">
.nav-card {
  display: flex;
  flex-direction: column;
  border-radius: 16px;
  background: #ffffff;
  position: sticky;
  top: 96px;
  height: calc(100vh - 120px);
  box-shadow: 0 24px 48px -28px rgba(15, 23, 42, 0.4), 0 18px 32px -30px rgba(15, 23, 42, 0.25);
  border: 1px solid rgba(15, 23, 42, 0.05);
  overflow: hidden;
}

.nav-header {
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: #1f2937;
  margin-bottom: 4px;
}

.nav-scroll {
  flex-grow: 1;
  overflow-y: auto;
  padding-bottom: 12px;
}

.nav-list {
  padding-top: 4px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.nav-section {
  animation: navSectionEnter 320ms ease forwards;
  transform-origin: left;
}

.nav-section + .nav-section {
  margin-top: 4px;
}

.nav-section-item {
  border-radius: 14px;
  transition: background 220ms ease, transform 220ms ease;
  padding: 6px 12px;
  align-items: center;
  gap: 10px;
}

.nav-section-item:hover {
  transform: translateX(2px);
  background: rgba(248, 250, 255, 0.75);
}

.nav-section-item--active {
  background: linear-gradient(90deg, rgba(37, 99, 235, 0.18), rgba(37, 99, 235, 0.05));
  transition: background 220ms ease;
}

.nav-section-item--active .section-label {
  color: #1d4ed8;
}

.nav-indicator-wrapper {
  width: 6px;
  min-width: 6px;
  display: flex;
  justify-content: center;
}

.nav-indicator {
  display: block;
  width: 3px;
  height: 34px;
  border-radius: 999px;
  background: transparent;
  transform: scaleY(0.35);
  transform-origin: center;
  transition: transform 280ms cubic-bezier(0.22, 1, 0.36, 1), background 220ms ease, box-shadow 220ms ease;
}

.nav-indicator--active {
  background: #2563eb;
  transform: scaleY(1);
  box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.18), 0 0 14px rgba(37, 99, 235, 0.35);
}

.nav-section-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.section-label {
  font-size: 0.84rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #27364a;
  font-weight: 600;
  transition: color 220ms ease;
}

.nav-subitems {
  margin-left: 24px;
  padding: 3px 0 6px 4px;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.nav-subitem {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.78rem;
  color: #4b5563;
  padding: 2px 0;
  transition: transform 200ms ease, color 200ms ease, opacity 200ms ease;
}

.nav-subitem:hover {
  transform: translateX(3px);
  color: #1d4ed8;
}

.nav-subitem-icon {
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: #9ca3af;
  display: inline-block;
  transition: background 200ms ease, transform 200ms ease;
}

.nav-subitem:hover .nav-subitem-icon {
  background: #2563eb;
  transform: scale(1.15);
}

.nav-subitem-label {
  letter-spacing: 0.02em;
}

.q-input.q-input--dense :deep(.q-field__control) {
  border-radius: 10px;
}

@keyframes navSectionEnter {
  0% {
    opacity: 0;
    transform: translateY(4px) scale(0.98);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
</style>