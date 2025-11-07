/**
 * @module server
 * @description Main Express server configuration for MSG91 OTP Service
 */

import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import routes from './src/routes/index.js';
import { sendError, sendServerError } from './src/utils/response.js';

// Load environment variables
dotenv.config();

// Create Express app
const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Security middleware
app.use(helmet());
app.use(cors({
  origin: '*',  // Allow all origins
  credentials: true
}));

// Logging middleware
if (NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Trust proxy for proper IP handling
app.set('trust proxy', 1);

// API Routes
app.use('/api', routes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'MSG91 OTP Service API',
    version: '1.0.0',
    documentation: '/api',
    environment: NODE_ENV,
    timestamp: new Date().toISOString()
  });
});

// 404 handler - Must be after all routes
app.use((req, res) => {
  sendError(res, `Route ${req.method} ${req.path} not found`, 404);
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Global error handler:', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    body: req.body,
    timestamp: new Date().toISOString()
  });

  // Handle specific error types
  if (err.name === 'ValidationError') {
    return sendError(res, 'Validation error', 422, err.errors);
  }

  if (err.name === 'UnauthorizedError') {
    return sendError(res, 'Unauthorized', 401);
  }

  if (err.code === 'LIMIT_FILE_SIZE') {
    return sendError(res, 'File size limit exceeded', 413);
  }

  if (err.type === 'entity.parse.failed') {
    return sendError(res, 'Invalid JSON in request body', 400);
  }

  // Default server error
  return sendServerError(res, 'An unexpected error occurred', err);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Log the error but don't exit in development
  if (NODE_ENV === 'production') {
    process.exit(1);
  }
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Log the error but don't exit in development
  if (NODE_ENV === 'production') {
    process.exit(1);
  }
});

// Graceful shutdown
const gracefulShutdown = () => {
  console.log('Received shutdown signal, closing server gracefully...');
  server.close(() => {
    console.log('Server closed successfully');
    process.exit(0);
  });

  // Force shutdown after 10 seconds
  setTimeout(() => {
    console.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

// Listen for shutdown signals
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Start server
const server = app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════╗
║     MSG91 OTP Service API Server           ║
╠════════════════════════════════════════════╣
║  Environment: ${NODE_ENV.padEnd(28)} ║
║  Port: ${PORT.toString().padEnd(36)} ║
║  API Base: http://localhost:${PORT}/api      ║
║                                            ║
║  Available Endpoints:                      ║
║  • POST /api/otp/send                     ║
║  • POST /api/otp/verify                   ║
║  • POST /api/otp/resend                   ║
║  • POST /api/sms/send                     ║
║  • GET  /api/health                       ║
╚════════════════════════════════════════════╝
  `);
});

export default app;