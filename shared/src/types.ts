import type { RFQ, RFQContact } from './schemas/rfq.schema';
import type { RFQItem } from './schemas/rfqItem.schema';
import type { SecureLink } from './types/secureLink.types';

export type { RFQ, RFQItem, RFQContact, SecureLink };

export interface ApiSuccess<T> {
  success: true;
  data: T;
  message?: string;
}

export interface ApiErrorResponse {
  success: false;
  error: string;
  message?: string;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiErrorResponse;
