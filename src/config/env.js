import { loadSecrets, applySecretsToEnv, isRunningInAWS } from './secrets.js';

// Configuration object (will be populated after secrets are loaded)
export let config = {
  port: 4000,
  nodeEnv: 'development',
  frontendUrl: 'http://localhost:3000',
  aws: {},
  mongodb: {},
};

/**
 * Initialize configuration by loading secrets
 * This must be called before starting the server
 */
export async function initializeConfig() {
  try {
    // Load secrets from either .env or AWS Secrets Manager
    const secrets = await loadSecrets();
    
    // Apply secrets to process.env for backward compatibility
    applySecretsToEnv(secrets);
    
    // Build config object
    config = {
      // Server
      port: secrets.PORT || 4000,
      nodeEnv: secrets.NODE_ENV || 'development',
      hostEnv: secrets.HOST_ENV || 'local',
      frontendUrl: secrets.FRONTEND_URL || 'http://localhost:5173',
      
      // AWS S3
      aws: {
        region: secrets.AWS_REGION,
        accessKeyId: secrets.AWS_ACCESS_KEY_ID,
        secretAccessKey: secrets.AWS_SECRET_ACCESS_KEY,
        s3BucketName: secrets.S3_BUCKET_NAME,
      },
      
      // MongoDB
      mongodb: {
        uri: secrets.MONGODB_URI,
        database: secrets.MONGODB_DATABASE || 'question_bank',
        collection: secrets.MONGODB_COLLECTION || 'questions',
      },
      
      // Metadata
      secretsSource: isRunningInAWS() ? 'AWS Secrets Manager' : 'Local .env',
    };
    
    console.log(`✅ Configuration initialized (Source: ${config.secretsSource})\n`);
    
    return config;
    
  } catch (error) {
    console.error('\n❌ FATAL: Failed to initialize configuration');
    console.error(error.message);
    process.exit(1);
  }
}

export default config;
