/**
 * @module routes/sms
 * @description SMS routes for MSG91 operations
 */

import { Router } from 'express';
import { sendSMS } from '../controllers/otp.controller.js';
import { validateSendSMS } from '../middleware/validation.js';

const router = Router();

/**
 * @route POST /api/sms/send
 * @description Send SMS using MSG91 Flow
 * @body {string} flow_id - MSG91 Flow ID (required)
 * @body {Array<Object>} recipients - Array of recipient objects (required)
 * @returns {Object} Success response with SMS sending status
 */
router.post('/send', validateSendSMS, sendSMS);

export default router;