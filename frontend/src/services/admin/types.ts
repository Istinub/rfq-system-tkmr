export type TokenStatus = 'active' | 'expired' | 'disabled';

export interface RfqsPerMonthDatum {
  month: string;
  count: number;
}

export interface TokenUsageBreakdownDatum {
  label: string;
  value: number;
}

export interface AdminStatsResponse {
  totalRfqs: number;
  activeTokens: number;
  expiredTokens: number;
  totalAccesses: number;
  rfqsPerMonth: RfqsPerMonthDatum[];
  tokenUsageBreakdown: TokenUsageBreakdownDatum[];
}

export interface AdminRfqSummary {
  id: string;
  company: string;
  contactName: string;
  contactEmail: string;
  createdAt: string;
  tokenStatus: TokenStatus;
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

export interface AdminTokenRow {
  id: string;
  token: string;
  rfqId: string;
  createdAt: string;
  expiresAt: string;
  usageCount: number;
  status: TokenStatus;
}

export type AdminLogResult = 'success' | 'expired' | 'disabled';

export interface AdminLogEntry {
  id: string;
  timestamp: string;
  ip: string;
  userAgent: string;
  token: string;
  rfqId?: string | null;
  result: AdminLogResult;
}

export interface AdminSettings {
  tokenExpiryDays: number;
  oneTimeAccess: boolean;
  rateLimitPerMinute?: number;
}
