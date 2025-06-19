# Working Bot Implementation Guide
## Based on Tested Instagram & WhatsApp Integration

### Overview
This documentation covers the **exact implementation** that is currently working for both Instagram and WhatsApp messaging, using a Python FastAPI service running on port 8000.

---

## Project Structure

```
/Users/khalid/Documents/python-insta/
├── main.py                 # Main FastAPI application
├── .env                    # Environment variables (optional)
└── requirements.txt        # Python dependencies
```

---

## Complete Working Code (main.py)

```python
from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
import httpx
import os
from dotenv import load_dotenv
import json

load_dotenv()

app = FastAPI(title="Instagram AI Bot", description="Minimal Instagram DM bot with AI responses")

# Configuration
VERIFY_TOKEN = os.getenv("VERIFY_TOKEN", "test123")
PAGE_ACCESS_TOKEN = os.getenv("PAGE_ACCESS_TOKEN")
INSTAGRAM_ACCESS_TOKEN = os.getenv("INSTAGRAM_ACCESS_TOKEN", "EAARoFjKWE6cBO2ZAG2piIOzYacTBI9g7HZAENMZCyKiIWiqIausZBElWGVXNPmi7ZA9ZCcxMIR524EvTZCt19Gm9OwtpfPx7obheyXG57ekutI2Eu0nLjTu0xixjZCMe17g2cSXr2giUTzdxP02zBTZAJoujBfiAQL8836WRWKXyroTiWJv04psRjIYvtvXwDH5JcuCXhN1n0yKXDRjrAPCY1R13bDGcYZCSh3jz7kWjZBvqreLitKjQjsZD")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

# WhatsApp Configuration
WHATSAPP_ACCESS_TOKEN = os.getenv("WHATSAPP_ACCESS_TOKEN", "EAARoFjKWE6cBOZB3BfIYZBlpp1peOaO7NYUeNE3ZCRxbJS1xD3ZAaiKIaWZBVWcqojyT7lSYEGCmX9lZAakpjFWmXHZCztQZAmOoCJ1jLajH9EkYpZC5YBo1k31CelgGu9ZBdR6FwErIaSC75Q9ZADZAbr7NRZAoLZCUtwScTJBBCGgOfzSzPVq2nWFAkqhiIXDaqpMplDxk0JyiqVteYJGQirmrByOxZBZCMAdhH0pMHwiakU1o8Ltj0iTogPQZD")
WHATSAPP_PHONE_NUMBER_ID = os.getenv("WHATSAPP_PHONE_NUMBER_ID", "650289724841524")

@app.get("/")
async def root():
    return {"message": "Instagram AI Bot is running!", "status": "healthy"}

@app.get("/privacy-policy")
async def privacy_policy():
    """Basic privacy policy for testing"""
    html = """
    <!DOCTYPE html>
    <html>
    <head><title>Privacy Policy</title></head>
    <body>
        <h1>Privacy Policy</h1>
        <p>This Instagram and WhatsApp bot collects and processes messages to provide automated responses.</p>
        <p>Data collected: User ID, message content, phone number (WhatsApp)</p>
        <p>Data usage: To provide bot responses only</p>
        <p>Data retention: Messages are not stored permanently</p>
        <p>Contact: your-email@example.com</p>
    </body>
    </html>
    """
    return HTMLResponse(content=html)

@app.get("/terms-of-service")
async def terms_of_service():
    """Basic terms of service for testing"""
    html = """
    <!DOCTYPE html>
    <html>
    <head><title>Terms of Service</title></head>
    <body>
        <h1>Terms of Service</h1>
        <p>By using this bot, you agree to receive automated responses.</p>
        <p>This service is provided as-is for demonstration purposes.</p>
        <p>We reserve the right to modify or discontinue the service.</p>
        <p>Contact: your-email@example.com</p>
    </body>
    </html>
    """
    return HTMLResponse(content=html)

@app.get("/webhook")
async def verify_token(request: Request):
    """Verify webhook token for Meta/Facebook integration"""
    params = request.query_params
    hub_mode = params.get("hub.mode")
    hub_challenge = params.get("hub.challenge") 
    hub_verify_token = params.get("hub.verify_token")
    
    print(f"Verify attempt: mode={hub_mode}, token={hub_verify_token}, challenge={hub_challenge}")
    
    if hub_mode == "subscribe" and hub_verify_token == VERIFY_TOKEN:
        print("✅ Webhook verified successfully")
        return int(hub_challenge)
    
    print("❌ Webhook verification failed")
    return {"status": "failed"}

@app.get("/webhook/whatsapp")
async def verify_whatsapp_webhook(request: Request):
    """Webhook verification for WhatsApp"""
    hub_mode = request.query_params.get("hub.mode")
    hub_verify_token = request.query_params.get("hub.verify_token")
    hub_challenge = request.query_params.get("hub.challenge")
    
    print(f"🔐 WhatsApp webhook verification: mode={hub_mode}, token={hub_verify_token}")
    
    if hub_mode == "subscribe" and hub_verify_token == VERIFY_TOKEN:
        print("✅ WhatsApp webhook verified successfully")
        return int(hub_challenge)
    else:
        print("❌ WhatsApp webhook verification failed")
        return {"error": "Invalid verification token"}

@app.post("/webhook/whatsapp")
async def whatsapp_webhook(request: Request):
    """Handle incoming WhatsApp messages"""
    print("📱 WHATSAPP WEBHOOK HIT! Someone sent a message!")
    try:
        data = await request.json()
        print("📨 Incoming WhatsApp webhook:", json.dumps(data, indent=2))

        # WhatsApp Business API format
        if data.get("object") == "whatsapp_business_account":
            for entry in data.get("entry", []):
                for change in entry.get("changes", []):
                    if change.get("field") == "messages":
                        value = change.get("value", {})
                        
                        # Get messages
                        messages = value.get("messages", [])
                        contacts = value.get("contacts", [])
                        
                        for message in messages:
                            sender_phone = message.get("from")
                            message_type = message.get("type")
                            message_text = ""
                            
                            # Extract text based on message type
                            if message_type == "text":
                                message_text = message.get("text", {}).get("body", "")
                            elif message_type in ["image", "document", "audio", "video"]:
                                message_text = f"[{message_type.upper()} message received]"
                            
                            # Get contact name
                            contact_name = "WhatsApp User"
                            for contact in contacts:
                                if contact.get("wa_id") == sender_phone:
                                    contact_name = contact.get("profile", {}).get("name", "WhatsApp User")
                                    break
                            
                            print(f"📱 WhatsApp message from {sender_phone} ({contact_name}): {message_text}")
                            
                            if sender_phone and message_text:
                                reply = await get_ai_response(message_text)
                                print(f"🤖 AI Reply: {reply}")
                                await send_whatsapp_message(sender_phone, reply)
                                print(f"✅ WhatsApp message processed successfully!")

        return {"status": "ok"}
    
    except Exception as e:
        print(f"❌ WhatsApp webhook error: {e}")
        return {"status": "error", "message": str(e)}

@app.post("/webhook")
async def webhook(request: Request):
    """Handle incoming Instagram messages"""
    print("🔔 WEBHOOK HIT! Someone sent a message!")
    try:
        data = await request.json()
        print("📨 Incoming webhook:", json.dumps(data, indent=2))

        # Detect if this is Instagram or Messenger
        is_instagram = data.get("object") == "instagram"
        
        for entry in data.get("entry", []):
            # Both Instagram and Messenger use "messaging" array
            if "messaging" in entry:
                for messaging_event in entry.get("messaging", []):
                    sender_id = messaging_event.get("sender", {}).get("id")
                    message_data = messaging_event.get("message", {})
                    message_text = message_data.get("text", "")
                    
                    # Skip echo messages and delivery receipts
                    if message_data.get("is_echo") or "delivery" in messaging_event or "read" in messaging_event:
                        continue
                    
                    platform = "Instagram" if is_instagram else "Messenger"
                    print(f"📩 {platform} message from {sender_id}: {message_text}")
                    
                    if sender_id and message_text:
                        reply = await get_ai_response(message_text)
                        print(f"🤖 AI Reply: {reply}")
                        await send_message(sender_id, reply, is_instagram=is_instagram)
                        print(f"✅ Bot received and processed Instagram message successfully!")

        return {"status": "ok"}
    
    except Exception as e:
        print(f"❌ Webhook error: {e}")
        return {"status": "error", "message": str(e)}

async def send_message(psid: str, text: str, is_instagram: bool = False):
    """Send message back to Instagram/Messenger user"""
    
    # Use Instagram Access Token instead of Facebook Page Token
    if is_instagram:
        # First get Instagram Business Account ID
        ig_account_url = f"https://graph.instagram.com/me?access_token={INSTAGRAM_ACCESS_TOKEN}"
        try:
            async with httpx.AsyncClient() as client:
                ig_response = await client.get(ig_account_url)
                if ig_response.status_code == 200:
                    ig_data = ig_response.json()
                    ig_account_id = ig_data.get('id')
                    url = f"https://graph.instagram.com/v19.0/{ig_account_id}/messages?access_token={INSTAGRAM_ACCESS_TOKEN}"
                    print(f"📱 Using Instagram Business Account ID: {ig_account_id}")
                else:
                    print(f"❌ Failed to get IG account ID: {ig_response.status_code} - {ig_response.text}")
                    return
        except Exception as e:
            print(f"❌ Error getting IG account ID: {e}")
            return
    else:
        url = f"https://graph.facebook.com/v19.0/me/messages?access_token={PAGE_ACCESS_TOKEN}"
    
    payload = {
        "recipient": {"id": psid},
        "message": {"text": text}
    }
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=payload)
            
            if response.status_code == 200:
                print("✅ Message sent successfully")
            else:
                print(f"❌ Failed to send message: {response.status_code} - {response.text}")
                
    except Exception as e:
        print(f"❌ Error sending message: {e}")

async def send_whatsapp_message(phone_number: str, text: str):
    """Send WhatsApp message using WhatsApp Business API"""
    
    print(f"📤 Sending WhatsApp message to {phone_number}")
    
    url = f"https://graph.facebook.com/v19.0/{WHATSAPP_PHONE_NUMBER_ID}/messages"
    
    payload = {
        "messaging_product": "whatsapp",
        "to": phone_number,
        "text": {
            "body": text
        }
    }
    
    headers = {
        "Authorization": f"Bearer {WHATSAPP_ACCESS_TOKEN}",
        "Content-Type": "application/json"
    }
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=payload, headers=headers)
            
            if response.status_code == 200:
                result = response.json()
                message_id = result.get("messages", [{}])[0].get("id", "unknown")
                print(f"✅ WhatsApp message sent successfully (ID: {message_id})")
            else:
                print(f"❌ Failed to send WhatsApp message: {response.status_code} - {response.text}")
                
    except Exception as e:
        print(f"❌ Error sending WhatsApp message: {e}")

async def get_ai_response(message: str) -> str:
    """Generate AI response using OpenAI or fallback to dummy response"""
    
    # Use OpenAI if API key is available and not the placeholder
    if OPENAI_API_KEY and not OPENAI_API_KEY.startswith("your_openai"):
        try:
            import openai
            
            client = openai.AsyncOpenAI(api_key=OPENAI_API_KEY)
            
            response = await client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "You are a helpful Instagram AI assistant. Keep responses brief and friendly."},
                    {"role": "user", "content": message}
                ],
                max_tokens=150
            )
            
            return response.choices[0].message.content.strip()
            
        except Exception as e:
            print(f"❌ OpenAI error: {e}")
            return f"🤖 AI is thinking... (OpenAI error)"
    
    # Fallback dummy response
    return f"🤖 You said: '{message}' - I'm a bot! (Add OpenAI API key for AI responses)"

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

---

## Token Configuration & Generation

### Token Types and Generation Methods

| Platform | Token Type | Generation Method | Used For |
|----------|------------|-------------------|----------|
| **Instagram** | User Access Token | Graph API Explorer | Send/Receive Instagram messages |
| **WhatsApp** | System User Token | WhatsApp API Setup | Send/Receive WhatsApp messages |
| **Messenger** | Page Access Token | Page Token Generator | Send/Receive Messenger messages |

### Instagram Token Generation (Working Method)

#### Step-by-Step Instagram Token Creation

1. **Access Graph API Explorer**
   ```
   URL: https://developers.facebook.com/tools/explorer/1240344454108071/
   ```

2. **Configure Token Settings**
   - **Application**: Select "ROCKETAGENTS" (App ID: 1240344454108071)
   - **User or Page**: Select "User Token" 
   - **Permissions**: Add required Instagram permissions

3. **Required Instagram Permissions**
   ```
   instagram_basic
   instagram_manage_messages
   pages_show_list
   pages_messaging
   pages_read_engagement
   ```

4. **Generate Token Process**
   - Click "Generate Access Token"
   - Authenticate with Facebook account
   - Select Instagram accounts to authorize
   - Copy the generated token

5. **Token Validation**
   ```bash
   # Test token with API call
   curl "https://graph.instagram.com/me?access_token=YOUR_TOKEN&fields=id,username"
   ```

#### Current Working Instagram Token
```
EAARoFjKWE6cBO2ZAG2piIOzYacTBI9g7HZAENMZCyKiIWiqIausZBElWGVXNPmi7ZA9ZCcxMIR524EvTZCt19Gm9OwtpfPx7obheyXG57ekutI2Eu0nLjTu0xixjZCMe17g2cSXr2giUTzdxP02zBTZAJoujBfiAQL8836WRWKXyroTiWJv04psRjIYvtvXwDH5JcuCXhN1n0yKXDRjrAPCY1R13bDGcYZCSh3jz7kWjZBvqreLitKjQjsZD
```

### WhatsApp Token Generation

#### WhatsApp Access Token Process

1. **Navigate to WhatsApp Configuration**
   ```
   Facebook App → Products → WhatsApp → API Setup
   ```

2. **Generate Access Token**
   - Click "Generate access token" 
   - Choose WhatsApp accounts to access
   - Copy the temporary access token

3. **Get Phone Number ID**
   - From the same API Setup page
   - Copy "Phone number ID" (15-digit number)

#### Current Working WhatsApp Configuration
```bash
# WhatsApp Access Token
EAARoFjKWE6cBOZB3BfIYZBlpp1peOaO7NYUeNE3ZCRxbJS1xD3ZAaiKIaWZBVWcqojyT7lSYEGCmX9lZAakpjFWmXHZCztQZAmOoCJ1jLajH9EkYpZC5YBo1k31CelgGu9ZBdR6FwErIaSC75Q9ZADZAbr7NRZAoLZCUtwScTJBBCGgOfzSzPVq2nWFAkqhiIXDaqpMplDxk0JyiqVteYJGQirmrByOxZBZCMAdhH0pMHwiakU1o8Ltj0iTogPQZD

# Phone Number ID
650289724841524

# Display Number
+1 (555) 657-6184
```

### Messenger Token Generation

#### Page Access Token Process

1. **Page Token Generator**
   ```
   URL: https://developers.facebook.com/tools/explorer/
   ```

2. **Select Page**
   - Choose your Facebook Page
   - Select required permissions:
     ```
     pages_messaging
     pages_messaging_subscriptions
     pages_read_engagement
     ```

3. **Generate Long-lived Token**
   ```bash
   curl -X GET "https://graph.facebook.com/oauth/access_token" \
     -d "grant_type=fb_exchange_token" \
     -d "client_id=YOUR_APP_ID" \
     -d "client_secret=YOUR_APP_SECRET" \
     -d "fb_exchange_token=SHORT_LIVED_TOKEN"
   ```

### Token Implementation in Code

#### Environment Variable Structure
```python
# Token hierarchy (fallback system)
VERIFY_TOKEN = os.getenv("VERIFY_TOKEN", "test123")
PAGE_ACCESS_TOKEN = os.getenv("PAGE_ACCESS_TOKEN")
INSTAGRAM_ACCESS_TOKEN = os.getenv("INSTAGRAM_ACCESS_TOKEN", "EMBEDDED_TOKEN")
WHATSAPP_ACCESS_TOKEN = os.getenv("WHATSAPP_ACCESS_TOKEN", "EMBEDDED_TOKEN") 
WHATSAPP_PHONE_NUMBER_ID = os.getenv("WHATSAPP_PHONE_NUMBER_ID", "650289724841524")
```

#### How Tokens Are Used in Code

**Instagram Token Usage:**
```python
# Auto-discover Instagram Business Account ID
ig_account_url = f"https://graph.instagram.com/me?access_token={INSTAGRAM_ACCESS_TOKEN}"
ig_response = await client.get(ig_account_url)
ig_account_id = ig_response.json().get('id')  # Returns: 30378620078396002

# Send message using discovered ID
url = f"https://graph.instagram.com/v19.0/{ig_account_id}/messages"
headers = {"Authorization": f"Bearer {INSTAGRAM_ACCESS_TOKEN}"}
```

**WhatsApp Token Usage:**
```python
# Direct API call with phone number ID
url = f"https://graph.facebook.com/v19.0/{WHATSAPP_PHONE_NUMBER_ID}/messages"
headers = {"Authorization": f"Bearer {WHATSAPP_ACCESS_TOKEN}"}
```

### Token Security and Management

#### Development vs Production

| Environment | Token Storage | Security Level |
|-------------|---------------|----------------|
| **Development** | Hardcoded fallbacks | Low (for testing) |
| **Production** | Environment variables | High (secure) |

#### Production Token Setup
```bash
# .env file (production)
VERIFY_TOKEN=your_secure_verify_token
INSTAGRAM_ACCESS_TOKEN=your_instagram_token
WHATSAPP_ACCESS_TOKEN=your_whatsapp_token
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
PAGE_ACCESS_TOKEN=your_page_token
```

### Token Validation and Testing

#### Instagram Token Test
```bash
curl "https://graph.instagram.com/me?access_token=YOUR_INSTAGRAM_TOKEN&fields=id,username,account_type"
```

#### WhatsApp Token Test  
```bash
curl -X POST "https://graph.facebook.com/v19.0/YOUR_PHONE_ID/messages" \
  -H "Authorization: Bearer YOUR_WHATSAPP_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "messaging_product": "whatsapp",
    "to": "1234567890",
    "type": "template",
    "template": {
      "name": "hello_world",
      "language": {"code": "en_US"}
    }
  }'
```

### Graph API Explorer Reference

#### Instagram Token Generation URL
```
https://developers.facebook.com/tools/explorer/1240344454108071/
```

#### Key Settings Used
- **App**: ROCKETAGENTS (1240344454108071)
- **Token Type**: User Token
- **Permissions**: instagram_basic, instagram_manage_messages
- **API Version**: v19.0

#### Alternative Token Generation Methods

**1. Instagram Basic Display API (Not Used)**
```
https://api.instagram.com/oauth/authorize?
client_id={app-id}&
redirect_uri={redirect-uri}&
scope=user_profile,user_media&
response_type=code
```

**2. System User Token (Production)**
```
Facebook Business Manager → System Users → Generate Token
```

**3. App Token (For app-level operations)**
```bash
curl "https://graph.facebook.com/oauth/access_token?
client_id={app-id}&
client_secret={app-secret}&
grant_type=client_credentials"
```

### Working App Configuration

#### App Details
- **App Name**: ROCKETAGENTS
- **App ID**: 1240344454108071  
- **App Type**: Business
- **Products**: Instagram, WhatsApp, Webhooks

#### Platform Configuration
- **Instagram**: Connected to business account
- **WhatsApp**: Connected to phone number (+1 555 657 6184)
- **Webhooks**: Configured for both platforms

### Verify Token Configuration
```
test123
```

This token is used for webhook verification across all platforms and is embedded as a fallback in the code.

---

## Webhook URLs Configuration

### Complete Webhook Reference Table

| Platform | Scenario | HTTP Method | Webhook URL | Headers | Purpose |
|----------|----------|-------------|-------------|---------|---------|
| **Instagram** | Verification | GET | `/webhook` | - | Verify webhook with Meta |
| **Instagram** | Receive Message | POST | `/webhook` | X-Hub-Signature-256 | Incoming DMs |
| **Instagram** | Receive Media | POST | `/webhook` | X-Hub-Signature-256 | Images/Videos in DMs |
| **Instagram** | Echo/Delivery | POST | `/webhook` | X-Hub-Signature-256 | Message status updates |
| **Instagram** | Read Receipt | POST | `/webhook` | X-Hub-Signature-256 | Message read status |
| **Messenger** | Verification | GET | `/webhook` | - | Verify webhook with Meta |
| **Messenger** | Receive Message | POST | `/webhook` | X-Hub-Signature-256 | Incoming messages |
| **Messenger** | Receive Media | POST | `/webhook` | X-Hub-Signature-256 | Images/Videos/Files |
| **Messenger** | Postback | POST | `/webhook` | X-Hub-Signature-256 | Button clicks |
| **WhatsApp** | Verification | GET | `/webhook/whatsapp` | - | Verify webhook with Meta |
| **WhatsApp** | Receive Message | POST | `/webhook/whatsapp` | X-Hub-Signature-256 | Incoming messages |
| **WhatsApp** | Receive Media | POST | `/webhook/whatsapp` | X-Hub-Signature-256 | Images/Videos/Docs |
| **WhatsApp** | Status Update | POST | `/webhook/whatsapp` | X-Hub-Signature-256 | sent/delivered/read |
| **WhatsApp** | Button Reply | POST | `/webhook/whatsapp` | X-Hub-Signature-256 | Interactive responses |

### Webhook Event Types by Platform

| Platform | Event Object | Message Location | Sender ID Location | Text Location |
|----------|--------------|------------------|-------------------|---------------|
| **Instagram** | `object: "instagram"` | `entry[].messaging[].message` | `entry[].messaging[].sender.id` | `message.text` |
| **Messenger** | `object: "page"` | `entry[].messaging[].message` | `entry[].messaging[].sender.id` | `message.text` |
| **WhatsApp** | `object: "whatsapp_business_account"` | `entry[].changes[].value.messages[]` | `messages[].from` | `messages[].text.body` |

### Webhook Payload Examples

#### Instagram/Messenger Incoming Message
```json
{
  "object": "instagram",  // or "page" for Messenger
  "entry": [{
    "id": "17841471016914790",
    "time": 1750043493792,
    "messaging": [{
      "sender": {"id": "1210797520325236"},
      "recipient": {"id": "17841471016914790"},
      "timestamp": 1750043493792,
      "message": {
        "mid": "MESSAGE_ID",
        "text": "Hello"
      }
    }]
  }]
}
```

#### WhatsApp Incoming Message
```json
{
  "object": "whatsapp_business_account",
  "entry": [{
    "id": "713577224380704",
    "changes": [{
      "field": "messages",
      "value": {
        "messaging_product": "whatsapp",
        "metadata": {
          "display_phone_number": "15556576184",
          "phone_number_id": "650289724841524"
        },
        "contacts": [{
          "profile": {"name": "Khalid"},
          "wa_id": "923406750909"
        }],
        "messages": [{
          "from": "923406750909",
          "id": "wamid.ID",
          "timestamp": "1750049157",
          "type": "text",
          "text": {"body": "Hi"}
        }]
      }
    }]
  }]
}
```

### Webhook Configuration in Meta Dashboard

| Platform | Where to Configure | Settings Required |
|----------|-------------------|-------------------|
| **Instagram** | Facebook App → Products → Webhooks → Instagram | URL: `https://your-ngrok.ngrok.io/webhook`<br>Verify Token: `test123`<br>Subscribe to: `messages` |
| **Messenger** | Facebook App → Products → Webhooks → Page | URL: `https://your-ngrok.ngrok.io/webhook`<br>Verify Token: `test123`<br>Subscribe to: `messages`, `messaging_postbacks` |
| **WhatsApp** | Facebook App → Products → WhatsApp → Configuration | URL: `https://your-ngrok.ngrok.io/webhook/whatsapp`<br>Verify Token: `test123`<br>Subscribe to: `messages` |

---

## AI Response & Send API Configuration

### Complete Send API Reference Table

| Platform | API Endpoint | HTTP Method | Authentication | Request Body Format | Response Format |
|----------|-------------|-------------|----------------|-------------------|-----------------|
| **Instagram** | `https://graph.instagram.com/v19.0/{IG_ACCOUNT_ID}/messages` | POST | Bearer Token | Instagram Message Format | Message ID |
| **Messenger** | `https://graph.facebook.com/v19.0/me/messages` | POST | access_token param | Messenger Message Format | Message ID |
| **WhatsApp** | `https://graph.facebook.com/v19.0/{PHONE_NUMBER_ID}/messages` | POST | Bearer Token | WhatsApp Message Format | Message ID |

### Send API Implementation Details

| Platform | Token Used | Account ID Required | Headers | Success Response |
|----------|------------|-------------------|---------|------------------|
| **Instagram** | `INSTAGRAM_ACCESS_TOKEN` | Yes (Auto-discovered) | `Authorization: Bearer {token}` | `200 OK` |
| **Messenger** | `PAGE_ACCESS_TOKEN` | No (uses 'me') | Query param: `?access_token={token}` | `200 OK` |
| **WhatsApp** | `WHATSAPP_ACCESS_TOKEN` | Phone Number ID | `Authorization: Bearer {token}` | `200 OK` with message_id |

### Message Payload Formats

#### Instagram Send Message
```json
{
  "recipient": {"id": "1210797520325236"},
  "message": {"text": "🤖 You said: 'Hello' - I'm a bot!"}
}
```
**Full API Call:**
```
POST https://graph.instagram.com/v19.0/30378620078396002/messages
Authorization: Bearer EAARoFjKWE6cBO2ZAG2piIOzYacTBI9g7H...
Content-Type: application/json
```

#### Messenger Send Message
```json
{
  "recipient": {"id": "USER_PSID"},
  "message": {"text": "🤖 You said: 'Hello' - I'm a bot!"}
}
```
**Full API Call:**
```
POST https://graph.facebook.com/v19.0/me/messages?access_token={PAGE_TOKEN}
Content-Type: application/json
```

#### WhatsApp Send Message
```json
{
  "messaging_product": "whatsapp",
  "to": "923406750909",
  "text": {
    "body": "🤖 You said: 'Hello' - I'm a bot!"
  }
}
```
**Full API Call:**
```
POST https://graph.facebook.com/v19.0/650289724841524/messages
Authorization: Bearer EAARoFjKWE6cBOZB3BfIYZBlpp1peOaO7N...
Content-Type: application/json
```

### AI Response Generation Flow

| Step | Action | Code Implementation | Result |
|------|--------|-------------------|--------|
| 1 | **Receive Message** | `await request.json()` | Extract user message |
| 2 | **Generate AI Response** | `await get_ai_response(message_text)` | AI-generated reply |
| 3 | **Platform Detection** | Check `data.get("object")` | Route to correct send function |
| 4 | **Send Reply** | Call platform-specific send function | Message delivered |
| 5 | **Log Result** | Print success/error message | Track delivery status |

### AI Response Implementation

```python
async def get_ai_response(message: str) -> str:
    """Generate AI response using OpenAI or fallback to dummy response"""
    
    # Use OpenAI if API key is available
    if OPENAI_API_KEY and not OPENAI_API_KEY.startswith("your_openai"):
        try:
            import openai
            client = openai.AsyncOpenAI(api_key=OPENAI_API_KEY)
            
            response = await client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "You are a helpful AI assistant. Keep responses brief and friendly."},
                    {"role": "user", "content": message}
                ],
                max_tokens=150
            )
            return response.choices[0].message.content.strip()
            
        except Exception as e:
            print(f"❌ OpenAI error: {e}")
            return f"🤖 AI is thinking... (OpenAI error)"
    
    # Fallback dummy response (Currently Used)
    return f"🤖 You said: '{message}' - I'm a bot! (Add OpenAI API key for AI responses)"
```

### Send Function Implementations

#### Instagram Send Function
```python
async def send_message(psid: str, text: str, is_instagram: bool = False):
    if is_instagram:
        # Get Instagram Business Account ID
        ig_account_url = f"https://graph.instagram.com/me?access_token={INSTAGRAM_ACCESS_TOKEN}"
        async with httpx.AsyncClient() as client:
            ig_response = await client.get(ig_account_url)
            ig_data = ig_response.json()
            ig_account_id = ig_data.get('id')  # Returns: 30378620078396002
            
            url = f"https://graph.instagram.com/v19.0/{ig_account_id}/messages"
            headers = {"Authorization": f"Bearer {INSTAGRAM_ACCESS_TOKEN}"}
            
            payload = {
                "recipient": {"id": psid},
                "message": {"text": text}
            }
            
            response = await client.post(url, json=payload, headers=headers)
```

#### WhatsApp Send Function
```python
async def send_whatsapp_message(phone_number: str, text: str):
    url = f"https://graph.facebook.com/v19.0/{WHATSAPP_PHONE_NUMBER_ID}/messages"
    
    payload = {
        "messaging_product": "whatsapp",
        "to": phone_number,
        "text": {"body": text}
    }
    
    headers = {
        "Authorization": f"Bearer {WHATSAPP_ACCESS_TOKEN}",
        "Content-Type": "application/json"
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.post(url, json=payload, headers=headers)
        
        if response.status_code == 200:
            result = response.json()
            message_id = result.get("messages", [{}])[0].get("id")
            print(f"✅ WhatsApp message sent successfully (ID: {message_id})")
```

### Response Success Indicators

| Platform | Success Status Code | Success Response | Log Message |
|----------|-------------------|------------------|-------------|
| **Instagram** | `200` | `{"message_id": "..."}` | `✅ Message sent successfully` |
| **Messenger** | `200` | `{"recipient_id": "...", "message_id": "..."}` | `✅ Message sent successfully` |
| **WhatsApp** | `200` | `{"messages": [{"id": "wamid.ID"}]}` | `✅ WhatsApp message sent successfully (ID: wamid.ID)` |

### Complete Message Flow with AI

```
📱 User sends "Hello" 
    ↓
🔔 Webhook receives message
    ↓
🤖 AI generates: "🤖 You said: 'Hello' - I'm a bot!"
    ↓
📤 Send API call with AI response
    ↓
✅ Message delivered to user
    ↓
📊 Delivery confirmation logged
```

### Error Handling for Send APIs

| Error Code | Platform | Cause | Solution |
|------------|----------|-------|---------|
| `190` | All | Invalid token | Regenerate access token |
| `230` | Instagram/Messenger | User not messageable | 24-hour window expired |
| `131030` | WhatsApp | Recipient not in allowlist | Add number to WhatsApp recipients |
| `131031` | WhatsApp | Unsupported message type | Use supported format |
| `368` | All | Rate limit | Wait and retry |

### Live Log Examples

#### Successful Instagram AI Response
```
📩 Instagram message from 1210797520325236: Hey here
🤖 AI Reply: 🤖 You said: 'Hey here' - I'm a bot! (Add OpenAI API key for AI responses)
📱 Using Instagram Business Account ID: 30378620078396002
✅ Message sent successfully
```

#### Successful WhatsApp AI Response
```
📱 WhatsApp message from 923406750909 (Khalid): I am hrrr
🤖 AI Reply: 🤖 You said: 'I am hrrr' - I'm a bot! (Add OpenAI API key for AI responses)
📤 Sending WhatsApp message to 923406750909
✅ WhatsApp message sent successfully (ID: wamid.HBgMOTIzNDA2NzUwOTA5FQIAERgSRjY1RERFOTM0RDYxNTQ3RTdCAA==)
```

---

## Running the Service

### 1. Install Dependencies
```bash
pip install fastapi uvicorn httpx python-dotenv openai
```

### 2. Start the Service
```bash
python main.py
```
Or directly with uvicorn:
```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### 3. Expose Local Server (Development)
```bash
ngrok http 8000
```
This gives you a public URL like: `https://abc123.ngrok.io`

---

## Message Flow Details

### Instagram Message Flow
1. **User sends message** → Instagram servers
2. **Instagram webhook** → POST to `/webhook`
3. **Message validation** → Skip echo/delivery messages
4. **Get Instagram Account ID** → Using Instagram token
5. **AI Response Generation** → OpenAI or fallback
6. **Send Reply** → Instagram Graph API
7. **Delivery confirmation** → Logged

### WhatsApp Message Flow
1. **User sends message** → WhatsApp servers
2. **WhatsApp webhook** → POST to `/webhook/whatsapp`
3. **Extract message details** → From webhook payload
4. **AI Response Generation** → OpenAI or fallback
5. **Send Reply** → WhatsApp Business API
6. **Message ID returned** → Success confirmation

---

## Key Implementation Details

### 1. Instagram Account ID Discovery
The code automatically discovers the Instagram Business Account ID:
```python
ig_account_url = f"https://graph.instagram.com/me?access_token={INSTAGRAM_ACCESS_TOKEN}"
ig_response = await client.get(ig_account_url)
ig_data = ig_response.json()
ig_account_id = ig_data.get('id')
```

### 2. Message Filtering
Prevents echo loops by filtering:
```python
if message_data.get("is_echo") or "delivery" in messaging_event or "read" in messaging_event:
    continue
```

### 3. WhatsApp Media Handling
Handles different message types:
```python
if message_type == "text":
    message_text = message.get("text", {}).get("body", "")
elif message_type in ["image", "document", "audio", "video"]:
    message_text = f"[{message_type.upper()} message received]"
```

### 4. Contact Name Extraction
Gets sender name from WhatsApp:
```python
for contact in contacts:
    if contact.get("wa_id") == sender_phone:
        contact_name = contact.get("profile", {}).get("name", "WhatsApp User")
        break
```

---

## Testing the Implementation

### Test Instagram
1. Send a DM to your Instagram business account
2. Check logs for:
   - `🔔 WEBHOOK HIT! Someone sent a message!`
   - `📩 Instagram message from...`
   - `✅ Message sent successfully`

### Test WhatsApp
1. Send a message to your WhatsApp business number
2. Check logs for:
   - `📱 WHATSAPP WEBHOOK HIT!`
   - `📱 WhatsApp message from...`
   - `✅ WhatsApp message sent successfully`

---

## Common Issues and Solutions

### Issue 1: Instagram Token Invalid
**Solution**: Generate new token from Graph API Explorer with:
- `instagram_basic`
- `instagram_manage_messages`
- `pages_messaging`

### Issue 2: WhatsApp Recipient Not in Allowlist
**Solution**: Add recipient number in WhatsApp configuration → Phone numbers

### Issue 3: 24-Hour Message Window
**Solution**: For WhatsApp, use template messages outside 24-hour window

### Issue 4: Webhook Not Receiving
**Solution**: 
- Check ngrok is running
- Verify webhook URL in Meta dashboard
- Ensure verify token matches

---

## Log Examples

### Successful Instagram Message
```
🔔 WEBHOOK HIT! Someone sent a message!
📨 Incoming webhook: {...}
📩 Instagram message from 1210797520325236: Hey here
🤖 AI Reply: 🤖 You said: 'Hey here' - I'm a bot!
📱 Using Instagram Business Account ID: 30378620078396002
✅ Message sent successfully
✅ Bot received and processed Instagram message successfully!
```

### Successful WhatsApp Message
```
📱 WHATSAPP WEBHOOK HIT! Someone sent a message!
📨 Incoming WhatsApp webhook: {...}
📱 WhatsApp message from 923406750909 (Khalid): I am hrrr
🤖 AI Reply: 🤖 You said: 'I am hrrr' - I'm a bot!
📤 Sending WhatsApp message to 923406750909
✅ WhatsApp message sent successfully (ID: wamid.HBgMOTIzNDA2NzUwOTA5...)
✅ WhatsApp message processed successfully!
```

---

## Production Notes

1. **Remove hardcoded tokens** - Use environment variables
2. **Add error retry logic** - For network failures
3. **Implement rate limiting** - Respect Meta's limits
4. **Add database logging** - Track conversations
5. **Implement webhook signature verification** - Security
6. **Use HTTPS in production** - Required by Meta

---

## Summary

This implementation successfully handles:
- ✅ Instagram incoming messages
- ✅ Instagram outgoing replies
- ✅ WhatsApp incoming messages
- ✅ WhatsApp outgoing replies
- ✅ Automatic token usage
- ✅ AI response generation
- ✅ Media message detection
- ✅ Contact name extraction
- ✅ Echo/delivery filtering

The code is currently running on port 8000 and working for both platforms with the embedded tokens.