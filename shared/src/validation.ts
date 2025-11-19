/**
 * Validation utilities placeholder
 * TODO: Implement validation logic using libraries like Zod or Joi
 */

export interface ValidationResult {
  valid: boolean;
  errors?: string[];
}

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePhone = (phone: string): boolean => {
  // Basic phone validation - can be enhanced
  const phoneRegex = /^\+?[\d\s\-()]+$/;
  return phone.length >= 10 && phoneRegex.test(phone);
};

export const validateRFQItem = (item: any): ValidationResult => {
  const errors: string[] = [];
  
  if (!item.productName || item.productName.trim().length === 0) {
    errors.push('Product name is required');
  }
  
  if (!item.quantity || item.quantity <= 0) {
    errors.push('Quantity must be greater than 0');
  }
  
  if (!item.unit || item.unit.trim().length === 0) {
    errors.push('Unit is required');
  }
  
  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined
  };
};

// Placeholder for future validation schemas
export const validationSchemas = {
  // TODO: Add Zod or Joi schemas here
};
