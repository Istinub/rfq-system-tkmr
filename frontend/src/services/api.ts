import axios, { type AxiosError } from 'axios';
import { z } from 'zod';
import {
  RFQSchema,
  type RFQ,
  type RFQRequest,
  CreateRFQResponseSchema,
  type CreateRFQResponse,
} from '@rfq-system/shared';
import { ADMIN_API_KEY_STORAGE_KEY } from './admin/adminApi';
import type { AdminQuotationDetails, AdminQuotationUpdateRequest } from './admin/types';

// ======================
// Types
// ======================
export interface HealthResponse {
  status: string;
  time: string;
}

export class ApiError extends Error {
  status?: number;
  payload?: unknown;

  constructor(message: string, status?: number, payload?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
  }
}

// ======================
// API BASE (PROXY MODE)
// ======================
const apiClient = axios.create({
  baseURL: '/api', // ✅ ALWAYS relative (Quasar proxy)
  timeout: 15000,
});

apiClient.defaults.headers.common.Accept = 'application/json';

const adminHeaders = () => {
  const key = (localStorage.getItem(ADMIN_API_KEY_STORAGE_KEY) ?? '').trim();
  return key ? { 'x-api-key': key } : {};
};

// ======================================
// Secure Link Metadata Schema
// ======================================
const SecureLinkMetadataSchema = z.object({
  token: z.string().min(1),
  rfqId: z.union([z.string().min(1), z.number().int().nonnegative()]),
  createdAt: z.string().min(1),
  expiresAt: z.string().min(1),
  firstAccessAt: z.string().nullable(),
  lastAccessIP: z.string().nullable(),
  oneTime: z.boolean(),
  accessCount: z.number().int().nonnegative(),
});

const SecureLinkDetailsResponseSchema = z.object({
  rfq: RFQSchema,
  secureLink: SecureLinkMetadataSchema,
});

export type SecureLinkMetadata = z.infer<typeof SecureLinkMetadataSchema>;
export type SecureLinkDetailsResponse = {
  rfq: RFQ;
  secureLink: SecureLinkMetadata;
};

// ======================================
// Error Extraction
// ======================================
const extractErrorMessage = (error: AxiosError): string => {
  const { response, message: fallbackMessage } = error;

  if (!response) return fallbackMessage || 'Request failed';

  const { data } = response;

  if (typeof data === 'string') return data;

  if (data && typeof data === 'object') {
    const record = data as Record<string, unknown>;

    if (typeof record.message === 'string' && record.message.trim()) {
      return record.message;
    }

    if (Array.isArray(record.errors) && record.errors.length > 0) {
      const first = record.errors[0];
      if (typeof first === 'string') return first;
    }
  }

  return fallbackMessage || 'Request failed';
};

// ======================================
// Global Response Interceptor
// ======================================
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error)) {
      const lowerMessage = (error.message || '').toLowerCase();
      const isTimeout = error.code === 'ECONNABORTED' || lowerMessage.includes('timeout');
      const isMultipartUpload = error.config?.url?.includes('/rfq/multipart');

      if (isTimeout && isMultipartUpload) {
        return Promise.reject(
          new ApiError(
            'Upload timed out. Your RFQ may still have been submitted. Please check the RFQ list and try again if needed.',
            408,
            error.response?.data
          )
        );
      }

      const message = extractErrorMessage(error);
      return Promise.reject(
        new ApiError(message, error.response?.status, error.response?.data)
      );
    }

    if (error instanceof Error) {
      return Promise.reject(new ApiError(error.message));
    }

    return Promise.reject(new ApiError('Unknown error'));
  }
);

// ======================================
// Health Check (PROXY)
// ======================================
export const healthCheck = async (): Promise<HealthResponse> => {
  const { data } = await axios.get<HealthResponse>('/health');
  return data;
};

// ======================================
// CREATE RFQ
// Backend payload:
// { rfq: {...}, secureLink?: {...} }
// ======================================
export const createRFQ = async (
  rfq: RFQRequest,
  submissionToken?: string
): Promise<CreateRFQResponse> => {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (submissionToken) {
    headers['x-submit-token'] = submissionToken;
  }

  const { data } = await apiClient.post('/rfq', rfq, {
    headers,
  });

  const parsed = CreateRFQResponseSchema.safeParse(data);
  if (!parsed.success) {
    console.error(parsed.error);
    throw new ApiError(
      'Invalid RFQ response payload',
      500,
      parsed.error.flatten()
    );
  }

  return parsed.data;
};

export const createRFQMultipart = async (
  formData: FormData,
  submissionToken?: string
): Promise<CreateRFQResponse> => {
  const headers: Record<string, string | undefined> = { 'Content-Type': undefined };
  if (submissionToken) {
    headers['x-submit-token'] = submissionToken;
  }

  const { data } = await apiClient.post('/rfq/multipart', formData, {
    headers,
    timeout: 30000,
  });

  const parsed = CreateRFQResponseSchema.safeParse(data);
  if (!parsed.success) {
    console.error(parsed.error);
    throw new ApiError(
      'Invalid RFQ response payload',
      500,
      parsed.error.flatten()
    );
  }

  return parsed.data;
};

// ======================================
// Secure Link Details
// ======================================
export const getSecureLinkDetails = async (
  token: string
): Promise<SecureLinkDetailsResponse> => {
  const trimmedToken = token.trim();

  if (!trimmedToken) {
    throw new ApiError('Secure token is required.');
  }

  const { data } = await apiClient.get(
    `/secure-link/${encodeURIComponent(trimmedToken)}`
  );

  const parsed = SecureLinkDetailsResponseSchema.safeParse(data);
  if (!parsed.success) {
    throw new ApiError(
      'Invalid secure link payload received',
      500,
      parsed.error.flatten()
    );
  }

  return parsed.data;
};

// ======================================
// Submit Quotation (Secure Link)
// ======================================
export type SubmitQuotationPayload = {
  vendorName: string;
  method?: 'FORM' | 'MANUAL_EMAIL';
  currency?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  notes?: string;
  lines?: Array<{ rfqItemId: string; unitPrice: number }>;
};

export const submitQuotation = async (
  token: string,
  payload: SubmitQuotationPayload,
  logoFile?: File | null
): Promise<{ quotation: { quotationLink: string; vendorName: string; method: string; createdAt: string } }> => {
  const trimmedToken = token.trim();
  if (!trimmedToken) {
    throw new ApiError('Secure token is required.');
  }

  const formData = new FormData();
  formData.append('vendorName', payload.vendorName);
  formData.append('method', payload.method ?? 'FORM');
  formData.append('currency', payload.currency ?? 'USD');
  if (payload.contactName) formData.append('contactName', payload.contactName);
  if (payload.contactEmail) formData.append('contactEmail', payload.contactEmail);
  if (payload.contactPhone) formData.append('contactPhone', payload.contactPhone);
  if (payload.notes) formData.append('notes', payload.notes);
  if (payload.lines) {
    formData.append('lines', JSON.stringify(payload.lines));
  }
  if (logoFile) {
    formData.append('logo', logoFile);
  }

  const { data } = await apiClient.post(
    `/secure-links/${encodeURIComponent(trimmedToken)}/quotations`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  );

  return data as { quotation: { quotationLink: string; vendorName: string; method: string; createdAt: string } };
};

// ======================================
// Admin Quotation Helpers
// ======================================
export const adminUpdateQuotation = async (
  id: string,
  payload: AdminQuotationUpdateRequest
): Promise<AdminQuotationDetails> => {
  const { data } = await apiClient.patch(`/admin/quotations/${id}`, payload, {
    headers: adminHeaders(),
  });
  return data;
};

export const adminDeleteQuotation = async (id: string): Promise<{ message: string }> => {
  const { data } = await apiClient.delete(`/admin/quotations/${id}`, {
    headers: adminHeaders(),
  });
  return data;
};

export const adminUpdateQuotationStatus = async (
  id: string,
  status: 'APPROVED' | 'REJECTED' | 'CUSTOMER_ACCEPTED',
  reason?: string
): Promise<{
  updated: true;
  quotation: AdminQuotationDetails;
  emailed: { vendor: boolean; rfqContact: boolean };
  emailedWarning?: { message: string } | null;
}> => {
  const { data } = await apiClient.patch(
    `/admin/quotations/${id}/status`,
    { status, reason },
    { headers: adminHeaders() }
  );
  return data;
};

export const updateRfqTkmrContact = async (
  rfqId: string,
  payload: { name: string; email: string; phone: string }
): Promise<{
  rfq: {
    id: string;
    publicId: string | null;
    tkmrContactName: string | null;
    tkmrContactEmail: string | null;
    tkmrContactPhone: string | null;
  };
}> => {
  const { data } = await apiClient.patch(
    `/admin/rfqs/${rfqId}/tkmr-contact`,
    payload,
    { headers: adminHeaders() }
  );
  return data;
};

export default apiClient;
