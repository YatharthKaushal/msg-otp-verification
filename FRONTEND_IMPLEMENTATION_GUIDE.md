# React Native Frontend Implementation Guide for MSG91 OTP Service

## Overview
This guide provides step-by-step instructions for implementing MSG91 OTP authentication in a React Native application (iOS & Android) without Expo. The implementation is structured in phases for systematic development.

## Table of Contents
1. [API Endpoints Reference](#api-endpoints-reference)
2. [Phase 1: Project Setup & Configuration](#phase-1-project-setup--configuration)
3. [Phase 2: API Service Layer](#phase-2-api-service-layer)
4. [Phase 3: UI Components](#phase-3-ui-components)
5. [Phase 4: State Management](#phase-4-state-management)
6. [Phase 5: Error Handling & Edge Cases](#phase-5-error-handling--edge-cases)
7. [Phase 6: Platform-Specific Implementation](#phase-6-platform-specific-implementation)
8. [Phase 7: Testing & Optimization](#phase-7-testing--optimization)

---

## API Endpoints Reference

### Base URL
```
Development: http://localhost:3000/api
Production: https://your-domain.com/api
```

### 1. Send OTP
**Endpoint:** `POST /api/otp/send`

**Request Body:**
```json
{
  "mobile": "9876543210",
  "otp_length": 6,        // Optional: 4-9, default 6
  "otp_expiry": 5         // Optional: 1-10 minutes, default 5
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "OTP sent successfully",
  "data": {
    "mobile": "919876543210",
    "otp_sent": true,
    "expires_in": 5
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**Error Responses:**
- **400 Bad Request:**
  ```json
  {
    "success": false,
    "message": "Invalid mobile number",
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
  ```
- **429 Rate Limited:**
  ```json
  {
    "success": false,
    "message": "Rate limit exceeded. Please try again later",
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
  ```
- **500 Server Error:**
  ```json
  {
    "success": false,
    "message": "Failed to send OTP",
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
  ```

### 2. Verify OTP
**Endpoint:** `POST /api/otp/verify`

**Request Body:**
```json
{
  "mobile": "9876543210",
  "otp": "123456"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "OTP verified successfully",
  "data": {
    "mobile": "919876543210",
    "verified": true
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**Error Responses:**
- **401 Unauthorized:**
  ```json
  {
    "success": false,
    "message": "Invalid or expired OTP",
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
  ```
- **422 Validation Error:**
  ```json
  {
    "success": false,
    "message": "Validation failed",
    "errors": [
      {
        "field": "otp",
        "message": "OTP must be between 4 and 6 digits"
      }
    ],
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
  ```

### 3. Resend OTP
**Endpoint:** `POST /api/otp/resend`

**Request Body:**
```json
{
  "mobile": "9876543210",
  "retrytype": "text"     // Optional: "text" or "voice", default "text"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "OTP resent successfully",
  "data": {
    "mobile": "919876543210",
    "retry_type": "text",
    "otp_resent": true
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

---

## Phase 1: Project Setup & Configuration

### Step 1.1: Create React Native Project
```bash
# Create new React Native project without Expo
npx react-native init OTPAuthApp --template react-native-template-typescript
cd OTPAuthApp
```

### Step 1.2: Install Required Dependencies
```bash
# Core dependencies
npm install axios react-native-async-storage/async-storage
npm install react-navigation/native react-navigation/stack
npm install react-native-screens react-native-safe-area-context
npm install react-native-gesture-handler react-native-reanimated

# UI dependencies
npm install react-native-vector-icons react-native-paper
npm install react-native-keyboard-aware-scroll-view

# State management (optional but recommended)
npm install zustand

# Form validation
npm install react-hook-form yup

# iOS specific
cd ios && pod install && cd ..
```

### Step 1.3: Environment Configuration

**Create `src/config/env.ts`:**
```typescript
interface Environment {
  API_BASE_URL: string;
  OTP_LENGTH: number;
  OTP_EXPIRY_MINUTES: number;
  MAX_RESEND_ATTEMPTS: number;
  RESEND_COOLDOWN_SECONDS: number;
}

const DEV: Environment = {
  API_BASE_URL: 'http://10.0.2.2:3000/api', // Android emulator
  // API_BASE_URL: 'http://localhost:3000/api', // iOS simulator
  OTP_LENGTH: 6,
  OTP_EXPIRY_MINUTES: 5,
  MAX_RESEND_ATTEMPTS: 3,
  RESEND_COOLDOWN_SECONDS: 30,
};

const PROD: Environment = {
  API_BASE_URL: 'https://your-production-api.com/api',
  OTP_LENGTH: 6,
  OTP_EXPIRY_MINUTES: 5,
  MAX_RESEND_ATTEMPTS: 3,
  RESEND_COOLDOWN_SECONDS: 60,
};

export const ENV = __DEV__ ? DEV : PROD;
```

---

## Phase 2: API Service Layer

### Step 2.1: Create API Client

**Create `src/services/api/client.ts`:**
```typescript
import axios, { AxiosInstance, AxiosError, AxiosResponse } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ENV } from '../../config/env';

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  errors?: Array<{ field: string; message: string }>;
  timestamp: string;
}

export interface ApiError {
  message: string;
  statusCode: number;
  errors?: Array<{ field: string; message: string }>;
}

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: ENV.API_BASE_URL,
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor
    this.client.interceptors.request.use(
      async (config) => {
        // Add auth token if available
        const token = await AsyncStorage.getItem('authToken');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        console.error('Request error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response: AxiosResponse<ApiResponse>) => {
        console.log(`API Response: ${response.config.url}`, response.data);
        return response;
      },
      (error: AxiosError<ApiResponse>) => {
        const apiError = this.handleError(error);
        console.error('API Error:', apiError);
        return Promise.reject(apiError);
      }
    );
  }

  private handleError(error: AxiosError<ApiResponse>): ApiError {
    if (error.response) {
      // Server responded with error
      const { data, status } = error.response;
      return {
        message: data?.message || 'An error occurred',
        statusCode: status,
        errors: data?.errors,
      };
    } else if (error.request) {
      // Request made but no response
      return {
        message: 'Network error. Please check your connection',
        statusCode: 0,
      };
    } else {
      // Request setup error
      return {
        message: error.message || 'An unexpected error occurred',
        statusCode: -1,
      };
    }
  }

  public getInstance(): AxiosInstance {
    return this.client;
  }
}

export default new ApiClient();
```

### Step 2.2: Create OTP Service

**Create `src/services/api/otpService.ts`:**
```typescript
import apiClient, { ApiResponse, ApiError } from './client';
import { AxiosResponse } from 'axios';

// Type definitions
export interface SendOTPRequest {
  mobile: string;
  otp_length?: number;
  otp_expiry?: number;
}

export interface SendOTPResponse {
  mobile: string;
  otp_sent: boolean;
  expires_in: number;
}

export interface VerifyOTPRequest {
  mobile: string;
  otp: string;
}

export interface VerifyOTPResponse {
  mobile: string;
  verified: boolean;
}

export interface ResendOTPRequest {
  mobile: string;
  retrytype?: 'text' | 'voice';
}

export interface ResendOTPResponse {
  mobile: string;
  retry_type: string;
  otp_resent: boolean;
}

class OTPService {
  private api = apiClient.getInstance();

  /**
   * Send OTP to mobile number
   */
  async sendOTP(data: SendOTPRequest): Promise<SendOTPResponse> {
    try {
      const response: AxiosResponse<ApiResponse<SendOTPResponse>> =
        await this.api.post('/otp/send', data);

      if (!response.data.success) {
        throw new Error(response.data.message);
      }

      return response.data.data!;
    } catch (error) {
      throw this.handleServiceError(error, 'Failed to send OTP');
    }
  }

  /**
   * Verify OTP
   */
  async verifyOTP(data: VerifyOTPRequest): Promise<VerifyOTPResponse> {
    try {
      const response: AxiosResponse<ApiResponse<VerifyOTPResponse>> =
        await this.api.post('/otp/verify', data);

      if (!response.data.success) {
        throw new Error(response.data.message);
      }

      return response.data.data!;
    } catch (error) {
      throw this.handleServiceError(error, 'Failed to verify OTP');
    }
  }

  /**
   * Resend OTP
   */
  async resendOTP(data: ResendOTPRequest): Promise<ResendOTPResponse> {
    try {
      const response: AxiosResponse<ApiResponse<ResendOTPResponse>> =
        await this.api.post('/otp/resend', data);

      if (!response.data.success) {
        throw new Error(response.data.message);
      }

      return response.data.data!;
    } catch (error) {
      throw this.handleServiceError(error, 'Failed to resend OTP');
    }
  }

  /**
   * Handle service errors
   */
  private handleServiceError(error: any, fallbackMessage: string): Error {
    if ((error as ApiError).statusCode !== undefined) {
      const apiError = error as ApiError;

      // Handle specific error codes
      switch (apiError.statusCode) {
        case 429:
          return new Error('Too many attempts. Please try again later.');
        case 401:
          return new Error('Invalid or expired OTP. Please try again.');
        case 422:
          const validationErrors = apiError.errors?.map(e => e.message).join(', ');
          return new Error(validationErrors || 'Invalid input');
        case 0:
          return new Error('No internet connection. Please check your network.');
        default:
          return new Error(apiError.message || fallbackMessage);
      }
    }

    return new Error(error.message || fallbackMessage);
  }
}

export default new OTPService();
```

---

## Phase 3: UI Components

### Step 3.1: Phone Number Input Component

**Create `src/components/PhoneInput.tsx`:**
```typescript
import React, { useState, useRef } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  KeyboardTypeOptions,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import * as yup from 'yup';

interface PhoneInputProps {
  onSubmit: (mobile: string) => Promise<void>;
  loading?: boolean;
  error?: string | null;
}

const schema = yup.object().shape({
  mobile: yup
    .string()
    .required('Mobile number is required')
    .matches(/^[6-9]\d{9}$/, 'Enter a valid 10-digit mobile number')
    .length(10, 'Mobile number must be 10 digits'),
});

export const PhoneInput: React.FC<PhoneInputProps> = ({
  onSubmit,
  loading = false,
  error
}) => {
  const { control, handleSubmit, formState: { errors } } = useForm({
    defaultValues: { mobile: '' },
  });
  const [countryCode] = useState('+91');
  const inputRef = useRef<TextInput>(null);

  const onSubmitForm = async (data: { mobile: string }) => {
    try {
      await onSubmit(data.mobile);
    } catch (err) {
      console.error('Phone submission error:', err);
    }
  };

  const formatPhoneNumber = (text: string): string => {
    // Remove all non-numeric characters
    const cleaned = text.replace(/\D/g, '');
    // Limit to 10 digits
    return cleaned.slice(0, 10);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Enter Your Mobile Number</Text>
      <Text style={styles.subtitle}>
        We'll send you a verification code
      </Text>

      <View style={styles.inputContainer}>
        <View style={styles.countryCodeContainer}>
          <Text style={styles.countryCode}>{countryCode}</Text>
        </View>

        <Controller
          control={control}
          name="mobile"
          rules={{
            required: 'Mobile number is required',
            pattern: {
              value: /^[6-9]\d{9}$/,
              message: 'Enter a valid 10-digit mobile number',
            },
          }}
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              ref={inputRef}
              style={styles.input}
              placeholder="Enter mobile number"
              placeholderTextColor="#999"
              keyboardType={Platform.select<KeyboardTypeOptions>({
                ios: 'number-pad',
                android: 'numeric',
                default: 'numeric',
              })}
              maxLength={10}
              value={value}
              onChangeText={(text) => onChange(formatPhoneNumber(text))}
              onBlur={onBlur}
              editable={!loading}
              autoFocus
              textContentType="telephoneNumber"
              autoComplete="tel"
            />
          )}
        />
      </View>

      {/* Error Messages */}
      {errors.mobile && (
        <Text style={styles.errorText}>{errors.mobile.message}</Text>
      )}
      {error && !errors.mobile && (
        <Text style={styles.errorText}>{error}</Text>
      )}

      {/* Submit Button */}
      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleSubmit(onSubmitForm)}
        disabled={loading}
        activeOpacity={0.8}
      >
        {loading ? (
          <ActivityIndicator color="#FFF" size="small" />
        ) : (
          <Text style={styles.buttonText}>Send OTP</Text>
        )}
      </TouchableOpacity>

      {/* Terms Text */}
      <Text style={styles.termsText}>
        By continuing, you agree to our Terms & Privacy Policy
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 30,
  },
  inputContainer: {
    flexDirection: 'row',
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    paddingBottom: 10,
  },
  countryCodeContainer: {
    justifyContent: 'center',
    marginRight: 10,
  },
  countryCode: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    paddingVertical: Platform.OS === 'ios' ? 10 : 5,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  buttonDisabled: {
    backgroundColor: '#B0B0B0',
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 12,
    marginTop: 5,
  },
  termsText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 20,
  },
});
```

### Step 3.2: OTP Input Component

**Create `src/components/OTPInput.tsx`:**
```typescript
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Keyboard,
} from 'react-native';
import { ENV } from '../config/env';

interface OTPInputProps {
  mobile: string;
  onVerify: (otp: string) => Promise<void>;
  onResend: () => Promise<void>;
  loading?: boolean;
  error?: string | null;
  otpLength?: number;
  expiryMinutes?: number;
}

export const OTPInput: React.FC<OTPInputProps> = ({
  mobile,
  onVerify,
  onResend,
  loading = false,
  error,
  otpLength = ENV.OTP_LENGTH,
  expiryMinutes = ENV.OTP_EXPIRY_MINUTES,
}) => {
  const [otp, setOtp] = useState<string[]>(new Array(otpLength).fill(''));
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [resendDisabled, setResendDisabled] = useState(true);
  const [resendTimer, setResendTimer] = useState(ENV.RESEND_COOLDOWN_SECONDS);
  const [resendAttempts, setResendAttempts] = useState(0);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  useEffect(() => {
    // Start resend timer
    const timer = setInterval(() => {
      setResendTimer((prev) => {
        if (prev <= 1) {
          setResendDisabled(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [resendAttempts]);

  useEffect(() => {
    // Auto-focus first input
    inputRefs.current[0]?.focus();
  }, []);

  const handleOTPChange = (value: string, index: number) => {
    // Only allow numeric input
    if (value && !/^\d$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < otpLength - 1) {
      inputRefs.current[index + 1]?.focus();
      setFocusedIndex(index + 1);
    }

    // Auto-submit when all digits entered
    if (value && index === otpLength - 1) {
      const otpString = newOtp.join('');
      if (otpString.length === otpLength) {
        Keyboard.dismiss();
        handleVerify(otpString);
      }
    }
  };

  const handleBackspace = (index: number) => {
    if (otp[index] === '' && index > 0) {
      inputRefs.current[index - 1]?.focus();
      setFocusedIndex(index - 1);
    }
  };

  const handleVerify = async (otpString?: string) => {
    const code = otpString || otp.join('');
    if (code.length !== otpLength) {
      return;
    }

    try {
      await onVerify(code);
    } catch (err) {
      console.error('OTP verification error:', err);
    }
  };

  const handleResend = async () => {
    if (resendDisabled || resendAttempts >= ENV.MAX_RESEND_ATTEMPTS) {
      return;
    }

    try {
      await onResend();
      setResendAttempts(resendAttempts + 1);
      setResendTimer(ENV.RESEND_COOLDOWN_SECONDS);
      setResendDisabled(true);
      setOtp(new Array(otpLength).fill(''));
      inputRefs.current[0]?.focus();
    } catch (err) {
      console.error('OTP resend error:', err);
    }
  };

  const formatTimer = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const maskedMobile = mobile.slice(0, 2) + '****' + mobile.slice(-4);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Verify Your Number</Text>
      <Text style={styles.subtitle}>
        Enter the {otpLength}-digit code sent to +91 {maskedMobile}
      </Text>

      {/* OTP Input Boxes */}
      <View style={styles.otpContainer}>
        {otp.map((digit, index) => (
          <TouchableOpacity
            key={index}
            onPress={() => inputRefs.current[index]?.focus()}
            activeOpacity={1}
          >
            <View
              style={[
                styles.otpBox,
                focusedIndex === index && styles.otpBoxFocused,
                error && styles.otpBoxError,
              ]}
            >
              <TextInput
                ref={(ref) => (inputRefs.current[index] = ref)}
                style={styles.otpInput}
                value={digit}
                onChangeText={(value) => handleOTPChange(value, index)}
                onKeyPress={({ nativeEvent }) => {
                  if (nativeEvent.key === 'Backspace') {
                    handleBackspace(index);
                  }
                }}
                onFocus={() => setFocusedIndex(index)}
                keyboardType="number-pad"
                maxLength={1}
                editable={!loading}
                selectTextOnFocus
                textContentType="oneTimeCode"
                autoComplete={Platform.select({
                  ios: 'one-time-code',
                  android: 'sms-otp',
                  default: 'off',
                })}
              />
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* Error Message */}
      {error && (
        <Text style={styles.errorText}>{error}</Text>
      )}

      {/* Verify Button */}
      <TouchableOpacity
        style={[
          styles.button,
          (loading || otp.join('').length !== otpLength) && styles.buttonDisabled,
        ]}
        onPress={() => handleVerify()}
        disabled={loading || otp.join('').length !== otpLength}
        activeOpacity={0.8}
      >
        {loading ? (
          <ActivityIndicator color="#FFF" size="small" />
        ) : (
          <Text style={styles.buttonText}>Verify OTP</Text>
        )}
      </TouchableOpacity>

      {/* Resend Section */}
      <View style={styles.resendContainer}>
        {resendDisabled ? (
          <Text style={styles.resendTimerText}>
            Resend code in {formatTimer(resendTimer)}
          </Text>
        ) : (
          <>
            {resendAttempts >= ENV.MAX_RESEND_ATTEMPTS ? (
              <Text style={styles.resendLimitText}>
                Maximum resend attempts reached
              </Text>
            ) : (
              <TouchableOpacity onPress={handleResend} disabled={loading}>
                <Text style={styles.resendText}>
                  Didn't receive code? <Text style={styles.resendLink}>Resend</Text>
                </Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </View>

      {/* Expiry Notice */}
      <Text style={styles.expiryText}>
        OTP expires in {expiryMinutes} minutes
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 30,
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
    gap: 10,
  },
  otpBox: {
    width: 45,
    height: 50,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF',
  },
  otpBoxFocused: {
    borderColor: '#007AFF',
    borderWidth: 2,
  },
  otpBoxError: {
    borderColor: '#FF3B30',
  },
  otpInput: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    width: '100%',
    height: '100%',
  },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  buttonDisabled: {
    backgroundColor: '#B0B0B0',
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 12,
    marginTop: 5,
    textAlign: 'center',
  },
  resendContainer: {
    alignItems: 'center',
    marginTop: 30,
  },
  resendText: {
    fontSize: 14,
    color: '#666',
  },
  resendLink: {
    color: '#007AFF',
    fontWeight: '600',
  },
  resendTimerText: {
    fontSize: 14,
    color: '#999',
  },
  resendLimitText: {
    fontSize: 14,
    color: '#FF3B30',
  },
  expiryText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 20,
  },
});
```

---

## Phase 4: State Management

### Step 4.1: Create Auth Store (using Zustand)

**Create `src/stores/authStore.ts`:**
```typescript
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import otpService from '../services/api/otpService';

export type AuthStep = 'phone' | 'otp' | 'authenticated';

interface AuthState {
  // State
  step: AuthStep;
  mobile: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  resendCount: number;
  lastOTPSentAt: Date | null;

  // Actions
  sendOTP: (mobile: string) => Promise<void>;
  verifyOTP: (otp: string) => Promise<void>;
  resendOTP: () => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
  checkAuthStatus: () => Promise<void>;
}

const useAuthStore = create<AuthState>((set, get) => ({
  // Initial state
  step: 'phone',
  mobile: null,
  isAuthenticated: false,
  loading: false,
  error: null,
  resendCount: 0,
  lastOTPSentAt: null,

  // Send OTP
  sendOTP: async (mobile: string) => {
    set({ loading: true, error: null });

    try {
      const response = await otpService.sendOTP({ mobile });

      set({
        mobile,
        step: 'otp',
        loading: false,
        lastOTPSentAt: new Date(),
        resendCount: 0,
      });

      // Store mobile for session persistence
      await AsyncStorage.setItem('pendingMobile', mobile);

    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to send OTP',
      });
      throw error;
    }
  },

  // Verify OTP
  verifyOTP: async (otp: string) => {
    const { mobile } = get();
    if (!mobile) {
      set({ error: 'Mobile number not found' });
      return;
    }

    set({ loading: true, error: null });

    try {
      const response = await otpService.verifyOTP({ mobile, otp });

      if (response.verified) {
        // Save auth state
        await AsyncStorage.setItem('isAuthenticated', 'true');
        await AsyncStorage.setItem('authMobile', mobile);
        await AsyncStorage.removeItem('pendingMobile');

        set({
          isAuthenticated: true,
          step: 'authenticated',
          loading: false,
          error: null,
        });

        // Here you would typically save the JWT token or session
        // await AsyncStorage.setItem('authToken', response.token);

      } else {
        set({
          loading: false,
          error: 'Invalid OTP',
        });
      }
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to verify OTP',
      });
      throw error;
    }
  },

  // Resend OTP
  resendOTP: async () => {
    const { mobile, resendCount } = get();
    if (!mobile) {
      set({ error: 'Mobile number not found' });
      return;
    }

    set({ loading: true, error: null });

    try {
      const response = await otpService.resendOTP({
        mobile,
        retrytype: resendCount >= 2 ? 'voice' : 'text'
      });

      set({
        loading: false,
        resendCount: resendCount + 1,
        lastOTPSentAt: new Date(),
      });

    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to resend OTP',
      });
      throw error;
    }
  },

  // Logout
  logout: async () => {
    await AsyncStorage.multiRemove(['isAuthenticated', 'authMobile', 'pendingMobile']);

    set({
      step: 'phone',
      mobile: null,
      isAuthenticated: false,
      loading: false,
      error: null,
      resendCount: 0,
      lastOTPSentAt: null,
    });
  },

  // Clear error
  clearError: () => set({ error: null }),

  // Check auth status on app launch
  checkAuthStatus: async () => {
    try {
      const isAuthenticated = await AsyncStorage.getItem('isAuthenticated');
      const authMobile = await AsyncStorage.getItem('authMobile');
      const pendingMobile = await AsyncStorage.getItem('pendingMobile');

      if (isAuthenticated === 'true' && authMobile) {
        set({
          isAuthenticated: true,
          mobile: authMobile,
          step: 'authenticated',
        });
      } else if (pendingMobile) {
        set({
          mobile: pendingMobile,
          step: 'otp',
        });
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
    }
  },
}));

export default useAuthStore;
```

---

## Phase 5: Error Handling & Edge Cases

### Step 5.1: Create Error Boundary

**Create `src/components/ErrorBoundary.tsx`:**
```typescript
import React, { Component, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('ErrorBoundary caught:', error, errorInfo);
    // Log to crash analytics service
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <View style={styles.container}>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.message}>
            {this.state.error?.message || 'An unexpected error occurred'}
          </Text>
          <TouchableOpacity style={styles.button} onPress={this.handleReset}>
            <Text style={styles.buttonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#F5F5F5',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  message: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
```

### Step 5.2: Network Status Handler

**Create `src/utils/networkStatus.ts`:**
```typescript
import NetInfo from '@react-native-community/netinfo';
import { Alert } from 'react-native';

class NetworkStatus {
  private isConnected: boolean = true;
  private listeners: Set<(isConnected: boolean) => void> = new Set();

  constructor() {
    this.init();
  }

  private init() {
    NetInfo.addEventListener((state) => {
      const wasConnected = this.isConnected;
      this.isConnected = state.isConnected ?? false;

      if (wasConnected && !this.isConnected) {
        this.showOfflineAlert();
      } else if (!wasConnected && this.isConnected) {
        this.showOnlineAlert();
      }

      this.notifyListeners();
    });
  }

  private showOfflineAlert() {
    Alert.alert(
      'No Internet Connection',
      'Please check your network settings and try again.',
      [{ text: 'OK' }]
    );
  }

  private showOnlineAlert() {
    Alert.alert(
      'Back Online',
      'Your internet connection has been restored.',
      [{ text: 'OK' }],
      { cancelable: true }
    );
  }

  private notifyListeners() {
    this.listeners.forEach((listener) => listener(this.isConnected));
  }

  public addListener(listener: (isConnected: boolean) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public async checkConnection(): Promise<boolean> {
    const state = await NetInfo.fetch();
    return state.isConnected ?? false;
  }

  public getStatus(): boolean {
    return this.isConnected;
  }
}

export default new NetworkStatus();
```

### Step 5.3: Edge Cases Handler Utilities

**Create `src/utils/edgeCases.ts`:**
```typescript
import { Alert, Linking, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export class EdgeCaseHandlers {
  /**
   * Handle rate limiting
   */
  static async handleRateLimit(): Promise<void> {
    const lastAttemptKey = 'lastOTPAttempt';
    const attemptCountKey = 'otpAttemptCount';

    const now = Date.now();
    const lastAttempt = await AsyncStorage.getItem(lastAttemptKey);
    const attemptCount = await AsyncStorage.getItem(attemptCountKey);

    if (lastAttempt) {
      const timeDiff = now - parseInt(lastAttempt);
      const hourInMs = 60 * 60 * 1000;

      if (timeDiff < hourInMs && parseInt(attemptCount || '0') >= 5) {
        const remainingTime = Math.ceil((hourInMs - timeDiff) / 60000);
        throw new Error(`Too many attempts. Please try again in ${remainingTime} minutes.`);
      }
    }

    // Update attempt tracking
    if (!lastAttempt || now - parseInt(lastAttempt) > 60 * 60 * 1000) {
      await AsyncStorage.setItem(attemptCountKey, '1');
    } else {
      const count = parseInt(attemptCount || '0') + 1;
      await AsyncStorage.setItem(attemptCountKey, count.toString());
    }

    await AsyncStorage.setItem(lastAttemptKey, now.toString());
  }

  /**
   * Handle expired OTP
   */
  static handleExpiredOTP(): void {
    Alert.alert(
      'OTP Expired',
      'The verification code has expired. Please request a new one.',
      [{ text: 'OK' }]
    );
  }

  /**
   * Handle invalid phone number format
   */
  static validatePhoneNumber(mobile: string): boolean {
    // Remove spaces and special characters
    const cleaned = mobile.replace(/\D/g, '');

    // Indian mobile number validation
    const indianMobileRegex = /^[6-9]\d{9}$/;

    return indianMobileRegex.test(cleaned);
  }

  /**
   * Handle clipboard paste for OTP
   */
  static formatOTPFromClipboard(text: string, length: number): string {
    // Extract only digits
    const digits = text.replace(/\D/g, '');
    // Return only required length
    return digits.slice(0, length);
  }

  /**
   * Handle app permissions
   */
  static async checkSMSPermissions(): Promise<boolean> {
    if (Platform.OS === 'android') {
      try {
        // For Android, you might need SMS permissions for auto-read
        // Implementation depends on react-native-permissions
        return true;
      } catch (error) {
        console.log('SMS permission not required or denied');
        return false;
      }
    }
    return true; // iOS handles this automatically
  }

  /**
   * Handle deep linking for OTP
   */
  static setupOTPDeepLink(callback: (otp: string) => void): () => void {
    const handleUrl = (url: string) => {
      // Parse OTP from deep link: yourapp://verify?otp=123456
      const regex = /otp=(\d+)/;
      const match = url.match(regex);
      if (match && match[1]) {
        callback(match[1]);
      }
    };

    const subscription = Linking.addEventListener('url', (event) => {
      handleUrl(event.url);
    });

    // Check initial URL
    Linking.getInitialURL().then((url) => {
      if (url) handleUrl(url);
    });

    return () => subscription.remove();
  }

  /**
   * Handle session timeout
   */
  static async checkSessionTimeout(): Promise<boolean> {
    const sessionStartKey = 'sessionStartTime';
    const sessionTimeout = 30 * 60 * 1000; // 30 minutes

    const sessionStart = await AsyncStorage.getItem(sessionStartKey);
    if (!sessionStart) return false;

    const elapsed = Date.now() - parseInt(sessionStart);
    return elapsed > sessionTimeout;
  }

  /**
   * Handle biometric authentication fallback
   */
  static async handleBiometricFallback(): Promise<void> {
    Alert.alert(
      'Biometric Authentication Failed',
      'Please use OTP verification instead.',
      [{ text: 'OK' }]
    );
  }
}
```

---

## Phase 6: Platform-Specific Implementation

### Step 6.1: Main Authentication Screen

**Create `src/screens/AuthScreen.tsx`:**
```typescript
import React, { useEffect } from 'react';
import {
  View,
  SafeAreaView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  BackHandler,
  Alert,
} from 'react-native';
import { PhoneInput } from '../components/PhoneInput';
import { OTPInput } from '../components/OTPInput';
import useAuthStore from '../stores/authStore';
import { EdgeCaseHandlers } from '../utils/edgeCases';
import networkStatus from '../utils/networkStatus';

export const AuthScreen: React.FC = () => {
  const {
    step,
    mobile,
    loading,
    error,
    sendOTP,
    verifyOTP,
    resendOTP,
    clearError,
    checkAuthStatus,
  } = useAuthStore();

  useEffect(() => {
    // Check auth status on mount
    checkAuthStatus();

    // Setup back handler for Android
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (step === 'otp') {
        Alert.alert(
          'Cancel Verification',
          'Are you sure you want to cancel the verification process?',
          [
            { text: 'No', style: 'cancel' },
            {
              text: 'Yes',
              onPress: () => useAuthStore.setState({ step: 'phone' })
            },
          ]
        );
        return true;
      }
      return false;
    });

    // Setup network listener
    const unsubscribe = networkStatus.addListener((isConnected) => {
      if (!isConnected && (step === 'phone' || step === 'otp')) {
        useAuthStore.setState({
          error: 'No internet connection. Please check your network.'
        });
      }
    });

    // Cleanup
    return () => {
      backHandler.remove();
      unsubscribe();
    };
  }, [step]);

  useEffect(() => {
    // Clear error after 5 seconds
    if (error) {
      const timer = setTimeout(clearError, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, clearError]);

  const handleSendOTP = async (mobileNumber: string) => {
    try {
      // Check network
      const isConnected = await networkStatus.checkConnection();
      if (!isConnected) {
        throw new Error('No internet connection');
      }

      // Validate phone number
      if (!EdgeCaseHandlers.validatePhoneNumber(mobileNumber)) {
        throw new Error('Please enter a valid 10-digit mobile number');
      }

      // Check rate limiting
      await EdgeCaseHandlers.handleRateLimit();

      // Send OTP
      await sendOTP(mobileNumber);
    } catch (err) {
      console.error('Send OTP error:', err);
    }
  };

  const handleVerifyOTP = async (otp: string) => {
    try {
      // Check network
      const isConnected = await networkStatus.checkConnection();
      if (!isConnected) {
        throw new Error('No internet connection');
      }

      // Verify OTP
      await verifyOTP(otp);
    } catch (err) {
      console.error('Verify OTP error:', err);
    }
  };

  const handleResendOTP = async () => {
    try {
      // Check network
      const isConnected = await networkStatus.checkConnection();
      if (!isConnected) {
        throw new Error('No internet connection');
      }

      // Check rate limiting
      await EdgeCaseHandlers.handleRateLimit();

      // Resend OTP
      await resendOTP();
    } catch (err) {
      console.error('Resend OTP error:', err);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            {step === 'phone' && (
              <PhoneInput
                onSubmit={handleSendOTP}
                loading={loading}
                error={error}
              />
            )}

            {step === 'otp' && mobile && (
              <OTPInput
                mobile={mobile}
                onVerify={handleVerifyOTP}
                onResend={handleResendOTP}
                loading={loading}
                error={error}
              />
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 20,
  },
});
```

### Step 6.2: App Entry Point

**Create `App.tsx`:**
```typescript
import React, { useEffect } from 'react';
import {
  StatusBar,
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { AuthScreen } from './src/screens/AuthScreen';
import useAuthStore from './src/stores/authStore';
import SplashScreen from 'react-native-splash-screen';

const Stack = createStackNavigator();

// Placeholder for authenticated app
const HomeScreen = () => (
  <View style={styles.centered}>
    <Text style={styles.welcomeText}>Welcome! You are authenticated.</Text>
  </View>
);

const App: React.FC = () => {
  const { isAuthenticated, checkAuthStatus } = useAuthStore();
  const [isLoading, setIsLoading] = React.useState(true);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Check authentication status
        await checkAuthStatus();
      } catch (error) {
        console.error('App initialization error:', error);
      } finally {
        setIsLoading(false);
        // Hide splash screen
        if (SplashScreen) {
          SplashScreen.hide();
        }
      }
    };

    initializeApp();
  }, []);

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <StatusBar barStyle="dark-content" backgroundColor="#F5F5F5" />
      <NavigationContainer>
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
            cardStyle: { backgroundColor: '#F5F5F5' },
          }}
        >
          {!isAuthenticated ? (
            <Stack.Screen
              name="Auth"
              component={AuthScreen}
              options={{
                animationTypeForReplace: 'pop',
              }}
            />
          ) : (
            <Stack.Screen name="Home" component={HomeScreen} />
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </ErrorBoundary>
  );
};

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  welcomeText: {
    fontSize: 18,
    color: '#333',
    fontWeight: '600',
  },
});

export default App;
```

---

## Phase 7: Testing & Optimization

### Step 7.1: Test Scenarios Checklist

```markdown
## Testing Checklist

### Happy Path
- [ ] Enter valid mobile number → OTP sent successfully
- [ ] Enter correct OTP → User authenticated
- [ ] Resend OTP → New OTP received
- [ ] App remembers authentication on restart

### Error Scenarios
- [ ] Invalid mobile number format → Shows validation error
- [ ] Wrong OTP → Shows "Invalid OTP" error
- [ ] Expired OTP → Shows expiry message
- [ ] No internet → Shows network error
- [ ] Server down → Shows server error
- [ ] Rate limiting → Shows rate limit message

### Edge Cases
- [ ] Rapid button clicks → Prevents duplicate requests
- [ ] Switch apps during OTP entry → State preserved
- [ ] Kill app during authentication → Recovers gracefully
- [ ] Phone number with spaces/special chars → Formats correctly
- [ ] Copy-paste OTP → Works correctly
- [ ] Maximum resend attempts → Shows limit message
- [ ] Session timeout → Requires re-authentication
- [ ] Background/foreground transitions → Handles correctly
- [ ] Device rotation (tablets) → Layout adapts
- [ ] Accessibility → Screen readers work
```

### Step 7.2: Performance Optimizations

**Create `src/utils/performance.ts`:**
```typescript
import { InteractionManager } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export class PerformanceOptimizations {
  /**
   * Debounce function calls
   */
  static debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  }

  /**
   * Throttle function calls
   */
  static throttle<T extends (...args: any[]) => any>(
    func: T,
    limit: number
  ): (...args: Parameters<T>) => void {
    let inThrottle: boolean;
    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        func(...args);
        inThrottle = true;
        setTimeout(() => (inThrottle = false), limit);
      }
    };
  }

  /**
   * Cache API responses
   */
  static async cacheResponse(key: string, data: any, ttl: number = 300000) {
    const cacheData = {
      data,
      timestamp: Date.now(),
      ttl,
    };
    await AsyncStorage.setItem(`cache_${key}`, JSON.stringify(cacheData));
  }

  static async getCachedResponse(key: string): Promise<any | null> {
    try {
      const cached = await AsyncStorage.getItem(`cache_${key}`);
      if (!cached) return null;

      const { data, timestamp, ttl } = JSON.parse(cached);
      if (Date.now() - timestamp > ttl) {
        await AsyncStorage.removeItem(`cache_${key}`);
        return null;
      }
      return data;
    } catch {
      return null;
    }
  }

  /**
   * Defer heavy operations
   */
  static runAfterInteractions(callback: () => void) {
    InteractionManager.runAfterInteractions(callback);
  }
}
```

---

## Implementation Notes

### Critical Implementation Requirements

1. **Security**
   - Never log sensitive data (OTP, full phone numbers)
   - Use HTTPS in production
   - Implement certificate pinning for added security
   - Store sensitive data in Keychain (iOS) / Keystore (Android)

2. **Error Handling**
   - Always catch and handle promise rejections
   - Provide user-friendly error messages
   - Log errors for debugging but sanitize sensitive data
   - Implement retry mechanisms with exponential backoff

3. **State Management**
   - Persist authentication state securely
   - Handle app lifecycle events properly
   - Clear sensitive data on logout
   - Implement session timeout

4. **User Experience**
   - Auto-focus input fields
   - Show loading states for all async operations
   - Provide clear feedback for all actions
   - Implement pull-to-refresh where applicable
   - Handle keyboard properly on all screens

5. **Platform Differences**
   - Test on both iOS and Android
   - Handle Android back button
   - Respect platform-specific UI guidelines
   - Test on various screen sizes

6. **Network Handling**
   - Check connectivity before API calls
   - Implement retry logic for failed requests
   - Cache responses where appropriate
   - Handle timeout scenarios

### Deployment Checklist

- [ ] Update API base URL for production
- [ ] Enable ProGuard/R8 for Android
- [ ] Configure code signing for iOS
- [ ] Set up crash reporting (Sentry/Bugsnag)
- [ ] Implement analytics
- [ ] Test on real devices
- [ ] Configure push notifications (optional)
- [ ] Set up CI/CD pipeline
- [ ] Implement code obfuscation
- [ ] Review and remove all console.logs

---

## Troubleshooting Guide

### Common Issues and Solutions

1. **iOS Simulator Network Issues**
   - Use `http://localhost:3000` instead of IP address
   - Check simulator network settings

2. **Android Emulator Network Issues**
   - Use `http://10.0.2.2:3000` for localhost
   - Enable network in emulator settings

3. **Auto-read OTP not working**
   - iOS: Ensure correct textContentType
   - Android: May need SMS permissions

4. **Keyboard covering inputs**
   - Use KeyboardAvoidingView correctly
   - Test on different devices

5. **State not persisting**
   - Check AsyncStorage implementation
   - Verify data is being saved correctly

---

## Next Steps

1. Implement biometric authentication as alternative
2. Add multi-language support
3. Implement push notifications for OTP
4. Add analytics tracking
5. Implement A/B testing for UI variations
6. Add accessibility features
7. Implement deep linking for OTP
8. Add support for international phone numbers
9. Implement backup authentication methods
10. Add user profile management post-authentication

---

## Support & Resources

- [React Native Documentation](https://reactnative.dev/docs/getting-started)
- [React Navigation](https://reactnavigation.org/docs/getting-started)
- [Async Storage](https://react-native-async-storage.github.io/async-storage/)
- [React Hook Form](https://react-hook-form.com/get-started)
- [Zustand](https://github.com/pmndrs/zustand)

---

**Last Updated:** 2024
**Version:** 1.0.0
**Compatible with:** React Native 0.72+