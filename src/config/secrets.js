import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import dotenv from 'dotenv';

/**
 * Secrets Manager Configuration
 * 
 * This module handles loading secrets from either:
 * - Local: .env file (for development)
 * - AWS: Secrets Manager (for production)
 * 
 * Environment detection:
 * - If NODE_ENV=production or AWS_EXECUTION_ENV exists → Use Secrets Manager
 * - Otherwise → Use .env file
 */

// Load .env for local development
dotenv.config();

// Determine if running in AWS
const isAWS = process.env.NODE_ENV === 'production' || 
              process.env.AWS_EXECUTION_ENV || 
              process.env.USE_SECRETS_MANAGER === 'true';

// Secret name in AWS Secrets Manager
const SECRET_NAME = process.env.AWS_SECRET_NAME || 'paperplane-v3/secrets';
const AWS_REGION = process.env.AWS_REGION || 'ap-southeast-2';

// Cache for loaded secrets
let secretsCache = null;

/**
 * Load secrets from AWS Secrets Manager
 */
async function loadFromSecretsManager() {
  console.log('🔐 Loading secrets from AWS Secrets Manager...');
  console.log(`   Region: ${AWS_REGION}`);
  console.log(`   Secret Name: ${SECRET_NAME}`);
  
  const client = new SecretsManagerClient({ region: AWS_REGION });
  
  try {
    const command = new GetSecretValueCommand({
      SecretId: SECRET_NAME,
    });
    
    const response = await client.send(command);
    
    if (response.SecretString) {
      const secrets = JSON.parse(response.SecretString);
      console.log('✅ Secrets loaded from AWS Secrets Manager');
      return secrets;
    } else {
      throw new Error('Secret value is empty');
    }
  } catch (error) {
    console.error('❌ Failed to load secrets from AWS Secrets Manager:', error.message);
    throw error;
  }
}

/**
 * Load secrets from .env file (local development)
 */
function loadFromEnv() {
  console.log('📁 Loading secrets from .env file (local development)');
  
  // Determine frontend URL based on HOST_ENV
  const hostEnv = process.env.HOST_ENV || 'local';
  const frontendUrl = hostEnv === 'production' 
    ? (process.env.FRONTEND_URL_PROD || 'http://3.27.210.229:5173')
    : (process.env.FRONTEND_URL_LOCAL || 'http://localhost:5173');
  
  console.log(`   HOST_ENV: ${hostEnv}`);
  console.log(`   Frontend URL: ${frontendUrl}`);
  
  return {
    // OpenAI
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    
    // AWS S3
    AWS_REGION: process.env.AWS_REGION,
    AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
    S3_BUCKET_NAME: process.env.S3_BUCKET_NAME,
    
    // MongoDB
    MONGODB_URI: process.env.MONGODB_URI,
    MONGODB_DATABASE: process.env.MONGODB_DATABASE || 'question_bank',
    MONGODB_COLLECTION: process.env.MONGODB_COLLECTION || 'questions',
    
    // Server
    PORT: process.env.PORT || 4000,
    NODE_ENV: process.env.NODE_ENV || 'development',
    HOST_ENV: hostEnv,
    FRONTEND_URL: frontendUrl,
    
    // Cognito (optional)
    COGNITO_USER_POOL_ID: process.env.COGNITO_USER_POOL_ID,
    COGNITO_CLIENT_ID: process.env.COGNITO_CLIENT_ID,
    COGNITO_REGION: process.env.COGNITO_REGION,
  };
}

/**
 * Initialize and load secrets based on environment
 */
export async function loadSecrets() {
  if (secretsCache) {
    return secretsCache;
  }
  
  console.log('\n🔑 Initializing secrets configuration...');
  console.log(`   Environment: ${isAWS ? 'AWS/Production' : 'Local/Development'}`);
  
  try {
    if (isAWS) {
      secretsCache = await loadFromSecretsManager();
    } else {
      secretsCache = loadFromEnv();
    }
    
    // Validate required secrets
    validateSecrets(secretsCache);
    
    console.log('✅ All secrets loaded and validated\n');
    return secretsCache;
    
  } catch (error) {
    console.error('❌ Failed to load secrets:', error.message);
    
    // Fallback to .env if Secrets Manager fails
    if (isAWS) {
      console.warn('⚠️  Falling back to .env file...');
      secretsCache = loadFromEnv();
      validateSecrets(secretsCache);
      return secretsCache;
    }
    
    throw error;
  }
}

/**
 * Validate that required secrets are present
 */
function validateSecrets(secrets) {
  const required = [
    'AWS_REGION',
    'AWS_ACCESS_KEY_ID',
    'AWS_SECRET_ACCESS_KEY',
    'S3_BUCKET_NAME',
    'MONGODB_URI',
  ];
  
  const missing = required.filter(key => !secrets[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required secrets: ${missing.join(', ')}`);
  }
}

/**
 * Get a specific secret value
 */
export function getSecret(key) {
  if (!secretsCache) {
    throw new Error('Secrets not loaded. Call loadSecrets() first.');
  }
  return secretsCache[key];
}

/**
 * Get all secrets
 */
export function getSecrets() {
  if (!secretsCache) {
    throw new Error('Secrets not loaded. Call loadSecrets() first.');
  }
  return secretsCache;
}

/**
 * Check if running in AWS
 */
export function isRunningInAWS() {
  return isAWS;
}

/**
 * Apply secrets to process.env (for backward compatibility)
 */
export function applySecretsToEnv(secrets) {
  Object.keys(secrets).forEach(key => {
    if (secrets[key]) {
      process.env[key] = secrets[key];
    }
  });
  console.log('✅ Secrets applied to process.env');
}
