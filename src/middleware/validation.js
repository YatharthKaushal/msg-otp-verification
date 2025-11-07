/**
 * @module middleware/validation
 * @description Request validation middleware for OTP operations
 */

import { sendValidationError } from '../utils/response.js';

/**
 * Validate mobile number format
 * @param {string} mobile - Mobile number to validate
 * @returns {Object} Validation result with isValid and error message
 */
const validateMobile = (mobile) => {
  if (!mobile) {
    return { isValid: false, error: 'Mobile number is required' };
  }

  // Remove spaces and special characters
  const cleanMobile = mobile.toString().replace(/[\s-+()]/g, '');

  // Check if it's a valid Indian mobile number (with or without country code)
  const indianMobileRegex = /^(91)?[6-9]\d{9}$/;

  if (!indianMobileRegex.test(cleanMobile)) {
    return {
      isValid: false,
      error: 'Invalid mobile number format. Please provide a valid 10-digit Indian mobile number'
    };
  }

  return { isValid: true, cleanMobile };
};

/**
 * Validate OTP format
 * @param {string} otp - OTP to validate
 * @returns {Object} Validation result with isValid and error message
 */
const validateOTPFormat = (otp) => {
  if (!otp) {
    return { isValid: false, error: 'OTP is required' };
  }

  // OTP should be 4-6 digits
  const otpRegex = /^\d{4,6}$/;

  if (!otpRegex.test(otp.toString())) {
    return {
      isValid: false,
      error: 'OTP must be between 4 and 6 digits'
    };
  }

  return { isValid: true };
};

/**
 * Middleware to validate send OTP request
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
export const validateSendOTP = (req, res, next) => {
  const errors = [];
  const { mobile, otp_length, otp_expiry } = req.body;

  // Validate mobile number
  const mobileValidation = validateMobile(mobile);
  if (!mobileValidation.isValid) {
    errors.push({ field: 'mobile', message: mobileValidation.error });
  } else {
    // Set cleaned mobile number
    req.body.mobile = mobileValidation.cleanMobile;
  }

  // Validate OTP length if provided
  if (otp_length !== undefined) {
    const length = parseInt(otp_length);
    if (isNaN(length) || length < 4 || length > 9) {
      errors.push({
        field: 'otp_length',
        message: 'OTP length must be between 4 and 9'
      });
    }
  }

  // Validate OTP expiry if provided
  if (otp_expiry !== undefined) {
    const expiry = parseInt(otp_expiry);
    if (isNaN(expiry) || expiry < 1 || expiry > 10) {
      errors.push({
        field: 'otp_expiry',
        message: 'OTP expiry must be between 1 and 10 minutes'
      });
    }
  }

  if (errors.length > 0) {
    return sendValidationError(res, errors);
  }

  next();
};

/**
 * Middleware to validate verify OTP request
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
export const validateVerifyOTP = (req, res, next) => {
  const errors = [];
  const { mobile, otp } = req.body;

  // Validate mobile number
  const mobileValidation = validateMobile(mobile);
  if (!mobileValidation.isValid) {
    errors.push({ field: 'mobile', message: mobileValidation.error });
  } else {
    // Set cleaned mobile number
    req.body.mobile = mobileValidation.cleanMobile;
  }

  // Validate OTP
  const otpValidation = validateOTPFormat(otp);
  if (!otpValidation.isValid) {
    errors.push({ field: 'otp', message: otpValidation.error });
  }

  if (errors.length > 0) {
    return sendValidationError(res, errors);
  }

  next();
};

/**
 * Middleware to validate resend OTP request
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
export const validateResendOTP = (req, res, next) => {
  const errors = [];
  const { mobile, retrytype } = req.body;

  // Validate mobile number
  const mobileValidation = validateMobile(mobile);
  if (!mobileValidation.isValid) {
    errors.push({ field: 'mobile', message: mobileValidation.error });
  } else {
    // Set cleaned mobile number
    req.body.mobile = mobileValidation.cleanMobile;
  }

  // Validate retry type if provided
  if (retrytype && !['text', 'voice'].includes(retrytype)) {
    errors.push({
      field: 'retrytype',
      message: 'Retry type must be either "text" or "voice"'
    });
  }

  if (errors.length > 0) {
    return sendValidationError(res, errors);
  }

  next();
};

/**
 * Middleware to validate send SMS request
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
export const validateSendSMS = (req, res, next) => {
  const errors = [];
  const { flow_id, recipients } = req.body;

  // Validate flow ID
  if (!flow_id || typeof flow_id !== 'string') {
    errors.push({
      field: 'flow_id',
      message: 'Flow ID is required and must be a string'
    });
  }

  // Validate recipients
  if (!recipients || !Array.isArray(recipients)) {
    errors.push({
      field: 'recipients',
      message: 'Recipients must be an array'
    });
  } else if (recipients.length === 0) {
    errors.push({
      field: 'recipients',
      message: 'At least one recipient is required'
    });
  } else {
    // Validate each recipient
    recipients.forEach((recipient, index) => {
      const mobile = recipient.mobiles || recipient.mobile;
      const mobileValidation = validateMobile(mobile);

      if (!mobileValidation.isValid) {
        errors.push({
          field: `recipients[${index}].mobile`,
          message: mobileValidation.error
        });
      }

      // Check if recipient has required template variables
      if (!recipient.name) {
        errors.push({
          field: `recipients[${index}].name`,
          message: 'Name is required for each recipient'
        });
      }
    });
  }

  if (errors.length > 0) {
    return sendValidationError(res, errors);
  }

  next();
};