import { config, initializeConfig } from './config/env.js';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import questionsRouter from './routes/questions.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

/**
 * Initialize and start the server
 */
async function startServer() {
  try {
    // Load configuration (from .env or AWS Secrets Manager)
    await initializeConfig();
    
    const app = express();
    const PORT = config.port;

    // Security middleware
    app.use(helmet());

    // CORS configuration
    const corsOptions = {
      origin: config.frontendUrl,
      credentials: true,
      optionsSuccessStatus: 200,
    };
    app.use(cors(corsOptions));

    // Body parsing middleware
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Logging middleware
    if (config.nodeEnv === 'development') {
      app.use(morgan('dev'));
    } else {
      app.use(morgan('combined'));
    }

    // Health check endpoint
    app.get('/health', (req, res) => {
      res.status(200).json({
        success: true,
        message: 'Markdown Q&A API is running',
        timestamp: new Date().toISOString(),
        environment: config.nodeEnv,
        secretsSource: config.secretsSource,
      });
    });

    // API Routes
    app.use('/api/questions', questionsRouter);

    // 404 handler
    app.use(notFoundHandler);

    // Error handler
    app.use(errorHandler);

    // Start server
    app.listen(PORT, () => {
      console.log(`
╔════════════════════════════════════════════════════════╗
║                                                        ║
║   🚀 Markdown Q&A API Server                          ║
║                                                        ║
║   Server running on: http://localhost:${PORT}           ║
║   Environment: ${config.nodeEnv}                      ║
║   Host Environment: ${config.hostEnv}                 ║
║   Secrets Source: ${config.secretsSource}             ║
║   Frontend URL: ${config.frontendUrl}                 ║
║                                                        ║
║   API Endpoints:                                       ║
║   - POST /api/questions/upload                         ║
║   - POST /api/questions/upload-batch                   ║
║   - GET  /api/questions                                ║
║   - GET  /api/questions/:id                            ║
║   - GET  /api/questions/image-proxy                    ║
║   - GET  /health                                       ║
║                                                        ║
╚════════════════════════════════════════════════════════╝
      `);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('SIGTERM signal received: closing HTTP server');
      process.exit(0);
    });

    process.on('SIGINT', () => {
      console.log('\nSIGINT signal received: closing HTTP server');
      process.exit(0);
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();
