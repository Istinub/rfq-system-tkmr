export type TokenStatus = 'active' | 'expired' | 'disabled';

export type RfqSubmittedByType = 'ADMIN' | 'TOKEN';

export interface RfqsPerMonthDatum {
  month: string;
  count: number;
}

export interface TokenUsageBreakdownDatum {
  label: string;
  value: number;
}

export interface QuotationsPerMonthDatum {
  month: string;
  count: number;
}

export interface QuotationsByStatusDatum {
  label: string;
  value: number;
}

export interface AdminStatsResponse {
  totalRfqs: number;
  activeTokens: number;
  expiredTokens: number;
  totalAccesses: number;
  rfqsPerMonth: RfqsPerMonthDatum[];
  totalQuotations: number;
  quotationsByStatus: QuotationsByStatusDatum[];
  quotationsPerMonth: QuotationsPerMonthDatum[];
  tokenUsageBreakdown: TokenUsageBreakdownDatum[];
}

export interface AdminRfqSummary {
  id: string;
  publicId?: string | null;
  rfqNo?: number;
  company: string;
  contactName: string;
  contactEmail: string;
  createdAt: string;
  tokenStatus: TokenStatus;
  submittedByType?: RfqSubmittedByType | null;
  submittedByTokenId?: string | null;
  submittedByToken?: AdminSubmissionTokenMeta | null;
}

export interface AdminRfqItem {
  id: string;
  name: string;
  quantity: number;
  details?: string | null;
}

export interface AdminAttachment {
  id: string;
  fileName: string;
  fileUrl: string;
}

export interface AdminSecureLinkMeta {
  id: string;
  token: string;
  createdAt: string;
  expiresAt: string;
  accessCount: number;
  status: TokenStatus;
  lastAccessAt?: string | null;
  disabled?: boolean;
}

export interface AdminRfqDetails extends AdminRfqSummary {
  contactPhone?: string | null;
  notes?: string | null;
  items: AdminRfqItem[];
  attachments: AdminAttachment[];
  secureLink: AdminSecureLinkMeta | null;
}

export interface AdminSubmissionTokenMeta {
  id: string;
  createdAt: string;
  expiresAt?: string | null;
  maxUses?: number | null;
  uses?: number;
  revokedAt?: string | null;
}

export interface AdminTokenRow {
  id: string;
  tokenHash: string;
  tokenPreview: string;
  rfqId: string;
  rfqPublicId?: string | null;
  createdAt: string;
  expiresAt: string;
  usageCount: number;
  status: TokenStatus;
}

export interface AdminSubmissionToken extends AdminSubmissionTokenMeta {
  label?: string | null;
  expiresAt: string | null;
  maxUses: number | null;
  uses: number;
}

export interface AdminSubmissionTokenCreateRequest {
  label?: string | null;
  expiresAt?: string | null;
  maxUses?: number | null;
}

export type AdminSubmissionTokenCreateResponse = AdminSubmissionToken & { token: string };

export interface AdminSubmissionTokenUpdateRequest {
  label?: string | null;
  expiresAt?: string | null;
  maxUses?: number | null;
}

export type AdminLogResult = 'success' | 'expired' | 'disabled' | 'invalid';

export interface AdminLogEntry {
  id: string;
  timestamp: string;
  ip: string;
  userAgent: string;
  token: string;
  rfqId?: string | null;
  rfqPublicId?: string | null;
  result: AdminLogResult;
}

export interface AdminSettings {
  tokenExpiryDays: number;
  oneTimeAccess: boolean;
  rateLimitPerMinute?: number;
}

export type AdminQuotationStatus = 'RECEIVED' | 'REVISED' | 'APPROVED' | 'REJECTED' | 'CUSTOMER_ACCEPTED';

export interface AdminQuotationLine {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  details?: string | null;
}

export interface AdminQuotationSummary {
  id: string;
  rfq: { publicId?: string | null; company: string };
  vendorName: string;
  quotationLink: string;
  currency: string;
  status: AdminQuotationStatus;
  method: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminQuotationDetails extends AdminQuotationSummary {
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  notes?: string | null;
  driveFileId?: string | null;
  driveFolderId?: string | null;
  lines: AdminQuotationLine[];
}

export interface AdminQuotationUpdateRequest {
  vendorName?: string;
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  currency?: string;
  notes?: string | null;
  status?: AdminQuotationStatus;
  lines?: Array<{ id: string; unitPrice: number }>;
}
