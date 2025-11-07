/**
 * @module services/msg91
 * @description MSG91 service for OTP operations and SMS sending
 */

import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const MSG91_BASE_URL = 'https://control.msg91.com/api/v5';
const MSG91_FLOW_URL = 'https://control.msg91.com/api/v5/flow';

/**
 * MSG91 Service class for handling OTP and SMS operations
 * @class MSG91Service
 */
class MSG91Service {
  constructor() {
    this.authKey = process.env.MSG91_AUTH_KEY;
    this.flowId = process.env.MSG91_FLOW_ID;

    if (!this.authKey) {
      throw new Error('MSG91_AUTH_KEY is not configured in environment variables');
    }
  }

  /**
   * Get headers for MSG91 API requests
   * @private
   * @returns {Object} Headers object
   */
  getHeaders() {
    return {
      authkey: this.authKey,
      'Content-Type': 'application/json'
    };
  }

  /**
   * Send OTP to a mobile number
   * @param {string} mobile - Mobile number with country code (e.g., 919876543210)
   * @param {string} [template_id] - Optional template ID for custom OTP template
   * @param {number} [otp_length=6] - Length of OTP (4-9 digits)
   * @param {number} [otp_expiry=5] - OTP expiry time in minutes
   * @returns {Promise<Object>} API response
   * @throws {Error} If OTP sending fails
   */
  async sendOTP(mobile, template_id = null, otp_length = 6, otp_expiry = 5) {
    try {
      // Validate mobile number
      if (!mobile || mobile.length < 10) {
        throw new Error('Invalid mobile number');
      }

      // Ensure mobile has country code
      const formattedMobile = mobile.startsWith('91') ? mobile : `91${mobile}`;

      const url = `${MSG91_BASE_URL}/otp`;
      const params = {
        mobile: formattedMobile,
        otp_length,
        otp_expiry
      };

      if (template_id) {
        params.template_id = template_id;
      }

      const response = await axios.get(url, {
        params,
        headers: this.getHeaders()
      });

      return {
        success: true,
        message: 'OTP sent successfully',
        data: response.data
      };
    } catch (error) {
      console.error('Error sending OTP:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to send OTP');
    }
  }

  /**
   * Verify OTP
   * @param {string} mobile - Mobile number with country code
   * @param {string} otp - OTP to verify
   * @returns {Promise<Object>} Verification result
   * @throws {Error} If verification fails
   */
  async verifyOTP(mobile, otp) {
    try {
      // Validate inputs
      if (!mobile || mobile.length < 10) {
        throw new Error('Invalid mobile number');
      }

      if (!otp || otp.length < 4) {
        throw new Error('Invalid OTP');
      }

      // Ensure mobile has country code
      const formattedMobile = mobile.startsWith('91') ? mobile : `91${mobile}`;

      const url = `${MSG91_BASE_URL}/otp/verify`;
      const params = {
        mobile: formattedMobile,
        otp
      };

      const response = await axios.get(url, {
        params,
        headers: this.getHeaders()
      });

      return {
        success: true,
        message: 'OTP verified successfully',
        data: response.data
      };
    } catch (error) {
      console.error('Error verifying OTP:', error.response?.data || error.message);

      // Handle specific error cases
      if (error.response?.status === 400) {
        throw new Error('Invalid or expired OTP');
      }

      throw new Error(error.response?.data?.message || 'Failed to verify OTP');
    }
  }

  /**
   * Resend OTP to a mobile number
   * @param {string} mobile - Mobile number with country code
   * @param {string} [retrytype='text'] - Type of retry (text/voice)
   * @returns {Promise<Object>} API response
   * @throws {Error} If resend fails
   */
  async resendOTP(mobile, retrytype = 'text') {
    try {
      // Validate mobile number
      if (!mobile || mobile.length < 10) {
        throw new Error('Invalid mobile number');
      }

      // Ensure mobile has country code
      const formattedMobile = mobile.startsWith('91') ? mobile : `91${mobile}`;

      const url = `${MSG91_BASE_URL}/otp/retry`;
      const params = {
        mobile: formattedMobile,
        retrytype
      };

      const response = await axios.get(url, {
        params,
        headers: this.getHeaders()
      });

      return {
        success: true,
        message: 'OTP resent successfully',
        data: response.data
      };
    } catch (error) {
      console.error('Error resending OTP:', error.response?.data || error.message);

      // Handle rate limiting
      if (error.response?.status === 429) {
        throw new Error('Too many requests. Please try again later');
      }

      throw new Error(error.response?.data?.message || 'Failed to resend OTP');
    }
  }

  /**
   * Send SMS using MSG91 Flow API
   * @param {string} flowId - Flow/Template ID from MSG91
   * @param {Array<Object>} recipients - Array of recipient objects with mobile and variables
   * @returns {Promise<Object>} API response
   * @throws {Error} If SMS sending fails
   */
  async sendSMS(flowId, recipients) {
    try {
      // Validate inputs
      if (!flowId) {
        flowId = this.flowId;
        if (!flowId) {
          throw new Error('Flow ID is required');
        }
      }

      if (!Array.isArray(recipients) || recipients.length === 0) {
        throw new Error('Recipients array is required and cannot be empty');
      }

      // Format recipients with country code
      const formattedRecipients = recipients.map(recipient => {
        const mobile = recipient.mobiles || recipient.mobile;
        if (!mobile) {
          throw new Error('Mobile number is required for each recipient');
        }

        const formattedMobile = mobile.startsWith('91') ? mobile : `91${mobile}`;

        return {
          ...recipient,
          mobiles: formattedMobile
        };
      });

      const response = await axios.post(
        MSG91_FLOW_URL,
        {
          flow_id: flowId,
          recipients: formattedRecipients
        },
        {
          headers: this.getHeaders()
        }
      );

      return {
        success: true,
        message: 'SMS sent successfully',
        data: response.data
      };
    } catch (error) {
      console.error('Error sending SMS:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to send SMS');
    }
  }
}

// Export singleton instance
const msg91Service = new MSG91Service();
export default msg91Service;

// Export class for testing purposes
export { MSG91Service };