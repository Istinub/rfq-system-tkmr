import axios, { type AxiosError } from 'axios';
import { z } from 'zod';
import {
  RFQSchema,
  type RFQRequest,
  CreateRFQResponseSchema,
  type CreateRFQResponse,
} from '@rfq-system/shared';

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

apiClient.defaults.headers.common['Content-Type'] = 'application/json';
apiClient.defaults.headers.common.Accept = 'application/json';

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
export type SecureLinkDetailsResponse = z.infer<typeof SecureLinkDetailsResponseSchema>;

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
  const { data } = await apiClient.get<HealthResponse>('/health');
  return data;
};

// ======================================
// CREATE RFQ
// Backend payload:
// { rfq: {...}, secureLink?: {...} }
// ======================================
export const createRFQ = async (
  rfq: RFQRequest
): Promise<CreateRFQResponse> => {
  const { data } = await apiClient.post('/rfq', rfq);

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

export default apiClient;
