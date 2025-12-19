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

export const getStats = () => unwrap<AdminStatsResponse>(adminApiClient.get('/stats'));
export const getRfqs = () => unwrap<AdminRfqSummary[]>(adminApiClient.get('/rfqs'));
export const getRfq = (id: string | number) => unwrap<AdminRfqDetails>(adminApiClient.get(`/rfqs/${id}`));
export const deleteRfq = (id: string | number) => unwrap<void>(adminApiClient.delete(`/rfqs/${id}`));
export const getTokens = () => unwrap<AdminTokenRow[]>(adminApiClient.get('/tokens'));
export const disableToken = (token: string) =>
  unwrap<void>(secureLinkApiClient.post(`/secure-link/invalidate/${encodeURIComponent(token)}`));
export const regenerateToken = (rfqId: string | number) => unwrap<void>(secureLinkApiClient.post(`/secure-link/${rfqId}`));
export const getLogs = (params?: Record<string, unknown>) => unwrap<AdminLogEntry[]>(adminApiClient.get('/logs', { params }));
export const getSettings = () => unwrap<AdminSettings>(adminApiClient.get('/settings'));
export const updateSettings = (payload: AdminSettings) => unwrap<AdminSettings>(adminApiClient.post('/settings', payload));
export const generateSecureLink = (rfqId: string | number) =>
  unwrap<{ secureLink: AdminSecureLinkMeta }>(secureLinkApiClient.post(`/secure-link/${rfqId}`));
