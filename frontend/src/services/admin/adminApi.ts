import axios, { type AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import { handleAdminError } from '../../utils/adminErrorHandler';
import type {
  AdminLogEntry,
  AdminRfqDetails,
  AdminRfqSummary,
  AdminSecureLinkMeta,
  AdminSettings,
  AdminStatsResponse,
  AdminTokenRow,
  AdminSubmissionToken,
  AdminSubmissionTokenCreateRequest,
  AdminSubmissionTokenCreateResponse,
  AdminSubmissionTokenUpdateRequest,
  AdminQuotationDetails,
  AdminQuotationSummary,
  AdminQuotationUpdateRequest,
} from './types';

export const ADMIN_API_KEY_STORAGE_KEY = 'ADMIN_API_KEY';

const attachAdminApiKey = (config: InternalAxiosRequestConfig) => {
  const key = (localStorage.getItem(ADMIN_API_KEY_STORAGE_KEY) ?? '').trim();

  if (key) {
    config.headers = config.headers ?? {};
    config.headers['x-api-key'] = key;
  }

  return config;
};

const handleAdminResponseError = (error: AxiosError) => {
  const message =
    error.response?.data && typeof error.response.data === 'object'
      ? (error.response.data as { message?: string }).message ?? error.message
      : error.message;

  handleAdminError(message || 'Admin API request failed');
  return Promise.reject(error);
};

export const adminApiClient = axios.create({
  baseURL: '/api/admin',
  timeout: 20000,
});

adminApiClient.interceptors.request.use(attachAdminApiKey);
adminApiClient.interceptors.response.use((response) => response, handleAdminResponseError);

const secureLinkApiClient = axios.create({
  baseURL: '/api',
  timeout: 20000,
});

secureLinkApiClient.interceptors.request.use(attachAdminApiKey);
secureLinkApiClient.interceptors.response.use((response) => response, handleAdminResponseError);

const unwrap = async <T>(promise: Promise<AxiosResponse<T>>): Promise<T> => {
  const { data } = await promise;
  return data;
};

const normalizeSubmissionTokens = (data: unknown): AdminSubmissionToken[] => {
  if (Array.isArray(data)) return data as AdminSubmissionToken[];

  if (data && typeof data === 'object') {
    const candidate = data as Record<string, unknown>;
    const maybeArrays = ['tokens', 'data', 'items'] as const;

    for (const key of maybeArrays) {
      const value = candidate[key];
      if (Array.isArray(value)) {
        return value as AdminSubmissionToken[];
      }
    }
  }

  throw new Error('Invalid submission tokens response shape');
};

export const getStats = () => unwrap<AdminStatsResponse>(adminApiClient.get('/stats'));
export const getRfqs = () => unwrap<AdminRfqSummary[]>(adminApiClient.get('/rfqs'));
export const getRfq = (id: string | number) => unwrap<AdminRfqDetails>(adminApiClient.get(`/rfqs/${id}`));
export const deleteRfq = (id: string | number) => unwrap<void>(adminApiClient.delete(`/rfqs/${id}`));
export const getTokens = () => unwrap<AdminTokenRow[]>(adminApiClient.get('/tokens'));
export const disableToken = (tokenId: string | number) =>
  unwrap<AdminTokenRow>(adminApiClient.post(`/tokens/${tokenId}/disable`));
export const regenerateToken = (tokenId: string | number) =>
  unwrap<AdminTokenRow>(adminApiClient.post(`/tokens/${tokenId}/regenerate`));
export const getLogs = (params?: Record<string, unknown>) => unwrap<AdminLogEntry[]>(adminApiClient.get('/logs', { params }));
export const getSettings = () => unwrap<AdminSettings>(adminApiClient.get('/settings'));
export const updateSettings = (payload: AdminSettings) => unwrap<AdminSettings>(adminApiClient.post('/settings', payload));
export const generateSecureLink = (rfqId: string | number) =>
  unwrap<{ secureLink: AdminSecureLinkMeta }>(secureLinkApiClient.post(`/secure-link/${rfqId}`));
export const getQuotations = () => unwrap<AdminQuotationSummary[]>(adminApiClient.get('/quotations'));
export const getQuotation = (id: string) => unwrap<AdminQuotationDetails>(adminApiClient.get(`/quotations/${id}`));
export const updateQuotation = (id: string, payload: AdminQuotationUpdateRequest) =>
  unwrap<AdminQuotationDetails>(adminApiClient.patch(`/quotations/${id}`, payload));
export const regenerateQuotationPdf = (id: string) =>
  unwrap<AdminQuotationDetails>(adminApiClient.post(`/quotations/${id}/regenerate-pdf`));
export const deleteQuotation = (id: string) =>
  unwrap<{ message: string }>(adminApiClient.delete(`/quotations/${id}`));

export const listSubmissionTokens = async () => {
  const { data } = await adminApiClient.get<unknown>('/submission-tokens');
  return normalizeSubmissionTokens(data);
};

export const createSubmissionToken = (payload: AdminSubmissionTokenCreateRequest) =>
  unwrap<AdminSubmissionTokenCreateResponse>(adminApiClient.post('/submission-tokens', payload));

export const updateSubmissionToken = (id: string, payload: AdminSubmissionTokenUpdateRequest) =>
  unwrap<AdminSubmissionToken>(adminApiClient.patch(`/submission-tokens/${id}`, payload));

export const revokeSubmissionToken = (id: string) =>
  unwrap<AdminSubmissionToken>(adminApiClient.post(`/submission-tokens/${id}/revoke`));

export const deleteSubmissionToken = (id: string) =>
  unwrap<void>(adminApiClient.delete(`/submission-tokens/${id}`));
