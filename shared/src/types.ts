import { z } from 'zod';

// RFQ Item Schema
export const RFQItemSchema = z.object({
  id: z.string().optional(),
  description: z.string().min(1, 'Description is required'),
  quantity: z.number().positive('Quantity must be positive'),
  unit: z.string().min(1, 'Unit is required'),
});

// RFQ Schema
export const RFQSchema = z.object({
  id: z.string().optional(),
  companyName: z.string().min(1, 'Company name is required'),
  contactPerson: z.string().min(1, 'Contact person is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  items: z.array(RFQItemSchema).min(1, 'At least one item is required'),
  notes: z.string().optional(),
  createdAt: z.string().optional(),
  status: z.enum(['draft', 'submitted', 'in_review', 'quoted', 'closed']).optional(),
});

// Secure Link Schema
export const SecureLinkSchema = z.object({
  token: z.string(),
  rfqId: z.string(),
  expiresAt: z.string(),
});

// Health Check Schema
export const HealthCheckSchema = z.object({
  status: z.enum(['ok', 'error']),
  timestamp: z.string(),
  version: z.string().optional(),
});

// Type exports
export type RFQItem = z.infer<typeof RFQItemSchema>;
export type RFQ = z.infer<typeof RFQSchema>;
export type SecureLink = z.infer<typeof SecureLinkSchema>;
export type HealthCheck = z.infer<typeof HealthCheckSchema>;
