import { uploadQuestionToDB } from './src/services/uploadService.js';
import { deleteQuestionFromMongoDB } from './src/services/mongodb.js';
import { initializeConfig } from './src/config/env.js';

// Initialize configuration
await initializeConfig();

// Use a unique ID each time
const testId = `test-question-real-${Date.now()}`;

// Delete test question if it exists
try {
  await deleteQuestionFromMongoDB(testId);
  console.log('Deleted existing test question');
} catch (error) {
  console.log('No existing test question to delete');
}

// Test question with a REAL publicly accessible image
const testQuestion = {
  id: testId,
  type: 'single',
  questionNumber: 1,
  subject: 'Physics',
  chapter: 'Mechanics',
  section: 'Kinematics',
  content: {
    text: 'What is shown in this diagram?',
    images: [
      'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3a/Cat03.jpg/200px-Cat03.jpg'
    ]
  },
  options: [
    { text: 'A cat', image_url: '' },
    { text: 'A dog', image_url: '' },
    { text: 'A bird', image_url: '' },
    { text: 'A fish', image_url: '' }
  ],
  answers: ['A cat']
};

console.log('\n=== Testing Image Upload with Real Image ===\n');
console.log('Test question:', JSON.stringify(testQuestion, null, 2));
console.log('\n=== Starting Upload ===\n');

try {
  const result = await uploadQuestionToDB(testQuestion);
  console.log('\n=== Upload Result ===\n');
  console.log(JSON.stringify(result, null, 2));
  
  if (result.success && result.s3Urls && result.s3Urls.length > 0) {
    console.log('\n✅ SUCCESS: Image was uploaded to S3!');
    console.log('S3 URLs:', result.s3Urls);
  } else if (result.success && result.failedImages) {
    console.log('\n⚠️  WARNING: Question saved but images failed to upload');
    console.log('Failed images:', result.failedImages);
  } else if (result.success) {
    console.log('\n⚠️  WARNING: Question saved but no images were uploaded');
  } else {
    console.log('\n❌ FAILED: Upload failed');
  }
} catch (error) {
  console.error('\n=== Upload Error ===\n');
  console.error(error);
}

process.exit(0);