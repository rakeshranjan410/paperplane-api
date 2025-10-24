import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import CryptoJS from 'crypto-js';
import fetch from 'node-fetch';
import { config } from '../config/env.js';

// Lazy initialization to ensure config is loaded first
let s3Client = null;
let BUCKET_NAME = null;

/**
 * Initialize S3 client with current config
 * This is called lazily to ensure config is loaded first
 */
function getS3Client() {
  if (!s3Client) {
    BUCKET_NAME = config.aws.s3BucketName;
    
    if (!BUCKET_NAME) {
      throw new Error('S3_BUCKET_NAME not configured. Make sure configuration is initialized.');
    }
    
    s3Client = new S3Client({
      region: config.aws.region,
      credentials: {
        accessKeyId: config.aws.accessKeyId,
        secretAccessKey: config.aws.secretAccessKey,
      },
    });
    
    console.log('S3 client initialized with bucket:', BUCKET_NAME);
  }
  return s3Client;
}

/**
 * Get the configured bucket name
 */
function getBucketName() {
  if (!BUCKET_NAME) {
    BUCKET_NAME = config.aws.s3BucketName;
    if (!BUCKET_NAME) {
      throw new Error('S3_BUCKET_NAME not configured. Make sure configuration is initialized.');
    }
  }
  return BUCKET_NAME;
}

/**
 * Generate a unique hash name for an image
 */
export function generateImageHash(imageUrl) {
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 15);
  const hash = CryptoJS.SHA256(`${imageUrl}-${timestamp}-${randomSuffix}`).toString();
  
  // Get file extension from URL or default to jpg
  const urlParts = imageUrl.split('?')[0].split('.');
  const extension = urlParts.length > 1 ? urlParts[urlParts.length - 1] : 'jpg';
  
  return `questions/${hash}.${extension}`;
}

/**
 * Download image from URL and convert to buffer
 */
async function downloadImage(imageUrl) {
  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`Failed to download image from ${imageUrl}: ${response.statusText}`);
  }
  
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Upload image to S3 bucket
 */
export async function uploadImageToS3(imageUrl) {
  console.log('uploadImageToS3: Starting image upload for URL:', imageUrl);
  if (!imageUrl) {
    console.error('uploadImageToS3: No image URL provided');
    throw new Error('No image URL provided');
  }

  try {
    console.log('uploadImageToS3: Downloading image from:', imageUrl);
    const imageBuffer = await downloadImage(imageUrl);
    
    const key = generateImageHash(imageUrl);
    const bucketName = getBucketName();
    const client = getS3Client();
    
    console.log('uploadImageToS3: Uploading to S3 with key:', key);
    
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: imageBuffer,
      ContentType: 'image/jpeg',
      // Note: ACL removed - bucket should have public read policy instead
    });

    await client.send(command);
    
    // Return the S3 URL
    const s3Url = `https://${bucketName}.s3.${config.aws.region}.amazonaws.com/${key}`;
    console.log('uploadImageToS3: Image uploaded successfully to:', s3Url);
    
    return s3Url;
  } catch (error) {
    console.error(`uploadImageToS3: Error uploading image ${imageUrl}:`, error);
    throw error; // Re-throw the error for upstream handling
  }
}

/**
 * Delete image from S3 bucket (used for rollback)
 */
export async function deleteImageFromS3(s3Key) {
  if (!s3Key) {
    return;
  }

  console.log('Deleting image from S3:', s3Key);
  
  const bucketName = getBucketName();
  const client = getS3Client();
  
  const command = new DeleteObjectCommand({
    Bucket: bucketName,
    Key: s3Key,
  });

  await client.send(command);
  console.log('Image deleted successfully from S3');
}

/**
 * Extract S3 key from S3 URL
 */
export function extractS3Key(s3Url) {
  const url = new URL(s3Url);
  return url.pathname.substring(1); // Remove leading slash
}
