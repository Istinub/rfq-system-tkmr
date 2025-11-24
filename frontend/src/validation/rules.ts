type ValidationResult = true | string;

const isEmpty = (value: unknown): boolean => {
  if (value === null || value === undefined) {
    return true;
  }

  if (typeof value === 'string') {
    return value.trim().length === 0;
  }

  if (Array.isArray(value)) {
    return value.length === 0;
  }

  return false;
};

export const required = (value: unknown): ValidationResult => {
  return isEmpty(value) ? 'This field is required' : true;
};

export const emailRule = (value: string | null | undefined): ValidationResult => {
  if (value === null || value === undefined) {
    return 'Email is required';
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return 'Email is required';
  }

  const emailPattern = /^[\w.!#$%&'*+/=?^`{|}~-]+@[\w-]+(?:\.[\w-]+)+$/i;
  return emailPattern.test(trimmed) ? true : 'Enter a valid email address';
};
