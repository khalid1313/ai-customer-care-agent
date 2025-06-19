# Channel Integrations Guide

This document describes the channel integration system for connecting Instagram, Messenger, and WhatsApp to the AI Customer Care Agent platform.

## Overview

The channel integration system allows businesses to connect their social media messaging channels to manage all customer conversations in one centralized platform. Currently supported channels are:

- **Instagram** - Direct Messages from Instagram Professional/Business accounts
- **Facebook Messenger** - Messages from Facebook Pages
- **WhatsApp Business** - Messages from WhatsApp Business accounts

## Database Schema

### ChannelIntegration Table

The `channel_integrations` table stores all channel connections with the following key fields:

```prisma
model ChannelIntegration {
  id                  String   // Unique identifier
  businessId          String   // Associated business
  platform            String   // INSTAGRAM, MESSENGER, WHATSAPP
  status              String   // CONNECTED, DISCONNECTED, ERROR, PENDING
  
  // Authentication
  accessToken         String?  // Encrypted platform access token
  refreshToken        String?  // Encrypted refresh token
  tokenExpiresAt      DateTime? // Token expiration time
  
  // Platform-specific data
  platformAccountId   String?  // Instagram/FB User ID, WhatsApp Business ID
  platformAccountName String?  // Account name/username
  platformPageId      String?  // Facebook Page ID (Instagram/Messenger)
  platformPageName    String?  // Facebook Page Name
  pageAccessToken     String?  // Page-specific access token
  
  // Webhook configuration
  webhookSecret       String?  // Webhook verification token
  webhookUrl          String?  // Our webhook endpoint URL
  webhookSubscribed   Boolean  // Whether webhook is active
  
  // Metadata
  permissions         String?  // JSON array of granted permissions
  features            String?  // JSON array of enabled features
  metadata            String?  // Platform-specific metadata
  
  // Unique constraint - one integration per platform per business
  @@unique([businessId, platform])
}
```

## UI Components

### Channel Integration Settings Page

Located at `/frontend/src/app/settings/integrations/page.tsx`

Features:
- Visual cards for each platform with brand colors
- Connection status indicators (Connected/Disconnected/Error/Pending)
- Connect/Disconnect functionality
- Test connection button
- Display of connected account information
- Webhook subscription status
- Last test timestamp
- Permission display

### Navigation

The integrations page is accessible from the main navigation under Settings → Integrations for users with appropriate permissions (admin/owner roles).

## API Endpoints

### GET /api/integrations
List all channel integrations for the authenticated business.

**Response:**
```json
{
  "success": true,
  "integrations": [
    {
      "id": "integration_id",
      "platform": "INSTAGRAM",
      "status": "CONNECTED",
      "platformAccountName": "my_business_account",
      "webhookSubscribed": true,
      "permissions": ["instagram_basic", "instagram_manage_messages"],
      "features": ["messaging", "webhooks"]
    }
  ],
  "platforms": {
    "INSTAGRAM": { ... },
    "MESSENGER": { ... },
    "WHATSAPP": { ... }
  }
}
```

### POST /api/integrations/connect
Initiate connection to a platform (currently returns mock data).

**Request:**
```json
{
  "platform": "INSTAGRAM"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Instagram connected successfully (mock)",
  "integration": {
    "id": "integration_id",
    "platform": "INSTAGRAM",
    "status": "CONNECTED",
    "platformAccountName": "Mock Instagram Account"
  }
}
```

### POST /api/integrations/:id/test
Test an existing integration connection.

**Response:**
```json
{
  "success": true,
  "message": "Connection test successful",
  "details": {
    "platform": "INSTAGRAM",
    "accountName": "my_business_account",
    "webhookActive": true,
    "tokenValid": true
  }
}
```

### DELETE /api/integrations/:id
Disconnect a channel integration.

**Response:**
```json
{
  "success": true,
  "message": "Integration disconnected successfully"
}
```

### POST /api/integrations/:id/refresh
Refresh access tokens for an integration.

**Response:**
```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "expiresAt": "2025-08-18T10:30:00Z"
}
```

## Security Features

1. **Token Encryption**: All access tokens and sensitive credentials are encrypted using AES-256-CBC encryption before storage.

2. **Permission Validation**: Only admin and owner roles can manage integrations.

3. **Token Masking**: Sensitive tokens are masked in API responses (shown as `***masked***`).

4. **Webhook Verification**: Each integration has a unique webhook secret for verifying incoming webhook requests.

## Platform Requirements

### Instagram
- Professional or Business account required
- Facebook Page connected to Instagram account
- Required permissions:
  - `instagram_basic`
  - `instagram_manage_messages`
  - `pages_messaging`

### Facebook Messenger
- Facebook Page required
- Admin access to the Page
- Required permissions:
  - `pages_messaging`
  - `pages_read_engagement`
  - `pages_manage_metadata`

### WhatsApp Business
- WhatsApp Business API access (requires Meta approval)
- Verified business
- Required permissions:
  - `whatsapp_business_messaging`
  - `whatsapp_business_management`

## Implementation Status

### ✅ Completed
- Database schema with ChannelIntegration table
- UI for managing integrations
- API endpoints for CRUD operations
- Token encryption/decryption
- Mock connection flow
- Test connection functionality
- Permission-based access control

### 🚧 TODO (Future Implementation)
- Real OAuth 2.0 flow integration with Meta platforms
- Webhook endpoint implementation for receiving messages
- Message synchronization with Conversation/Message tables
- Token refresh automation
- Rate limiting for API calls
- Webhook signature verification
- Message sending functionality
- Media message support
- Read receipts and typing indicators

## Testing

A test script is available at `/test-channel-integrations.js` to verify the database schema and basic functionality.

Run with:
```bash
node test-channel-integrations.js
```

## Migration

To apply the database schema changes:
```bash
npx prisma generate
npx prisma db push
```

## Error Handling

The system tracks connection errors with:
- `lastError` - Description of the last error
- `lastErrorAt` - Timestamp of the last error
- `connectionAttempts` - Number of connection attempts

Errors are displayed in the UI with appropriate messaging to guide users on resolution steps.