import { Notify } from 'quasar';

export const handleAdminError = (error: unknown, context?: string): string => {
  let message = 'Unexpected error encountered.';

  if (error instanceof Error) {
    message = error.message || message;
  } else if (typeof error === 'string') {
    message = error;
  } else if (error && typeof error === 'object' && 'message' in error) {
    message = String((error as { message?: unknown }).message ?? message);
  }

  const text = context ? `${context}: ${message}` : message;

  Notify.create({
    type: 'negative',
    message: text,
    position: 'top-right',
    timeout: 4000,
  });

  return message;
};
