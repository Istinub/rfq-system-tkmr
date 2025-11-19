import { 
  RFQSchema, 
  RFQItemSchema, 
  SecureLinkSchema, 
  HealthCheckSchema 
} from './types';

export const validateRFQ = (data: unknown) => {
  return RFQSchema.safeParse(data);
};

export const validateRFQItem = (data: unknown) => {
  return RFQItemSchema.safeParse(data);
};

export const validateSecureLink = (data: unknown) => {
  return SecureLinkSchema.safeParse(data);
};

export const validateHealthCheck = (data: unknown) => {
  return HealthCheckSchema.safeParse(data);
};
