import { uploadImageToS3, deleteImageFromS3, extractS3Key } from './s3.js';
import { saveQuestionToMongoDB, deleteQuestionFromMongoDB, questionExists } from './mongodb.js';

/**
 * Helper to collect all image URLs from question
 */
function collectImageUrls(question) {
  const imageUrls = [];

  // Legacy imageUrl field
  if (question.imageUrl) {
    imageUrls.push(question.imageUrl);
  }

  // Content images
  if (question.content?.images) {
    imageUrls.push(...question.content.images);
  }

  // Option images
  if (question.options) {
    question.options.forEach(opt => {
      if (opt.image_url) {
        imageUrls.push(opt.image_url);
      }
    });
  }

  // Comprehension passage images
  if (question.comprehension_passage?.images) {
    imageUrls.push(...question.comprehension_passage.images);
  }

  // Sub-question images
  if (question.sub_questions) {
    question.sub_questions.forEach(subQ => {
      if (subQ.content?.images) {
        imageUrls.push(...subQ.content.images);
      }
      if (subQ.options) {
        subQ.options.forEach(opt => {
          if (opt.image_url) {
            imageUrls.push(opt.image_url);
          }
        });
      }
    });
  }

  // Remove duplicates and filter out empty strings
  return [...new Set(imageUrls.filter(url => url && url.trim()))];
}

/**
 * Upload question to S3 and MongoDB with rollback mechanism
 */
export async function uploadQuestionToDB(question) {
  const uploadedS3Keys = [];
  const s3UrlMap = new Map(); // originalUrl -> s3Url
  let mongoId = undefined;

  try {
    // Check if question already exists
    const exists = await questionExists(question.id);
    if (exists) {
      console.warn(`Question ${question.id} already exists in database`);
      return {
        success: false,
        message: `Question ${question.id} already exists in database. Please delete it first or use a different question.`,
      };
    }

    // Step 1: Upload all images to S3
    const imageUrls = collectImageUrls(question);
    
    if (imageUrls.length > 0) {
      console.log(`Step 1: Uploading ${imageUrls.length} image(s) to S3...`);
      
      for (const imageUrl of imageUrls) {
        try {
          const s3Url = await uploadImageToS3(imageUrl);
          s3UrlMap.set(imageUrl, s3Url);
          uploadedS3Keys.push(extractS3Key(s3Url));
          console.log(`✓ Image uploaded to S3: ${s3Url}`);
        } catch (error) {
          console.warn(`Failed to upload image ${imageUrl}:`, error.message);
          // Continue with other images
        }
      }
    }

    // Step 2: Replace image URLs with S3 URLs in question object
    const questionWithS3Urls = replaceImageUrls(question, s3UrlMap);

    // Step 3: Save to MongoDB with updated S3 URLs
    console.log('Step 2: Saving question to MongoDB...');
    mongoId = await saveQuestionToMongoDB(questionWithS3Urls, s3UrlMap.get(question.imageUrl));
    console.log('✓ Question saved to MongoDB with ID:', mongoId);

    return {
      success: true,
      message: 'Successfully uploaded to database!',
      s3Urls: Array.from(s3UrlMap.values()),
      mongoId,
    };

  } catch (error) {
    console.error('Upload failed, initiating rollback...', error);

    // Rollback: Delete from MongoDB if it was saved
    if (mongoId) {
      try {
        console.log('Rolling back: Deleting from MongoDB...');
        await deleteQuestionFromMongoDB(mongoId);
        console.log('✓ Rollback: MongoDB entry deleted');
      } catch (rollbackError) {
        console.error('Rollback failed for MongoDB:', rollbackError);
      }
    }

    // Rollback: Delete all uploaded images from S3
    for (const s3Key of uploadedS3Keys) {
      try {
        console.log(`Rolling back: Deleting from S3: ${s3Key}...`);
        await deleteImageFromS3(s3Key);
        console.log('✓ Rollback: S3 image deleted');
      } catch (rollbackError) {
        console.error('Rollback failed for S3:', rollbackError);
      }
    }

    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return {
      success: false,
      message: `Upload failed: ${errorMessage}. All changes have been rolled back.`,
    };
  }
}

/**
 * Replace all image URLs in question with S3 URLs
 */
function replaceImageUrls(question, s3UrlMap) {
  const updated = { ...question };

  // Legacy imageUrl
  if (updated.imageUrl && s3UrlMap.has(updated.imageUrl)) {
    updated.imageUrl = s3UrlMap.get(updated.imageUrl);
  }

  // Content images
  if (updated.content?.images) {
    updated.content.images = updated.content.images.map(url => 
      s3UrlMap.get(url) || url
    );
  }

  // Option images
  if (updated.options) {
    updated.options = updated.options.map(opt => {
      if (opt.image_url && s3UrlMap.has(opt.image_url)) {
        return { ...opt, image_url: s3UrlMap.get(opt.image_url) };
      }
      return opt;
    });
  }

  // Comprehension passage images
  if (updated.comprehension_passage?.images) {
    updated.comprehension_passage.images = updated.comprehension_passage.images.map(url =>
      s3UrlMap.get(url) || url
    );
  }

  // Sub-question images
  if (updated.sub_questions) {
    updated.sub_questions = updated.sub_questions.map(subQ => {
      const updatedSubQ = { ...subQ };
      
      if (updatedSubQ.content?.images) {
        updatedSubQ.content.images = updatedSubQ.content.images.map(url =>
          s3UrlMap.get(url) || url
        );
      }
      
      if (updatedSubQ.options) {
        updatedSubQ.options = updatedSubQ.options.map(opt => {
          if (opt.image_url && s3UrlMap.has(opt.image_url)) {
            return { ...opt, image_url: s3UrlMap.get(opt.image_url) };
          }
          return opt;
        });
      }
      
      return updatedSubQ;
    });
  }

  return updated;
}

/**
 * Batch upload multiple questions
 */
export async function uploadMultipleQuestions(questions) {
  const results = [];
  let successful = 0;
  let failed = 0;

  for (const question of questions) {
    const result = await uploadQuestionToDB(question);
    results.push(result);
    
    if (result.success) {
      successful++;
    } else {
      failed++;
    }
  }

  return { successful, failed, results };
}
