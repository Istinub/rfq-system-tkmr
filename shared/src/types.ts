/**
 * RFQ (Request for Quotation) types
 */

export interface RFQItem {
  id: string;
  productName: string;
  quantity: number;
  unit: string;
  description?: string;
}

export interface RFQ {
  id: string;
  companyName: string;
  contactEmail: string;
  contactPhone?: string;
  items: RFQItem[];
  notes?: string;
  createdAt: Date;
  status: 'pending' | 'submitted' | 'processing' | 'completed' | 'cancelled';
}

export interface CreateRFQRequest {
  companyName: string;
  contactEmail: string;
  contactPhone?: string;
  items: Omit<RFQItem, 'id'>[];
  notes?: string;
}

export interface RFQResponse {
  success: boolean;
  data?: RFQ;
  error?: string;
  message?: string;
}
