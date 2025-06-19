# New Instagram App Configuration Links

## Your New App Credentials
- **Instagram Access Token**: IGAAWxKUJEn31BZAE44dzRIUDA1OXA4N3owRUtuanN0bXBfQlQyQjlTdkxLb3Y5MmpsN3VnRkg0ZAXp5NTgwblVNellQUnZASR284cGY0R3JXN3BHY3RSYk1CSVhFbWxnb2JDRmoyMkVQOFlYX2RoLXZAFaUZACWUhJdF9rVklhR2MtZAwZDZD
- **Instagram App Secret**: 909910b782d7d059dc52a1daa950766a
- **Instagram Account**: @rocketagents.ai
- **Instagram ID**: 9784305361692911

## Important Configuration Links

### 1. Meta Developer Dashboard
- **Main Dashboard**: https://developers.facebook.com/apps/
- **Your App Dashboard**: https://developers.facebook.com/apps/YOUR_NEW_APP_ID/
- **Instagram Basic Display**: https://developers.facebook.com/apps/YOUR_NEW_APP_ID/instagram-basic-display/
- **Webhooks Configuration**: https://developers.facebook.com/apps/YOUR_NEW_APP_ID/webhooks/
- **App Roles**: https://developers.facebook.com/apps/YOUR_NEW_APP_ID/roles/
- **App Settings**: https://developers.facebook.com/apps/YOUR_NEW_APP_ID/settings/basic/

### 2. Instagram Webhook Configuration
- **Webhook Path**: `/api/webhooks/instagram/cmbsfx1qt0001tvvj7hoemk12`
- **Full Webhook URL**: `https://YOUR-NGROK-URL.ngrok-free.app/api/webhooks/instagram/cmbsfx1qt0001tvvj7hoemk12`
- **Verify Token**: `rocketagents_webhook_verify_2024`

### 3. Required Webhook Fields to Subscribe
- messages ✓ (Required for DMs)
- message_reactions ✓
- messaging_postbacks ✓
- messaging_optins ✓
- messaging_referral ✓
- comments (optional)

### 4. Testing Tools
- **Graph API Explorer**: https://developers.facebook.com/tools/explorer/
- **Access Token Debugger**: https://developers.facebook.com/tools/debug/accesstoken/
- **Webhook Test**: https://developers.facebook.com/tools/webhooks/

### 5. Documentation
- **Instagram Messaging**: https://developers.facebook.com/docs/messenger-platform/instagram
- **Webhook Reference**: https://developers.facebook.com/docs/messenger-platform/webhooks
- **Send API**: https://developers.facebook.com/docs/messenger-platform/send-messages

## Quick Setup Commands

```bash
# 1. Restart your server with new credentials
npm start

# 2. Start ngrok
ngrok http 3001

# 3. Update webhook URL in Meta Dashboard with your ngrok URL
# Example: https://abc123.ngrok-free.app/api/webhooks/instagram/cmbsfx1qt0001tvvj7hoemk12
```

## Testing Checklist
- [ ] Server running with new credentials
- [ ] Ngrok forwarding to port 3001
- [ ] Webhook URL updated in Meta Dashboard
- [ ] Webhook subscription is ON
- [ ] All message fields are subscribed
- [ ] Send test DM to @rocketagents.ai
- [ ] Check ngrok logs for incoming webhooks
- [ ] Verify AI responds to messages

## Important Notes
- Make sure webhook subscribes to Instagram ID: 17841475013191935 (Business Account ID)
- Not the user ID: 9784305361692911
- Ensure @rocketagents.ai is selected as an asset in the app