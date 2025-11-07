/**
 * @module utils/response
 * @description Standardized response utilities for API responses
 */

/**
 * Send a success response
 * @param {Object} res - Express response object
 * @param {string} message - Success message
 * @param {Object} [data={}] - Response data
 * @param {number} [statusCode=200] - HTTP status code
 * @returns {Object} Express response
 */
export const sendSuccess = (res, message, data = {}, statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    timestamp: new Date().toISOString()
  });
};

/**
 * Send an error response
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 * @param {number} [statusCode=400] - HTTP status code
 * @param {Object} [errors=null] - Additional error details
 * @returns {Object} Express response
 */
export const sendError = (res, message, statusCode = 400, errors = null) => {
  const response = {
    success: false,
    message,
    timestamp: new Date().toISOString()
  };

  if (errors) {
    response.errors = errors;
  }

  return res.status(statusCode).json(response);
};

/**
 * Send a validation error response
 * @param {Object} res - Express response object
 * @param {Array} errors - Array of validation errors
 * @returns {Object} Express response
 */
export const sendValidationError = (res, errors) => {
  return sendError(res, 'Validation failed', 422, errors);
};

/**
 * Send an internal server error response
 * @param {Object} res - Express response object
 * @param {string} [message='Internal server error'] - Error message
 * @param {Error} [error=null] - Error object for logging
 * @returns {Object} Express response
 */
export const sendServerError = (res, message = 'Internal server error', error = null) => {
  // Log the actual error for debugging
  if (error) {
    console.error('Server error:', error);
  }

  // Don't expose internal error details to client in production
  const errorMessage = process.env.NODE_ENV === 'development' && error
    ? error.message
    : message;

  return sendError(res, errorMessage, 500);
};