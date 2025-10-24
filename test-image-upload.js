import { uploadQuestionToDB } from './src/services/uploadService.js';
import { initializeConfig } from './src/config/env.js';

// Initialize configuration
await initializeConfig();

// Test question with images
const testQuestion = {
  id: 'test-question-123',
  type: 'single',
  questionNumber: 1,
  subject: 'Physics',
  chapter: 'Mechanics',
  section: 'Kinematics',
  content: {
    text: 'What is the velocity of the object?',
    images: [
      'https://example.com/image1.jpg',
      'https://example.com/image2.png'
    ]
  },
  options: [
    { text: '10 m/s', image_url: '' },
    { text: '20 m/s', image_url: 'https://example.com/option-image.jpg' },
    { text: '30 m/s', image_url: '' },
    { text: '40 m/s', image_url: '' }
  ],
  answers: ['20 m/s']
};

console.log('\n=== Testing Image Upload ===\n');
console.log('Test question:', JSON.stringify(testQuestion, null, 2));
console.log('\n=== Starting Upload ===\n');

try {
  const result = await uploadQuestionToDB(testQuestion);
  console.log('\n=== Upload Result ===\n');
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  console.error('\n=== Upload Error ===\n');
  console.error(error);
}

process.exit(0);