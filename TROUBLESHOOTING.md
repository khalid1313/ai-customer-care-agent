# AI Customer Care Agent - Troubleshooting Guide

This document contains solutions to common issues that occur during development and deployment.

## Table of Contents
1. [Password/Login Issues](#password-login-issues)
2. [Synced Products Missing](#synced-products-missing)
3. [Business ID Mismatches](#business-id-mismatches)
4. [Shopify Integration Issues](#shopify-integration-issues)
5. [Pinecone Integration Issues](#pinecone-integration-issues)
6. [Quick Recovery Scripts](#quick-recovery-scripts)

---

## Password/Login Issues

### Problem
- Login fails with "Invalid email or password"
- User exists but password doesn't work
- Authentication errors

### Solution
```bash
# Reset password for khalid@clicky.pk
docker exec aicare-backend node -e "
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();
bcrypt.hash('khalid123', 10).then(hashedPassword => {
  return prisma.user.update({
    where: { email: 'khalid@clicky.pk' },
    data: { password: hashedPassword }
  });
}).then(user => {
  console.log('✅ Password reset for:', user.email);
}).finally(() => prisma.\$disconnect())
"
```

### Login Credentials
- **Email**: `khalid@clicky.pk`
- **Password**: `khalid123`
- **Frontend URL**: `http://localhost:3000/login`

---

## Synced Products Missing

### Problem
- Products show as 0 or empty
- Previously synced products not visible
- Product sync data lost

### Diagnosis
```bash
# Check total products in database
docker exec aicare-backend node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
Promise.all([
  prisma.productSync.count(),
  prisma.productSync.groupBy({ by: ['businessId'], _count: { id: true } })
]).then(([total, byBusiness]) => {
  console.log('Total products:', total);
  console.log('Products by business:');
  byBusiness.forEach(g => console.log(\`Business \${g.businessId}: \${g._count.id} products\`));
}).finally(() => prisma.\$disconnect())
"
```

### Solution
If products exist but are in different business ID, link user to correct business:
```bash
# Update user to business with products (replace BUSINESS_ID with actual ID)
docker exec aicare-backend node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.user.update({
  where: { email: 'khalid@clicky.pk' },
  data: { businessId: 'BUSINESS_ID_WITH_PRODUCTS' }
}).then(user => {
  console.log('✅ User linked to business:', user.businessId);
}).finally(() => prisma.\$disconnect())
"
```

---

## Business ID Mismatches

### Problem
- Frontend shows wrong business data
- User account linked to wrong business
- Configuration lost after development

### Known Business IDs
- **Current Working Business**: `cmbu6vu5o0000ly7bpxb5ryh8` (has 250 products)
- **Alternative Business**: `cmbsfx1qt0001tvvj7hoemk12` (empty)

### Check Current User Business
```bash
docker exec aicare-backend node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.user.findUnique({
  where: { email: 'khalid@clicky.pk' },
  select: { email: true, businessId: true }
}).then(user => {
  console.log('User business ID:', user.businessId);
}).finally(() => prisma.\$disconnect())
"
```

### Update Frontend Configuration
Update `/frontend/.env.local`:
```env
NEXT_PUBLIC_BUSINESS_ID=cmbu6vu5o0000ly7bpxb5ryh8
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001
```

---

## Shopify Integration Issues

### Problem
- Shopify shows as "Not Connected"
- Integration status lost
- Configuration missing

### Check Current Status
```bash
docker exec aicare-backend node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.business.findUnique({
  where: { id: 'cmbu6vu5o0000ly7bpxb5ryh8' },
  select: { shopifyDomain: true, shopifyApiKey: true, shopifyAccessToken: true }
}).then(business => {
  console.log('Shopify Domain:', business.shopifyDomain);
  console.log('API Key Set:', !!business.shopifyApiKey);
  console.log('Access Token Set:', !!business.shopifyAccessToken);
}).finally(() => prisma.\$disconnect())
"
```

### Restore Shopify Configuration
```bash
docker exec aicare-backend node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.business.update({
  where: { id: 'cmbu6vu5o0000ly7bpxb5ryh8' },
  data: {
    shopifyDomain: 'mister-sfc.myshopify.com',
    shopifyApiKey: 'your-api-key-here',
    shopifyAccessToken: 'your-access-token-here',
    shopifyStoreId: 'mister-sfc-store'
  }
}).then(() => {
  console.log('✅ Shopify integration restored');
}).finally(() => prisma.\$disconnect())
"
```

---

## Pinecone Integration Issues

### Problem
- Pinecone shows as "Not Connected"
- Vector search not working
- Index configuration lost

### Check Current Status
```bash
docker exec aicare-backend node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.business.findUnique({
  where: { id: 'cmbu6vu5o0000ly7bpxb5ryh8' },
  select: { pineconeApiKey: true, pineconeEnvironment: true, pineconeIndexName: true, pineconeNamespace: true }
}).then(business => {
  console.log('API Key Set:', !!business.pineconeApiKey);
  console.log('Environment:', business.pineconeEnvironment);
  console.log('Index Name:', business.pineconeIndexName);
  console.log('Namespace:', business.pineconeNamespace);
}).finally(() => prisma.\$disconnect())
"
```

### Restore Pinecone Configuration
```bash
docker exec aicare-backend node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.business.update({
  where: { id: 'cmbu6vu5o0000ly7bpxb5ryh8' },
  data: {
    pineconeApiKey: 'pcsk_369vFM_FQnYT21x64dsr3rxoZ9DdoMLbVoTNZPw7FEZaTjXLYwV1k6tiaqpXgXeRTM5SWw',
    pineconeEnvironment: 'insig1',
    pineconeIndexName: 'mrsfc',
    pineconeNamespace: 'mrsfc'
  }
}).then(() => {
  console.log('✅ Pinecone integration restored');
}).finally(() => prisma.\$disconnect())
"
```

---

## Quick Recovery Scripts

### Complete System Restore
Save this as `/restore-complete-config.js`:
```javascript
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

async function restoreCompleteConfig() {
    const prisma = new PrismaClient();
    
    try {
        console.log('🔧 Restoring complete configuration...');
        
        const businessId = 'cmbu6vu5o0000ly7bpxb5ryh8'; // Business with products
        const userEmail = 'khalid@clicky.pk';
        const userPassword = 'khalid123';
        
        // 1. Reset user password and link to correct business
        const hashedPassword = await bcrypt.hash(userPassword, 10);
        await prisma.user.update({
            where: { email: userEmail },
            data: { 
                password: hashedPassword,
                businessId: businessId
            }
        });
        console.log('✅ User password and business linkage restored');
        
        // 2. Update business integrations
        await prisma.business.update({
            where: { id: businessId },
            data: {
                shopifyDomain: 'mister-sfc.myshopify.com',
                shopifyApiKey: 'your-api-key-here',
                shopifyAccessToken: 'your-access-token-here',
                shopifyStoreId: 'mister-sfc-store',
                pineconeApiKey: 'pcsk_369vFM_FQnYT21x64dsr3rxoZ9DdoMLbVoTNZPw7FEZaTjXLYwV1k6tiaqpXgXeRTM5SWw',
                pineconeEnvironment: 'insig1',
                pineconeIndexName: 'mrsfc',
                pineconeNamespace: 'mrsfc'
            }
        });
        console.log('✅ Business integrations configured');
        
        // 3. Verify products
        const productCount = await prisma.productSync.count({
            where: { businessId: businessId }
        });
        
        console.log('\n📊 Configuration Summary:');
        console.log('Business ID:', businessId);
        console.log('Shopify Domain: mister-sfc.myshopify.com');
        console.log('Pinecone Index: mrsfc');
        console.log('Products Available:', productCount);
        
        console.log('\n🎯 Login Credentials:');
        console.log('Email:', userEmail);
        console.log('Password:', userPassword);
        console.log('Frontend URL: http://localhost:3000/login');
        
        console.log('\n⚠️  Don\'t forget to update frontend/.env.local:');
        console.log('NEXT_PUBLIC_BUSINESS_ID=' + businessId);
        
    } catch (error) {
        console.error('❌ Error restoring configuration:', error);
    } finally {
        await prisma.$disconnect();
    }
}

restoreCompleteConfig();
```

### Run Complete Restore
```bash
docker exec aicare-backend node restore-complete-config.js
```

### Environment Check
```bash
# Check if containers are running
docker ps | grep aicare

# Check if ports are accessible
curl -I http://localhost:3000
curl -I http://localhost:3001

# Check backend logs
docker logs aicare-backend --tail 20
```

---

## Common Port Issues

### Backend Port Configuration
Ensure `.env` file has:
```env
PORT=3001
FRONTEND_URL=http://localhost:3000
```

### Frontend Port Configuration
Ensure `frontend/.env.local` has:
```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001
NEXT_PUBLIC_BUSINESS_ID=cmbu6vu5o0000ly7bpxb5ryh8
```

---

## Emergency Commands

### Start Docker Containers
```bash
cd /Users/khalid/Documents/ai-customer-care-agent
docker-compose -f docker-compose.aicare.yml up -d
```

### Stop All Containers
```bash
docker-compose -f docker-compose.aicare.yml down
```

### Rebuild Containers
```bash
docker-compose -f docker-compose.aicare.yml up --build -d
```

### Access Database Directly
```bash
docker exec -it aicare-backend npx prisma studio
```

---

---

## Image Upload Issues

### Problem
- Image uploads fail with "trouble connecting to AI service"
- Browser console shows 400 Bad Request error
- Backend logs show validation failed for empty message

### Root Cause
Frontend sends empty `message` field when uploading images without text, but backend validation requires non-empty messages.

### Symptoms
```javascript
// Frontend sends:
{
  "message": "",  // ← Empty string causes 400 error
  "image": "data:image/...",
  "sessionId": "playground-xxx"
}

// Backend responds:
{"error":"Validation failed","details":[{"type":"field","value":"","msg":"Invalid value","path":"message","location":"body"}]}
```

### Solution - Frontend Fix
**File**: `/frontend/src/app/playground/page.tsx`

**Original problematic code** (around line 247):
```javascript
const requestBody = {
  message: currentMessage,  // ← Can be empty string
  image: currentImage,
  sessionId: actualSessionId,
  businessId: business?.id || 'default-business-id',
  source: 'playground'
}
```

**Fixed code**:
```javascript
const requestBody = {
  message: currentMessage || (currentImage ? "I uploaded an image" : ""),  // ← Fallback message
  image: currentImage,
  sessionId: actualSessionId,
  businessId: business?.id || 'default-business-id',
  source: 'playground'
}
```

### Apply Fix
1. Edit the frontend code as shown above
2. Restart frontend container:
   ```bash
   docker-compose -f docker-compose.aicare.yml restart aicare-frontend
   ```
3. **Hard refresh browser** (Cmd+Shift+R) to clear cached JavaScript
4. Test image upload

### Alternative Backend Fix (Not Recommended for Production)
If you prefer to modify backend validation in `/src/routes/ai-chat.js`:
```javascript
// Allow empty message if image is provided
body('message').isString().trim().custom((value, { req }) => {
  if (req.body.image && value.length === 0) {
    return true;
  }
  if (value.length < 1 || value.length > 1000) {
    throw new Error('Message must be between 1 and 1000 characters when no image is provided');
  }
  return true;
}),
```

### Image Processing Model Issues

### Problem
- Images upload successfully but AI responds with "trouble connecting" 
- Backend logs show deprecated model errors

### Root Cause
Using deprecated `gpt-4-vision-preview` model instead of current vision models.

### Error in Logs
```
The model `gpt-4-vision-preview` has been deprecated
```

### Solution
**File**: `/src/tools/VisualSearchTool.js` (around line 146)

**Change**:
```javascript
// Old deprecated model
model: "gpt-4-vision-preview",

// New working model  
model: "gpt-4o",
```

### Apply Fix
1. Update the model name in VisualSearchTool.js
2. Rebuild backend container:
   ```bash
   docker-compose -f docker-compose.aicare.yml up --build -d aicare-backend
   ```
3. Test image processing

---

## Notes

- Always use business ID `cmbu6vu5o0000ly7bpxb5ryh8` (has 250 synced products)
- Shopify store: `mister-sfc.myshopify.com`
- Pinecone index: `mrsfc`
- User credentials: `khalid@clicky.pk` / `khalid123`
- When configurations get lost during development, run the complete restore script
- Frontend must be refreshed after backend configuration changes
- **Always hard refresh browser (Cmd+Shift+R) after frontend code changes**

---

*Last updated: June 13, 2025*