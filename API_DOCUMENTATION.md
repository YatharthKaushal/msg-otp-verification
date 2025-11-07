# MSG91 OTP Service API Documentation

## Overview
A modular Node.js service for sending and verifying OTP messages using MSG91 API. The service provides a clean REST API interface with proper error handling, validation, and standardized responses.

## Features
- Send OTP to mobile numbers
- Verify OTP codes
- Resend OTP (text or voice)
- Send SMS using MSG91 Flow templates
- Input validation and sanitization
- Standardized API responses
- Comprehensive error handling
- Security best practices with Helmet
- CORS support
- Request logging with Morgan

## Installation

### Prerequisites
- Node.js >= 14.0.0
- npm >= 6.0.0
- MSG91 Account and Auth Key

### Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and add your MSG91 credentials:
   - `MSG91_AUTH_KEY`: Your MSG91 authentication key
   - `MSG91_FLOW_ID`: Your MSG91 flow/template ID (optional)

4. Start the server:
   ```bash
   # Development mode with auto-reload
   npm run dev

   # Production mode
   npm start
   ```

## Project Structure
```
msg-opt/
├── src/
│   ├── controllers/     # Request handlers
│   │   └── otp.controller.js
│   ├── services/        # Business logic
│   │   └── msg91.js
│   ├── routes/          # API routes
│   │   ├── index.js
│   │   └── otp.routes.js
│   ├── middleware/      # Custom middleware
│   │   └── validation.js
│   └── utils/           # Utility functions
│       └── response.js
├── server.js            # Main application entry
├── .env                 # Environment variables
├── .env.example         # Environment template
└── package.json         # Dependencies

```

## API Endpoints

### Base URL
```
http://localhost:3000/api
```

### Response Format
All API responses follow a standardized format:

#### Success Response
```json
{
  "success": true,
  "message": "Operation successful",
  "data": {},
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### Error Response
```json
{
  "success": false,
  "message": "Error description",
  "errors": [],
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Endpoints

#### 1. Send OTP
Send an OTP to a mobile number.

**Endpoint:** `POST /api/otp/send`

**Request Body:**
```json
{
  "mobile": "9876543210",
  "template_id": "optional_template_id",
  "otp_length": 6,
  "otp_expiry": 5
}
```

**Parameters:**
- `mobile` (required): Mobile number (10 digits, with or without country code)
- `template_id` (optional): Custom MSG91 template ID
- `otp_length` (optional): Length of OTP (4-9 digits, default: 6)
- `otp_expiry` (optional): OTP expiry in minutes (1-10, default: 5)

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

**cURL Example:**
```bash
curl -X POST http://localhost:3000/api/otp/send \
  -H "Content-Type: application/json" \
  -d '{
    "mobile": "9876543210",
    "otp_length": 6,
    "otp_expiry": 5
  }'
```

#### 2. Verify OTP
Verify an OTP code.

**Endpoint:** `POST /api/otp/verify`

**Request Body:**
```json
{
  "mobile": "9876543210",
  "otp": "123456"
}
```

**Parameters:**
- `mobile` (required): Mobile number
- `otp` (required): OTP code to verify (4-6 digits)

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

**cURL Example:**
```bash
curl -X POST http://localhost:3000/api/otp/verify \
  -H "Content-Type: application/json" \
  -d '{
    "mobile": "9876543210",
    "otp": "123456"
  }'
```

#### 3. Resend OTP
Resend OTP to a mobile number.

**Endpoint:** `POST /api/otp/resend`

**Request Body:**
```json
{
  "mobile": "9876543210",
  "retrytype": "text"
}
```

**Parameters:**
- `mobile` (required): Mobile number
- `retrytype` (optional): Type of retry - "text" or "voice" (default: "text")

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

**cURL Example:**
```bash
curl -X POST http://localhost:3000/api/otp/resend \
  -H "Content-Type: application/json" \
  -d '{
    "mobile": "9876543210",
    "retrytype": "voice"
  }'
```

#### 4. Send SMS
Send SMS using MSG91 Flow templates.

**Endpoint:** `POST /api/sms/send`

**Request Body:**
```json
{
  "flow_id": "your_flow_id",
  "recipients": [
    {
      "mobiles": "9876543210",
      "name": "John Doe",
      "otp": "123456"
    }
  ]
}
```

**Parameters:**
- `flow_id` (required): MSG91 Flow/Template ID
- `recipients` (required): Array of recipient objects
  - `mobiles` or `mobile`: Recipient mobile number
  - Additional fields based on your MSG91 template variables

**Success Response (200):**
```json
{
  "success": true,
  "message": "SMS sent successfully",
  "data": {
    "flow_id": "your_flow_id",
    "recipients_count": 1
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:3000/api/sms/send \
  -H "Content-Type: application/json" \
  -d '{
    "flow_id": "your_flow_id",
    "recipients": [
      {
        "mobiles": "9876543210",
        "name": "John Doe",
        "otp": "123456"
      }
    ]
  }'
```

#### 5. Health Check
Check service health status.

**Endpoint:** `GET /api/health`

**Success Response (200):**
```json
{
  "success": true,
  "message": "MSG91 service is operational",
  "data": {
    "service": "MSG91 OTP Service",
    "status": "healthy",
    "configured": true,
    "flow_configured": false,
    "timestamp": "2024-01-01T00:00:00.000Z"
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**cURL Example:**
```bash
curl http://localhost:3000/api/health
```

## Error Handling

The API handles various error scenarios with appropriate HTTP status codes:

### Common Error Codes
- `400` - Bad Request (Invalid input)
- `401` - Unauthorized (Invalid or expired OTP)
- `404` - Not Found (Route not found)
- `422` - Unprocessable Entity (Validation failed)
- `429` - Too Many Requests (Rate limit exceeded)
- `500` - Internal Server Error

### Validation Errors (422)
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "mobile",
      "message": "Invalid mobile number format"
    }
  ],
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Rate Limiting (429)
```json
{
  "success": false,
  "message": "Too many requests. Please try again later",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Security Features

1. **Input Validation**: All inputs are validated and sanitized
2. **Helmet**: Security headers for protection against common attacks
3. **CORS**: Configurable Cross-Origin Resource Sharing
4. **Environment Variables**: Sensitive data stored in `.env`
5. **Error Handling**: Detailed errors in development, generic in production
6. **Graceful Shutdown**: Proper cleanup on server termination

## Testing with Postman

### Import Collection
1. Open Postman
2. Create a new collection named "MSG91 OTP Service"
3. Add the following requests:

#### Send OTP Request
```
Method: POST
URL: {{base_url}}/api/otp/send
Headers:
  Content-Type: application/json
Body (raw JSON):
{
  "mobile": "9876543210"
}
```

#### Verify OTP Request
```
Method: POST
URL: {{base_url}}/api/otp/verify
Headers:
  Content-Type: application/json
Body (raw JSON):
{
  "mobile": "9876543210",
  "otp": "123456"
}
```

### Environment Variables
Create a Postman environment with:
- `base_url`: `http://localhost:3000`

## Troubleshooting

### Common Issues

1. **"MSG91_AUTH_KEY is not configured"**
   - Ensure `.env` file exists with valid MSG91_AUTH_KEY
   - Restart the server after updating `.env`

2. **"Invalid mobile number"**
   - Mobile number must be 10 digits
   - Indian numbers only (starts with 6-9)

3. **"Too many requests"**
   - MSG91 rate limiting in effect
   - Wait before retrying

4. **"Invalid or expired OTP"**
   - OTP has expired (default 5 minutes)
   - Incorrect OTP entered
   - Request new OTP

## MSG91 Configuration

### Getting Auth Key
1. Sign up at [MSG91](https://msg91.com)
2. Navigate to Settings → API Keys
3. Copy your Auth Key

### Creating Flow Template
1. Go to MSG91 Dashboard
2. Navigate to Flow → Create Flow
3. Design your SMS template
4. Copy the Flow ID
5. Add to `.env` as `MSG91_FLOW_ID`

### Template Variables
When creating templates, you can use variables like:
- `{#var1#}` - Will be replaced with actual values
- Common variables: `name`, `otp`, `amount`, etc.

## Development Guidelines

### Adding New Features
1. Create service method in `src/services/msg91.js`
2. Add controller function in `src/controllers/otp.controller.js`
3. Create validation middleware in `src/middleware/validation.js`
4. Define route in `src/routes/otp.routes.js`
5. Update API documentation

### Best Practices
- Always validate input data
- Use standardized response format
- Log errors for debugging
- Handle edge cases
- Write JSDoc comments
- Keep functions small and focused

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review MSG91 documentation
3. Check server logs for detailed errors
4. Ensure all environment variables are set correctly

## License

ISC License