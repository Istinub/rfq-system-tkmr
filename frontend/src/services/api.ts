import axios, { type AxiosError } from 'axios';
import { z } from 'zod';
import { RFQSchema, type RFQRequest } from '@rfq-system/shared';

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

const resolvedBackendOrigin = (import.meta.env.VITE_BACKEND_ORIGIN ?? '').trim();
const backendOrigin = resolvedBackendOrigin || 'https://rfq-system-tkmr-backend.onrender.com';

const apiBaseUrl = import.meta.env.PROD
  ? 'https://rfq-tkmr.netlify.app/api'
  : '/api';

const apiClient = axios.create({
  baseURL: apiBaseUrl,
  timeout: 15000,
});

apiClient.defaults.headers.common['Content-Type'] = 'application/json';
apiClient.defaults.headers.common.Accept = 'application/json';

const CreateRFQResponseSchema = z.object({
  data: RFQSchema.pick({ id: true }),
});

export type CreateRFQResponse = z.infer<typeof CreateRFQResponseSchema>['data'];

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

const extractErrorMessage = (error: AxiosError): string => {
  const { response, message: fallbackMessage } = error;

  if (!response) {
    return fallbackMessage || 'Request failed';
  }

  const { data } = response;

  if (typeof data === 'string') {
    return data;
  }

  if (data && typeof data === 'object') {
    const record = data as Record<string, unknown>;

    if (typeof record.message === 'string' && record.message.trim().length > 0) {
      return record.message;
    }

    if (Array.isArray(record.errors) && record.errors.length > 0) {
      const first = record.errors[0];
      if (typeof first === 'string') {
        return first;
      }
    }
  }

  return fallbackMessage || 'Request failed';
};

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error)) {
      const message = extractErrorMessage(error);
      return Promise.reject(new ApiError(message, error.response?.status, error.response?.data));
    }

    if (error instanceof Error) {
      return Promise.reject(new ApiError(error.message));
    }

    return Promise.reject(new ApiError('Unknown error'));
  }
);

export const healthCheck = async (): Promise<HealthResponse> => {
  const normalizedOrigin = backendOrigin.replace(/\/$/, '');
  const healthUrl = normalizedOrigin ? `${normalizedOrigin}/health` : '/health';

  try {
    const { data } = await axios.get<HealthResponse>(healthUrl, {
      timeout: 15000,
      headers: {
        Accept: 'application/json',
      },
    });
    return data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const message = extractErrorMessage(error);
      throw new ApiError(message, error.response?.status, error.response?.data);
    }

    if (error instanceof Error) {
      throw new ApiError(error.message);
    }

    throw new ApiError('Unable to reach health endpoint');
  }
};

export const createRFQ = async (rfq: RFQRequest): Promise<CreateRFQResponse> => {
  const { data } = await apiClient.post('/rfq', rfq);
  const parsed = CreateRFQResponseSchema.safeParse(data);

  if (!parsed.success) {
    throw new ApiError('Invalid RFQ response payload', 500, parsed.error.flatten());
  }

  return parsed.data.data;
};

export const getSecureLinkDetails = async (token: string): Promise<SecureLinkDetailsResponse> => {
  const trimmedToken = token.trim();

  if (!trimmedToken) {
    throw new ApiError('Secure token is required.');
  }

  try {
    const { data } = await apiClient.get(`/secure/${encodeURIComponent(trimmedToken)}`);
    const parsed = SecureLinkDetailsResponseSchema.safeParse(data);

    if (!parsed.success) {
      throw new ApiError('Invalid secure link payload received', 500, parsed.error.flatten());
    }

    return parsed.data;
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.status === 400) {
        throw new ApiError('Secure token is invalid. Please check the link and try again.', error.status, error.payload);
      }

      if (error.status === 404) {
        throw new ApiError('No RFQ found for this secure token.', error.status, error.payload);
      }

      if (error.status === 410) {
        throw new ApiError('This secure link has expired. Request a new secure link.', error.status, error.payload);
      }

      if (error.status && error.status >= 400 && error.status < 500) {
        throw new ApiError('Unable to validate secure token.', error.status, error.payload);
      }
    }

    if (error instanceof Error) {
      throw error;
    }

    throw new ApiError('Unable to load secure link details');
  }
};

export default apiClient;
