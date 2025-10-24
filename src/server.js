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
      origin: (origin, callback) => {
        if (config.hostEnv === 'local') {
          // Allow any localhost port in development
          if (!origin || /^http:\/\/localhost:\d+$/.test(origin)) {
            callback(null, true);
          } else {
            callback(new Error('Not allowed by CORS'));
          }
        } else {
          // In production, allow the configured frontendUrl and any EC2 IP addresses
          const allowedOrigins = [config.frontendUrl];
          
          // Also allow EC2 public IPs (format: http://XX.XX.XX.XX:port)
          const isEC2IP = origin && /^http:\/\/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?$/.test(origin);
          
          if (!origin || allowedOrigins.includes(origin) || isEC2IP) {
            callback(null, true);
          } else {
            console.warn(`CORS blocked origin: ${origin}`);
            callback(new Error('Not allowed by CORS'));
          }
        }
      },
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
║   Frontend URL(s) Allowed: ${config.hostEnv === 'local' ? 'http://localhost:*' : config.frontendUrl}                 ║
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
