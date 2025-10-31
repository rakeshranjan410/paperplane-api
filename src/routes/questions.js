import express from 'express';
import { uploadQuestionToDB, uploadMultipleQuestions } from '../services/uploadService.js';
import { getAllQuestions, getQuestionById, getFilterOptions, createIndexes, updateQuestionInMongoDB } from '../services/mongodb.js';

const router = express.Router();

/**
 * POST /api/questions/upload
 * Upload a single question to S3 and MongoDB
 */
router.post('/upload', async (req, res) => {
  try {
    const { question } = req.body;

    if (!question) {
      return res.status(400).json({
        success: false,
        message: 'Question data is required',
      });
    }

    // Validate question structure based on type
    const questionType = question.type || 'single';
    
    if (!question.id) {
      return res.status(400).json({
        success: false,
        message: 'Invalid question format. Required field: id',
      });
    }

    // Type-specific validation
    if (questionType === 'comprehension') {
      if (!question.comprehension_passage || !question.sub_questions) {
        return res.status(400).json({
          success: false,
          message: 'Comprehension questions require passage and sub_questions',
        });
      }
    } else if (questionType === 'matrix') {
      if (!question.matrix_match) {
        return res.status(400).json({
          success: false,
          message: 'Matrix questions require matrix_match field',
        });
      }
    } else if (questionType === 'integer') {
      if (!question.content) {
        return res.status(400).json({
          success: false,
          message: 'Integer questions require content field',
        });
      }
    } else {
      // For single/multiple choice - backward compatibility
      if (!question.content && !question.description) {
        return res.status(400).json({
          success: false,
          message: 'Questions require content or description field',
        });
      }
    }

    const result = await uploadQuestionToDB(question);

    const statusCode = result.success ? 200 : 400;
    res.status(statusCode).json(result);

  } catch (error) {
    console.error('Error uploading question:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
});

/**
 * POST /api/questions/upload-batch
 * Upload multiple questions at once
 */
router.post('/upload-batch', async (req, res) => {
  try {
    const { questions } = req.body;

    if (!questions || !Array.isArray(questions)) {
      return res.status(400).json({
        success: false,
        message: 'Questions array is required',
      });
    }

    if (questions.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Questions array cannot be empty',
      });
    }

    const result = await uploadMultipleQuestions(questions);

    res.status(200).json({
      success: true,
      ...result,
    });

  } catch (error) {
    console.error('Error uploading batch:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
});

/**
 * GET /api/questions
 * Get all questions from MongoDB with optional filtering
 * Query params: subject, chapter, section
 */
router.get('/', async (req, res) => {
  try {
    const filters = {};
    
    // Extract filter parameters from query string
    if (req.query.subject) {
      filters.subject = req.query.subject;
    }
    
    if (req.query.chapter) {
      filters.chapter = req.query.chapter;
    }
    
    if (req.query.section) {
      filters.section = req.query.section;
    }
    
    const questions = await getAllQuestions(filters);
    
    res.status(200).json({
      success: true,
      count: questions.length,
      filters: filters,
      questions,
    });
  } catch (error) {
    console.error('Error fetching questions:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
});

/**
 * GET /api/questions/filter-options
 * Get unique values for filter dropdowns
 */
router.get('/filter-options', async (req, res) => {
  try {
    const options = await getFilterOptions();
    res.status(200).json({
      success: true,
      options,
    });
  } catch (error) {
    console.error('Error fetching filter options:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
});

/**
 * POST /api/questions/create-indexes
 * Create database indexes for optimized filtering
 */
router.post('/create-indexes', async (req, res) => {
  try {
    await createIndexes();
    res.status(200).json({
      success: true,
      message: 'Indexes created successfully',
    });
  } catch (error) {
    console.error('Error creating indexes:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
});

/**
 * GET /api/questions/health
 * Health check endpoint
 */
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Questions API is healthy',
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /api/questions/image-proxy
 * Proxy images from S3 to avoid CORS issues
 */
router.get('/image-proxy', async (req, res) => {
  try {
    const { url } = req.query;
    
    if (!url) {
      return res.status(400).json({
        success: false,
        message: 'Image URL is required',
      });
    }

    // Fetch image from S3
    const fetch = (await import('node-fetch')).default;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }

    // Get content type
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    
    // Set headers
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    // Pipe the image
    response.body.pipe(res);

  } catch (error) {
    console.error('Error proxying image:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to proxy image',
    });
  }
});

/**
 * PUT /api/questions/:id
 * Update a question by MongoDB _id
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { question } = req.body;
    
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Question ID is required',
      });
    }

    if (!question) {
      return res.status(400).json({
        success: false,
        message: 'Question data is required',
      });
    }

    await updateQuestionInMongoDB(id, question);

    res.status(200).json({
      success: true,
      message: 'Question updated successfully',
    });
  } catch (error) {
    console.error('Error updating question:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update question',
    });
  }
});

/**
 * DELETE /api/questions/:id
 * Delete a question by MongoDB _id
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Question ID is required',
      });
    }

    const { deleteQuestionFromMongoDB } = await import('../services/mongodb.js');
    await deleteQuestionFromMongoDB(id);

    res.status(200).json({
      success: true,
      message: 'Question deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting question:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete question',
    });
  }
});

/**
 * POST /api/questions/delete-batch
 * Delete multiple questions by their MongoDB _ids
 */
router.post('/delete-batch', async (req, res) => {
  try {
    const { questionIds } = req.body;
    
    if (!questionIds || !Array.isArray(questionIds)) {
      return res.status(400).json({
        success: false,
        message: 'questionIds array is required',
      });
    }

    if (questionIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'questionIds array cannot be empty',
      });
    }

    const { deleteMultipleQuestionsFromMongoDB } = await import('../services/mongodb.js');
    const result = await deleteMultipleQuestionsFromMongoDB(questionIds);

    res.status(200).json({
      success: true,
      message: `Successfully deleted ${result.deletedCount} question(s)`,
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error('Error deleting questions:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete questions',
    });
  }
});

/**
 * GET /api/questions/:id
 * Get a specific question by ID
 * NOTE: This must come AFTER specific routes like /health and /image-proxy
 */
router.get('/:id', async (req, res) => {
  try {
    const question = await getQuestionById(req.params.id);
    
    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Question not found',
      });
    }

    res.status(200).json({
      success: true,
      question,
    });
  } catch (error) {
    console.error('Error fetching question:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
});

export default router;
