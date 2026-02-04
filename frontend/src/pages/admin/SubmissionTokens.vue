<template>
  <q-page class="q-pa-md q-pa-lg-lg">
    <div class="column q-gutter-lg">
      <div class="row items-center justify-between q-col-gutter-md">
        <div>
          <div class="text-h4 text-weight-bold">Submission Tokens</div>
          <div class="text-subtitle2 text-grey-6">Manage submission tokens for incoming RFQs</div>
        </div>
        <q-btn color="primary" icon="add" label="Create Token" unelevated @click="openCreateDialog" />
      </div>

      <q-banner v-if="error" class="bg-negative text-white" rounded>
        {{ error }}
        <template #action>
          <q-btn color="white" flat dense label="Retry" @click="refresh" />
        </template>
      </q-banner>

      <q-card>
        <q-table
          flat
          :rows="tokens"
          :columns="columns"
          row-key="id"
          :loading="loading"
          :rows-per-page-options="[5, 10, 20, 50]"
          class="submission-table"
        >
          <template #body-cell-status="props">
            <q-td :props="props">
              <q-badge :color="statusConfig[statusLabel(props.row)].color" outline class="text-uppercase">
                {{ statusConfig[statusLabel(props.row)].label }}
              </q-badge>
            </q-td>
          </template>

          <template #body-cell-uses="props">
            <q-td :props="props">
              {{ props.row.uses }} / {{ props.row.maxUses === null ? '∞' : props.row.maxUses }}
            </q-td>
          </template>

          <template #body-cell-createdAt="props">
            <q-td :props="props">{{ formatDate(props.row.createdAt) }}</q-td>
          </template>

          <template #body-cell-expiresAt="props">
            <q-td :props="props">{{ formatDate(props.row.expiresAt) }}</q-td>
          </template>

          <template #body-cell-revokedAt="props">
            <q-td :props="props">{{ props.row.revokedAt ? formatDate(props.row.revokedAt) : '—' }}</q-td>
          </template>

          <template #body-cell-actions="props">
            <q-td :props="props">
              <div class="row q-gutter-x-sm">
                <q-btn dense flat icon="edit" @click="openEditDialog(props.row)" />
                <q-btn dense flat icon="block" color="orange" @click="openRevokeDialog(props.row)" :disable="props.row.status === 'REVOKED'" />
                <q-btn dense flat icon="delete" color="negative" @click="openDeleteDialog(props.row)" />
              </div>
            </q-td>
          </template>

          <template #loading>
            <q-inner-loading showing color="primary" />
          </template>

          <template #no-data>
            <div class="text-center q-pa-md text-grey-6">No submission tokens yet.</div>
          </template>
        </q-table>
      </q-card>
    </div>

    <q-dialog v-model="createDialog">
      <q-card style="min-width: 400px; max-width: 520px;">
        <q-card-section class="text-h6">Create Submission Token</q-card-section>
        <q-card-section class="column q-gutter-sm">
          <q-input v-model="createForm.label" label="Label (optional)" outlined />
          <div class="text-caption text-grey-7">Token will be generated automatically.</div>
          <q-input v-model="createForm.expiresAt" type="datetime-local" label="Expires At" outlined :rules="[expiresRule]" />
          <q-input v-model.number="createForm.maxUses" type="number" label="Max Uses" outlined :rules="[usesRule]" />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancel" @click="closeCreateDialog" />
          <q-btn color="primary" unelevated label="Create" :loading="actionLoading" @click="handleCreate" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="editDialog">
      <q-card style="min-width: 400px; max-width: 520px;">
        <q-card-section class="text-h6">Edit Submission Token</q-card-section>
        <q-card-section class="column q-gutter-sm">
          <q-input v-model="editForm.label" label="Label (optional)" outlined />
          <q-input v-model="editForm.expiresAt" type="datetime-local" label="Expires At" outlined />
          <q-input v-model.number="editForm.maxUses" type="number" label="Max Uses" outlined />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancel" @click="closeEditDialog" />
          <q-btn color="primary" unelevated label="Save" :loading="actionLoading" @click="handleEdit" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="revokeDialog">
      <q-card style="min-width: 360px;">
        <q-card-section class="text-h6">Revoke Token</q-card-section>
        <q-card-section>
          Are you sure you want to revoke this submission token?
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancel" @click="closeRevokeDialog" />
          <q-btn color="orange" unelevated label="Revoke" :loading="actionLoading" @click="handleRevoke" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="deleteDialog">
      <q-card style="min-width: 360px;">
        <q-card-section class="text-h6">Delete Token</q-card-section>
        <q-card-section>
          This will permanently delete the submission token. Continue?
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancel" @click="closeDeleteDialog" />
          <q-btn color="negative" unelevated label="Delete" :loading="actionLoading" @click="handleDelete" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="revealDialog">
      <q-card style="min-width: 360px; max-width: 500px;">
        <q-card-section class="text-h6">Submission Token Created</q-card-section>
        <q-card-section>
          <div class="text-caption text-grey-7 q-mb-sm">Copy this token now. It will not be shown again.</div>
          <div class="token-box font-mono">{{ createdPlainToken }}</div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Close" @click="revealDialog = false" />
          <q-btn color="primary" unelevated icon="content_copy" label="Copy" @click="copyCreatedToken" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { useQuasar, type QTableColumn } from 'quasar';
import {
  createSubmissionToken,
  deleteSubmissionToken,
  listSubmissionTokens,
  revokeSubmissionToken,
  updateSubmissionToken,
} from '../../services/admin/adminApi';
import type {
  AdminSubmissionToken,
  AdminSubmissionTokenCreateRequest,
  AdminSubmissionTokenUpdateRequest,
} from '../../services/admin/types';
import { handleAdminError } from '../../utils/adminErrorHandler';

const $q = useQuasar();

type TokenStatusKey = 'ACTIVE' | 'EXPIRED' | 'MAXED' | 'REVOKED';
type SubmissionRow = AdminSubmissionToken & { status: TokenStatusKey };

type CreateFormState = {
  label: string;
  expiresAt: string;
  maxUses: number | null;
};

type EditFormState = {
  label: string;
  expiresAt: string;
  maxUses: number | null;
};

const tokens = ref<SubmissionRow[]>([]);
const loading = ref(false);
const error = ref('');
const actionLoading = ref(false);

const createDialog = ref(false);
const editDialog = ref(false);
const revokeDialog = ref(false);
const deleteDialog = ref(false);
const revealDialog = ref(false);

const createdPlainToken = ref('');
const targetToken = ref<AdminSubmissionToken | null>(null);

const createForm = reactive<CreateFormState>({
  label: '',
  expiresAt: '',
  maxUses: null,
});

const editForm = reactive<EditFormState>({
  label: '',
  expiresAt: '',
  maxUses: null,
});

const statusConfig: Record<TokenStatusKey, { label: string; color: string }> = {
  ACTIVE: { label: 'Active', color: 'positive' },
  EXPIRED: { label: 'Expired', color: 'warning' },
  MAXED: { label: 'Maxed', color: 'orange' },
  REVOKED: { label: 'Revoked', color: 'negative' },
};

const columns: QTableColumn<SubmissionRow>[] = [
  { name: 'id', label: 'ID', field: 'id', align: 'left' },
  { name: 'createdAt', label: 'Created', field: 'createdAt', align: 'left', sortable: true },
  { name: 'expiresAt', label: 'Expires', field: 'expiresAt', align: 'left', sortable: true },
  { name: 'uses', label: 'Uses', field: 'uses', align: 'left' },
  { name: 'revokedAt', label: 'Revoked', field: 'revokedAt', align: 'left' },
  { name: 'status', label: 'Status', field: 'status', align: 'left' },
  { name: 'actions', label: 'Actions', field: 'id', align: 'right' },
];

const formatDate = (value?: string | null) => {
  if (!value) return '—';
  return new Date(value).toLocaleString();
};

const computeStatus = (token: AdminSubmissionToken): TokenStatusKey => {
  if (token.revokedAt) return 'REVOKED';
  const expiresAt = token.expiresAt ? new Date(token.expiresAt) : null;
  if (expiresAt && !Number.isNaN(expiresAt.getTime()) && expiresAt <= new Date()) return 'EXPIRED';
  if (typeof token.maxUses === 'number' && typeof token.uses === 'number' && token.uses >= token.maxUses) return 'MAXED';
  return 'ACTIVE';
};

const statusLabel = (token: SubmissionRow): TokenStatusKey => token.status;

const normalizeTokens = (list: AdminSubmissionToken[]) =>
  list.map((token) => ({
    ...token,
    status: computeStatus(token),
  }));

const refresh = async () => {
  loading.value = true;
  error.value = '';
  try {
    const result = await listSubmissionTokens();
    if (Array.isArray(result)) {
      tokens.value = normalizeTokens(result);
    } else {
      throw new Error('Invalid submission token list shape');
    }
  } catch (err) {
    error.value = 'Failed to load submission tokens';
    console.error('Failed to load submission tokens', err);
    handleAdminError(err);
  } finally {
    loading.value = false;
  }
};

const openCreateDialog = () => {
  createForm.label = '';
  createForm.expiresAt = '';
  createForm.maxUses = null;
  createDialog.value = true;
};

const closeCreateDialog = () => {
  if (actionLoading.value) return;
  createDialog.value = false;
};

const closeEditDialog = () => {
  if (actionLoading.value) return;
  editDialog.value = false;
};

const closeRevokeDialog = () => {
  if (actionLoading.value) return;
  revokeDialog.value = false;
};

const closeDeleteDialog = () => {
  if (actionLoading.value) return;
  deleteDialog.value = false;
};

const expiresRule = (val: string) => !val || !Number.isNaN(new Date(val).getTime()) || 'Valid expiration is required';
const usesRule = (val: number | null) => val === null || val >= 1 || 'Max uses must be at least 1';

const toIsoOrNull = (val?: string | null) => {
  if (!val) return null;
  const date = new Date(val);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const handleCreate = async () => {
  if (actionLoading.value) return;
  const expiresIso = toIsoOrNull(createForm.expiresAt);
  if (createForm.expiresAt && !expiresIso) {
    $q.notify({ type: 'warning', message: 'Valid expiration date/time required', position: 'top' });
    return;
  }

  actionLoading.value = true;
  try {
    const payload: AdminSubmissionTokenCreateRequest = {
      label: createForm.label?.trim() || null,
      expiresAt: expiresIso,
      maxUses: typeof createForm.maxUses === 'number' ? createForm.maxUses : null,
    };
    const response = await createSubmissionToken(payload);
    createdPlainToken.value = response.token;
    revealDialog.value = true;
    createDialog.value = false;
    await refresh();
    $q.notify({ type: 'positive', message: 'Submission token created', position: 'top' });
  } catch (err) {
    handleAdminError(err);
  } finally {
    actionLoading.value = false;
  }
};

const openEditDialog = (token: AdminSubmissionToken) => {
  targetToken.value = token;
  editForm.label = token.label ?? '';
  editForm.expiresAt = token.expiresAt ? token.expiresAt.slice(0, 16) : '';
  editForm.maxUses = token.maxUses ?? null;
  editDialog.value = true;
};

const handleEdit = async () => {
  if (!targetToken.value || actionLoading.value) return;
  const expiresIso = editForm.expiresAt ? toIsoOrNull(editForm.expiresAt) : null;
  if (editForm.expiresAt && !expiresIso) {
    $q.notify({ type: 'warning', message: 'Valid expiration date/time required', position: 'top' });
    return;
  }

  actionLoading.value = true;
  try {
    const payload: AdminSubmissionTokenUpdateRequest = {
      label: editForm.label?.trim() ?? null,
      expiresAt: expiresIso,
      maxUses: typeof editForm.maxUses === 'number' ? editForm.maxUses : null,
    };
    await updateSubmissionToken(targetToken.value.id, payload);
    editDialog.value = false;
    await refresh();
    $q.notify({ type: 'positive', message: 'Submission token updated', position: 'top' });
  } catch (err) {
    handleAdminError(err);
  } finally {
    actionLoading.value = false;
  }
};

const openRevokeDialog = (token: AdminSubmissionToken) => {
  targetToken.value = token;
  revokeDialog.value = true;
};

const handleRevoke = async () => {
  if (!targetToken.value || actionLoading.value) return;
  actionLoading.value = true;
  try {
    await revokeSubmissionToken(targetToken.value.id);
    revokeDialog.value = false;
    await refresh();
    $q.notify({ type: 'positive', message: 'Submission token revoked', position: 'top' });
  } catch (err) {
    handleAdminError(err);
  } finally {
    actionLoading.value = false;
  }
};

const openDeleteDialog = (token: AdminSubmissionToken) => {
  targetToken.value = token;
  deleteDialog.value = true;
};

const handleDelete = async () => {
  if (!targetToken.value || actionLoading.value) return;
  actionLoading.value = true;
  try {
    await deleteSubmissionToken(targetToken.value.id);
    deleteDialog.value = false;
    await refresh();
    $q.notify({ type: 'positive', message: 'Submission token deleted', position: 'top' });
  } catch (err) {
    handleAdminError(err);
  } finally {
    actionLoading.value = false;
  }
};

const copyCreatedToken = async () => {
  if (!createdPlainToken.value) return;
  try {
    await navigator.clipboard.writeText(createdPlainToken.value);
    $q.notify({ type: 'positive', message: 'Token copied', position: 'top' });
  } catch (err) {
    $q.notify({ type: 'warning', message: 'Unable to copy token', position: 'top' });
  }
};

onMounted(() => {
  refresh();
});
</script>

<style scoped>
.submission-table :deep(tbody tr:hover) {
  background-color: rgba(33, 150, 243, 0.06);
}

.token-box {
  background: #f5f5f5;
  border: 1px dashed #d1d5db;
  border-radius: 8px;
  padding: 12px;
  word-break: break-all;
}

.font-mono {
  font-family: 'Roboto Mono', monospace;
}
</style>
