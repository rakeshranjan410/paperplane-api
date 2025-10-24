# Image Upload to S3 - Issue Investigation & Fix

## Problem
Images were not being uploaded to S3 when questions were uploaded to the database.

## Root Causes Identified

### 1. **S3 Client Initialization Timing Issue** (PRIMARY ISSUE)
**Location:** `src/services/s3.js` lines 6-14

**Problem:**
The S3 client and bucket name were being initialized at module load time:
```javascript
const BUCKET_NAME = config.aws.s3BucketName;  // undefined at module load
const s3Client = new S3Client({...});          // created with undefined values
```

At module load time, the `config` object from `env.js` was not yet initialized (it starts as an empty object). The actual configuration is only populated when `initializeConfig()` is called in `server.js`, but by then the S3 client had already been created with undefined/empty values.

**Fix:**
Implemented lazy initialization pattern:
```javascript
let s3Client = null;
let BUCKET_NAME = null;

function getS3Client() {
  if (!s3Client) {
    BUCKET_NAME = config.aws.s3BucketName;
    s3Client = new S3Client({...});
  }
  return s3Client;
}
```

### 2. **S3 Bucket ACL Configuration Issue** (SECONDARY ISSUE)
**Location:** `src/services/s3.js` line 67

**Problem:**
The code was trying to set `ACL: 'public-read'` on uploaded objects, but the S3 bucket has ACLs disabled (modern AWS best practice).

**Error:**
```
AccessControlListNotSupported: The bucket does not allow ACLs
```

**Fix:**
Removed the ACL parameter from PutObjectCommand. The bucket should have a bucket policy configured for public read access instead.

### 3. **Silent Failure in Error Handling** (TERTIARY ISSUE)
**Location:** `src/services/uploadService.js` lines 88-92

**Problem:**
When image uploads failed, the code would log a warning but continue processing, saving the question to MongoDB with the original (non-S3) image URLs. No error was reported to the user.

**Fix:**
- Added detailed error tracking with `failedImages` array
- Modified success message to include warnings when images fail
- Return `failedImages` in the response so the frontend can display warnings

## Testing

Created test script `test-image-upload-real.js` that:
1. Downloads a real image from Wikipedia
2. Uploads it to S3
3. Saves question to MongoDB with S3 URL
4. Verifies the complete flow

**Test Result:**
```
✅ SUCCESS: Image was uploaded to S3!
S3 URLs: [
  'https://paperplane-diagrams.s3.ap-southeast-2.amazonaws.com/questions/8e5c99a65923c8b5bc7f17efdf1f1428ae45fe8a1731e6573e156c4d0496bcba.jpg'
]
```

## Files Modified

1. **`src/services/s3.js`**
   - Implemented lazy initialization for S3 client
   - Removed ACL parameter from uploads
   - Added validation for bucket name

2. **`src/services/uploadService.js`**
   - Enhanced logging throughout the upload process
   - Added `failedImages` tracking
   - Improved error messages to users

## How It Works Now

1. When a question is uploaded via `/api/questions/upload`:
   - The backend collects all image URLs from the question object
   - For each image URL:
     - Downloads the image
     - Uploads to S3 with a unique hash-based filename
     - Replaces the original URL with the S3 URL in the question object
   - Saves the question to MongoDB with S3 URLs
   - Returns success with list of S3 URLs or warnings if any failed

2. The S3 client is initialized on first use, ensuring configuration is loaded

3. If images fail to upload, the question is still saved but with warnings

## Verification

To verify the fix is working:
```bash
cd paperplane-api
node test-image-upload-real.js
```

You should see:
- ✅ S3 client initialized with bucket name
- ✅ Image downloaded successfully
- ✅ Image uploaded to S3
- ✅ Question saved to MongoDB with S3 URL

## Next Steps

1. **Frontend:** The frontend should display warnings when `failedImages` is present in the response
2. **S3 Bucket Policy:** Ensure the S3 bucket has a policy allowing public read access:
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Sid": "PublicReadGetObject",
         "Effect": "Allow",
         "Principal": "*",
         "Action": "s3:GetObject",
         "Resource": "arn:aws:s3:::paperplane-diagrams/questions/*"
       }
     ]
   }
   ```

## Date
Fixed: October 24, 2025