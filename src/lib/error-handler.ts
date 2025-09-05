/**
 * Centralized error handling for security-related issues
 */

export class SecurityError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'SecurityError';
  }
}

export class RateLimitError extends Error {
  constructor(message = 'Rate limit exceeded') {
    super(message);
    this.name = 'RateLimitError';
  }
}

export class ValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Logs security-related events (in development) and handles errors gracefully
 */
export function logSecurityEvent(event: string, details: any = {}) {
  if (import.meta.env.DEV) {
    console.warn('🔒 Security Event:', event, details);
  }
  
  // In production, this could send to monitoring service
  // monitoringService.logSecurityEvent(event, details);
}

/**
 * Safe error handler that doesn't leak sensitive information
 */
export function handleSecureError(error: unknown): string {
  if (error instanceof SecurityError) {
    logSecurityEvent('security_error', { message: error.message, code: error.code });
    return 'Security validation failed. Please try again.';
  }
  
  if (error instanceof RateLimitError) {
    logSecurityEvent('rate_limit_exceeded', { message: error.message });
    return 'Too many requests. Please wait a moment and try again.';
  }
  
  if (error instanceof ValidationError) {
    logSecurityEvent('validation_error', { message: error.message, field: error.field });
    return `Invalid ${error.field || 'input'}. Please check your input and try again.`;
  }
  
  // Generic error - don't expose details
  logSecurityEvent('unknown_error', { type: error?.constructor?.name });
  return 'An unexpected error occurred. Please try again later.';
}