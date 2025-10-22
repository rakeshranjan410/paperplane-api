import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import CryptoJS from 'crypto-js';
import fetch from 'node-fetch';
import { config } from '../config/env.js';

const BUCKET_NAME = config.aws.s3BucketName;

const s3Client = new S3Client({
  region: config.aws.region,
  credentials: {
    accessKeyId: config.aws.accessKeyId,
    secretAccessKey: config.aws.secretAccessKey,
  },
});

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
  if (!imageUrl) {
    throw new Error('No image URL provided');
  }

  console.log('Downloading image from:', imageUrl);
  const imageBuffer = await downloadImage(imageUrl);
  
  const key = generateImageHash(imageUrl);
  
  console.log('Uploading to S3 with key:', key);
  
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: imageBuffer,
    ContentType: 'image/jpeg',
    ACL: 'public-read', // Make images publicly accessible
  });

  await s3Client.send(command);
  
  // Return the S3 URL
  const s3Url = `https://${BUCKET_NAME}.s3.${config.aws.region}.amazonaws.com/${key}`;
  console.log('Image uploaded successfully to:', s3Url);
  
  return s3Url;
}

/**
 * Delete image from S3 bucket (used for rollback)
 */
export async function deleteImageFromS3(s3Key) {
  if (!s3Key) {
    return;
  }

  console.log('Deleting image from S3:', s3Key);
  
  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: s3Key,
  });

  await s3Client.send(command);
  console.log('Image deleted successfully from S3');
}

/**
 * Extract S3 key from S3 URL
 */
export function extractS3Key(s3Url) {
  const url = new URL(s3Url);
  return url.pathname.substring(1); // Remove leading slash
}
