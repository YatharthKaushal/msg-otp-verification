/**
 * @module controllers/otp
 * @description Controller for handling OTP and SMS operations
 */

import msg91Service from '../services/msg91.js';
import { sendSuccess, sendError, sendServerError } from '../utils/response.js';

/**
 * Send OTP to a mobile number
 * @async
 * @param {Object} req - Express request object
 * @param {Object} req.body - Request body
 * @param {string} req.body.mobile - Mobile number (with or without country code)
 * @param {string} [req.body.template_id] - Optional MSG91 template ID
 * @param {number} [req.body.otp_length=6] - Length of OTP (4-9 digits)
 * @param {number} [req.body.otp_expiry=5] - OTP expiry in minutes
 * @param {Object} res - Express response object
 * @returns {Promise<Object>} JSON response with OTP sending status
 */
export const sendOTP = async (req, res) => {
  try {
    const { mobile, template_id, otp_length, otp_expiry } = req.body;

    // Call MSG91 service to send OTP
    const result = await msg91Service.sendOTP(
      mobile,
      template_id,
      otp_length,
      otp_expiry
    );

    // Return success response
    return sendSuccess(
      res,
      'OTP sent successfully',
      {
        mobile,
        otp_sent: true,
        expires_in: otp_expiry || 5,
        ...result.data
      },
      200
    );
  } catch (error) {
    console.error('Send OTP error:', error);

    // Handle specific error cases
    if (error.message.includes('Invalid mobile')) {
      return sendError(res, error.message, 400);
    }

    if (error.message.includes('Too many requests')) {
      return sendError(res, 'Rate limit exceeded. Please try again later', 429);
    }

    // Return generic server error
    return sendServerError(res, 'Failed to send OTP', error);
  }
};

/**
 * Verify OTP
 * @async
 * @param {Object} req - Express request object
 * @param {Object} req.body - Request body
 * @param {string} req.body.mobile - Mobile number
 * @param {string} req.body.otp - OTP to verify
 * @param {Object} res - Express response object
 * @returns {Promise<Object>} JSON response with verification status
 */
export const verifyOTP = async (req, res) => {
  try {
    const { mobile, otp } = req.body;

    // Call MSG91 service to verify OTP
    const result = await msg91Service.verifyOTP(mobile, otp);

    // Return success response
    return sendSuccess(
      res,
      'OTP verified successfully',
      {
        mobile,
        verified: true,
        ...result.data
      },
      200
    );
  } catch (error) {
    console.error('Verify OTP error:', error);

    // Handle specific error cases
    if (error.message.includes('Invalid or expired')) {
      return sendError(res, 'Invalid or expired OTP', 401);
    }

    if (error.message.includes('Invalid mobile')) {
      return sendError(res, error.message, 400);
    }

    // Return generic server error
    return sendServerError(res, 'Failed to verify OTP', error);
  }
};

/**
 * Resend OTP to a mobile number
 * @async
 * @param {Object} req - Express request object
 * @param {Object} req.body - Request body
 * @param {string} req.body.mobile - Mobile number
 * @param {string} [req.body.retrytype='text'] - Retry type (text/voice)
 * @param {Object} res - Express response object
 * @returns {Promise<Object>} JSON response with resend status
 */
export const resendOTP = async (req, res) => {
  try {
    const { mobile, retrytype = 'text' } = req.body;

    // Call MSG91 service to resend OTP
    const result = await msg91Service.resendOTP(mobile, retrytype);

    // Return success response
    return sendSuccess(
      res,
      'OTP resent successfully',
      {
        mobile,
        retry_type: retrytype,
        otp_resent: true,
        ...result.data
      },
      200
    );
  } catch (error) {
    console.error('Resend OTP error:', error);

    // Handle specific error cases
    if (error.message.includes('Too many requests')) {
      return sendError(res, 'Too many resend attempts. Please try again later', 429);
    }

    if (error.message.includes('Invalid mobile')) {
      return sendError(res, error.message, 400);
    }

    // Return generic server error
    return sendServerError(res, 'Failed to resend OTP', error);
  }
};

/**
 * Send SMS using MSG91 Flow
 * @async
 * @param {Object} req - Express request object
 * @param {Object} req.body - Request body
 * @param {string} req.body.flow_id - MSG91 Flow ID
 * @param {Array<Object>} req.body.recipients - Array of recipients
 * @param {Object} res - Express response object
 * @returns {Promise<Object>} JSON response with SMS sending status
 */
export const sendSMS = async (req, res) => {
  try {
    const { flow_id, recipients } = req.body;

    // Call MSG91 service to send SMS
    const result = await msg91Service.sendSMS(flow_id, recipients);

    // Return success response
    return sendSuccess(
      res,
      'SMS sent successfully',
      {
        flow_id,
        recipients_count: recipients.length,
        ...result.data
      },
      200
    );
  } catch (error) {
    console.error('Send SMS error:', error);

    // Handle specific error cases
    if (error.message.includes('Flow ID')) {
      return sendError(res, error.message, 400);
    }

    if (error.message.includes('Recipients')) {
      return sendError(res, error.message, 400);
    }

    // Return generic server error
    return sendServerError(res, 'Failed to send SMS', error);
  }
};

/**
 * Health check endpoint for MSG91 service
 * @async
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<Object>} JSON response with service status
 */
export const healthCheck = async (req, res) => {
  try {
    const isConfigured = !!process.env.MSG91_AUTH_KEY;
    const hasFlowId = !!process.env.MSG91_FLOW_ID;

    return sendSuccess(
      res,
      'MSG91 service is operational',
      {
        service: 'MSG91 OTP Service',
        status: 'healthy',
        configured: isConfigured,
        flow_configured: hasFlowId,
        timestamp: new Date().toISOString()
      },
      200
    );
  } catch (error) {
    return sendServerError(res, 'Service health check failed', error);
  }
};