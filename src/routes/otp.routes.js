/**
 * @module routes/otp
 * @description OTP routes for MSG91 operations
 */

import { Router } from 'express';
import {
  sendOTP,
  verifyOTP,
  resendOTP,
  healthCheck
} from '../controllers/otp.controller.js';
import {
  validateSendOTP,
  validateVerifyOTP,
  validateResendOTP
} from '../middleware/validation.js';

const router = Router();

/**
 * @route POST /api/otp/send
 * @description Send OTP to a mobile number
 * @body {string} mobile - Mobile number (required)
 * @body {string} [template_id] - MSG91 template ID (optional)
 * @body {number} [otp_length=6] - Length of OTP (optional, 4-9)
 * @body {number} [otp_expiry=5] - OTP expiry in minutes (optional, 1-10)
 * @returns {Object} Success response with OTP sending status
 */
router.post('/send', validateSendOTP, sendOTP);

/**
 * @route POST /api/otp/verify
 * @description Verify OTP
 * @body {string} mobile - Mobile number (required)
 * @body {string} otp - OTP to verify (required)
 * @returns {Object} Success response with verification status
 */
router.post('/verify', validateVerifyOTP, verifyOTP);

/**
 * @route POST /api/otp/resend
 * @description Resend OTP to a mobile number
 * @body {string} mobile - Mobile number (required)
 * @body {string} [retrytype='text'] - Retry type: 'text' or 'voice' (optional)
 * @returns {Object} Success response with resend status
 */
router.post('/resend', validateResendOTP, resendOTP);

/**
 * @route GET /api/otp/health
 * @description Health check endpoint
 * @returns {Object} Service health status
 */
router.get('/health', healthCheck);

export default router;