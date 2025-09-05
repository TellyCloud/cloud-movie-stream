/**
 * Environment variable validation and access
 */

export const env = {
  TMDB_API_KEY: import.meta.env.VITE_TMDB_API_KEY || '15d2ea6d0dc1d476efbca3eba2b9bbfb',
  NODE_ENV: import.meta.env.NODE_ENV || 'development',
  DEV: import.meta.env.DEV || false,
} as const;

/**
 * Validates that required environment variables are present
 */
export function validateEnvironment(): void {
  const required = ['VITE_TMDB_API_KEY'];
  const missing = required.filter(key => !import.meta.env[key]);
  
  if (missing.length > 0 && import.meta.env.PROD) {
    console.warn(`Missing environment variables in production: ${missing.join(', ')}`);
  }
}

// Validate environment on import
validateEnvironment();