import { MongoClient, ObjectId } from 'mongodb';
import { config } from '../config/env.js';

let client = null;
let db = null;

/**
 * Connect to MongoDB
 */
async function connectToMongo() {
  if (db) {
    return db;
  }

  const uri = config.mongodb.uri;
  const dbName = config.mongodb.database;

  if (!uri) {
    throw new Error('MongoDB URI is not configured. Please set MONGODB_URI in your .env file');
  }

  console.log('Connecting to MongoDB...');
  
  client = new MongoClient(uri);
  await client.connect();
  
  db = client.db(dbName);
  console.log('Connected to MongoDB successfully');
  
  return db;
}

/**
 * Get the questions collection
 */
async function getQuestionsCollection() {
  const database = await connectToMongo();
  const collectionName = config.mongodb.collection;
  return database.collection(collectionName);
}

/**
 * Save question to MongoDB
 */
export async function saveQuestionToMongoDB(question, s3ImageUrl) {
  console.log('Saving question to MongoDB...');
  
  const collection = await getQuestionsCollection();
  
  const document = {
    ...question,
    uploadedAt: new Date(),
    originalImageUrl: question.imageUrl,
    s3ImageUrl: s3ImageUrl || question.imageUrl,
    imageUrl: s3ImageUrl || question.imageUrl, // Update imageUrl to S3 URL
  };

  const result = await collection.insertOne(document);
  
  console.log('Question saved to MongoDB with ID:', result.insertedId);
  
  return result.insertedId.toString();
}

/**
 * Update question in MongoDB
 */
export async function updateQuestionInMongoDB(documentId, updatedQuestion) {
  if (!documentId) {
    throw new Error('Document ID is required');
  }

  console.log('Updating question in MongoDB:', documentId);
  
  const collection = await getQuestionsCollection();
  
  const { _id, ...questionData } = updatedQuestion;
  
  const updateData = {
    ...questionData,
    updatedAt: new Date(),
  };

  const result = await collection.updateOne(
    { _id: new ObjectId(documentId) },
    { $set: updateData }
  );
  
  if (result.matchedCount === 0) {
    throw new Error('Question not found');
  }
  
  console.log('Question updated in MongoDB');
  return result;
}

/**
 * Delete question from MongoDB (used for rollback)
 */
export async function deleteQuestionFromMongoDB(documentId) {
  if (!documentId) {
    return;
  }

  console.log('Deleting question from MongoDB:', documentId);
  
  const collection = await getQuestionsCollection();
  await collection.deleteOne({ _id: new ObjectId(documentId) });
  
  console.log('Question deleted from MongoDB');
}

/**
 * Check if question already exists in MongoDB
 */
export async function questionExists(questionId) {
  const collection = await getQuestionsCollection();
  const count = await collection.countDocuments({ id: questionId });
  return count > 0;
}

/**
 * Get all questions from MongoDB with optional filtering
 */
export async function getAllQuestions(filters = {}) {
  const collection = await getQuestionsCollection();
  
  // Build query object based on provided filters
  const query = {};
  
  if (filters.subject) {
    query.subject = filters.subject;
  }
  
  if (filters.chapter) {
    query.chapter = filters.chapter;
  }
  
  if (filters.section) {
    query.section = filters.section;
  }
  
  console.log('Fetching questions with filters:', query);
  
  const questions = await collection.find(query).toArray();
  
  // Log first question for debugging
  if (questions.length > 0) {
    console.log('Sample question from DB:', {
      id: questions[0].id,
      subject: questions[0].subject,
      chapter: questions[0].chapter,
      section: questions[0].section,
    });
  }
  
  return questions;
}

/**
 * Get unique filter values for dropdowns
 */
export async function getFilterOptions() {
  const collection = await getQuestionsCollection();
  
  // Get distinct values for each filter field
  const subjects = await collection.distinct('subject');
  const chapters = await collection.distinct('chapter');
  const sections = await collection.distinct('section');
  
  return {
    subjects: subjects.filter(s => s && s !== 'Unknown').sort(),
    chapters: chapters.filter(c => c && c !== 'Unknown').sort(),
    sections: sections.filter(s => s && s !== 'Unknown').sort(),
  };
}

/**
 * Create indexes for optimized filtering
 */
export async function createIndexes() {
  const collection = await getQuestionsCollection();
  
  console.log('Creating indexes for optimized filtering...');
  
  // Create compound index for common filter combinations
  await collection.createIndex({ subject: 1, chapter: 1, section: 1 });
  
  // Create individual indexes for each filter field
  await collection.createIndex({ subject: 1 });
  await collection.createIndex({ chapter: 1 });
  await collection.createIndex({ section: 1 });
  
  // Create index on id field for faster lookups
  await collection.createIndex({ id: 1 }, { unique: true });
  
  console.log('Indexes created successfully');
}

/**
 * Get question by ID
 */
export async function getQuestionById(questionId) {
  const collection = await getQuestionsCollection();
  return await collection.findOne({ id: parseInt(questionId) });
}

/**
 * Close MongoDB connection
 */
export async function closeMongoConnection() {
  if (client) {
    await client.close();
    client = null;
    db = null;
    console.log('MongoDB connection closed');
  }
}
