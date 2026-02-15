import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: './.env' });

const requiredEnvVars = [
  'PORT',
  'NODE_ENV',
  'MONGO_URI',
  'ACCESS_TOKEN_SECRET',
  'REFRESH_TOKEN_SECRET',
  'CORS_ORIGIN',
];

const optionalEnvVars = [
  'LOG_LEVEL',
  'PAGE_LIMIT',
  'PASSWORD_LENGTH',
  'ACCESS_TOKEN_EXPIRY',
  'REFRESH_TOKEN_EXPIRY',
];

/**
 * Validate environment variables
 * Throws error if required vars are missing
 */
export function validateEnv() {
  const missingVars = requiredEnvVars.filter(
    (varName) => !process.env[varName]
  );

  if (missingVars.length > 0) {
    const error = new Error(
      `Missing required environment variables: ${missingVars.join(', ')}`
    );
    console.error('Environment validation failed:', missingVars);
    throw error;
  }

  // Validate values
  if (
    !['development', 'production', 'test'].includes(process.env.NODE_ENV)
  ) {
    throw new Error(
      'NODE_ENV must be development, production, or test'
    );
  }

  // Parse CORS_ORIGIN
  const corsOrigin = process.env.CORS_ORIGIN;
  if (corsOrigin === '*' && process.env.NODE_ENV === 'production') {
    console.warn('Warning: CORS_ORIGIN is * in production. This is a security risk.');
  }

  console.log('Environment variables validated successfully');
}

/**
 * Get parsed CORS origin
 */
export function getParsedCorsOrigin() {
  const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:3000';
  if (corsOrigin === '*') {
    return ['*'];
  }
  return corsOrigin.split(',').map(origin => origin.trim());
}

/**
 * Get environment config object
 */
export function getEnvConfig() {
  return {
    port: parseInt(process.env.PORT || '4000'),
    nodeEnv: process.env.NODE_ENV || 'development',
    mongoUri: process.env.MONGO_URI,
    corsOrigin: getParsedCorsOrigin(),
    logLevel: process.env.LOG_LEVEL || 'info',
    pageLimit: parseInt(process.env.PAGE_LIMIT || '10'),
    passwordLength: parseInt(process.env.PASSWORD_LENGTH || '8'),
    accessTokenSecret: process.env.ACCESS_TOKEN_SECRET,
    accessTokenExpiry: process.env.ACCESS_TOKEN_EXPIRY || '15m',
    refreshTokenSecret: process.env.REFRESH_TOKEN_SECRET,
    refreshTokenExpiry: process.env.REFRESH_TOKEN_EXPIRY || '10d',
    isDevelopment: process.env.NODE_ENV === 'development',
    isProduction: process.env.NODE_ENV === 'production',
  };
}
