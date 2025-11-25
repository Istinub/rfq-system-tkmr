import axios, { type AxiosError } from 'axios';
import { z } from 'zod';
import { RFQSchema, type RFQ } from '@rfq-system/shared';

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

const apiClient = axios.create({
  baseURL: '/api',
  timeout: 15000,
});

apiClient.defaults.headers.common['Content-Type'] = 'application/json';
apiClient.defaults.headers.common.Accept = 'application/json';

const CreateRFQResponseSchema = z.object({
  id: z.string().min(1, 'Missing RFQ identifier'),
  secureLinkToken: z.string().min(1).optional(),
});

export type CreateRFQResponse = z.infer<typeof CreateRFQResponseSchema>;

const SecureLinkMetadataSchema = z.object({
  token: z.string().min(1),
  createdAt: z.string().min(1),
  expires: z.string().min(1),
  oneTime: z.boolean(),
  firstAccessAt: z.string().min(1).nullable(),
  accessCount: z.number().int().nonnegative(),
  accessLogs: z.array(
    z.object({
      time: z.string().min(1),
      ip: z.string().optional(),
      userAgent: z.string().optional(),
    })
  ),
});

const SecureLinkDetailsResponseSchema = z.object({
  rfq: RFQSchema,
  link: SecureLinkMetadataSchema,
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
  const { data } = await apiClient.get<HealthResponse>('/health');
  return data;
};

export const createRFQ = async (rfq: RFQ): Promise<CreateRFQResponse> => {
  const { data } = await apiClient.post('/rfq', rfq);
  const parsed = CreateRFQResponseSchema.safeParse(data);

  if (!parsed.success) {
    throw new ApiError('Invalid RFQ response payload', 500, parsed.error.flatten());
  }

  return parsed.data;
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
