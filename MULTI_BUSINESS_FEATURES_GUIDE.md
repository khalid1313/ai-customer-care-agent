# Multi-Business Features - Complete Guide

## Overview
The AI Customer Care Agent supports multiple businesses with their own Shopify stores and Pinecone vector databases. Here's exactly where everything is located.

## 1. Database Schema
**Location:** `/prisma/schema.prisma`

### Business Model (lines 15-51)
```prisma
model Business {
  // Shopify Integration
  shopifyDomain      String?  // line 30
  shopifyAccessToken String?  // line 31
  shopifyStoreId     String?  // line 32
  
  // Pinecone Integration  
  pineconeNamespace  String?  // line 35
  pineconeIndexName  String?  // line 36
  lastProductSync    DateTime? // line 37
}
```

## 2. Backend Services

### BusinessContextLoader
**Location:** `/src/services/BusinessContextLoader.js`
- Loads business-specific data
- Manages context caching
- Switches between Shopify/Database sources

### ShopifyService
**Location:** `/src/services/ShopifyService.js`
- Connects to Shopify API
- Fetches products, orders, customers
- Handles webhooks

## 3. Enhanced AI Tools

### CustomerCareTools
**Location:** `/src/tools/CustomerCareTools.js`
- **Constructor:** Accepts businessContext (line 12)
- **searchShopifyProducts():** Uses Shopify API when available (lines 262-296)
- **loadBusinessData():** Loads business-specific data (lines 50-77)

## 4. API Endpoints

### Business Management Routes
**Location:** `/src/routes/business.js`

#### Create Business
```
POST /api/business/create
```
Lines 495-568

#### Connect Shopify
```
POST /api/business/:businessId/integrations/shopify
Body: { domain: "store.myshopify.com", accessToken: "shpat_xxx" }
```
Lines 573-660

#### Connect Pinecone
```
POST /api/business/:businessId/integrations/pinecone
Body: { namespace: "business-namespace", indexName: "products" }
```
Lines 665-739

#### Sync Products from Shopify
```
POST /api/business/:businessId/sync/products
```
Lines 744-860

#### Get Business Details
```
GET /api/business/:businessId
```
Lines 865-958

## 5. Frontend UI

### Integrations Page
**Location:** `/frontend/src/app/integrations/page.tsx`
- Visual interface for managing integrations
- Connect Shopify/Pinecone with forms
- One-click product sync
- Real-time status display

### Navigation Update
**Location:** `/frontend/src/components/Navigation.tsx`
- Added Integrations menu item (line 15)

## 6. How It All Works Together

### When AI Receives a Product Query:

1. **Session starts** in playground or chat
2. **BusinessContextLoader** loads business data
3. **CustomerCareTools** initialized with context
4. **ProductSearchTool** checks if Shopify is connected:
   - **If YES:** Uses ShopifyService to fetch live data
   - **If NO:** Uses database/CSV files
5. **Response** includes data source indicator

### In the Code:
```javascript
// In chat/playground routes
const businessContext = await businessContextLoader.loadBusinessContext(sessionId, businessId);
const tools = new CustomerCareTools(sessionId, businessContext);

// Tools automatically use appropriate data source
const result = await tools.createProductSearchTool().func("wireless headphones");
// Returns Shopify data if connected, database data otherwise
```

## 7. Current Status

Your business (ID: `cmbsfx1qt0001tvvj7hoemk12`) currently has:
- ❌ Shopify: Not connected
- ❌ Pinecone: Not connected
- ✅ Using static product data from CSV/database

## 8. Quick Setup

### Via API:
```bash
# Connect Shopify
curl -X POST http://localhost:3004/api/business/cmbsfx1qt0001tvvj7hoemk12/integrations/shopify \
  -H "Content-Type: application/json" \
  -d '{"domain": "your-store.myshopify.com", "accessToken": "shpat_xxx"}'

# Sync Products
curl -X POST http://localhost:3004/api/business/cmbsfx1qt0001tvvj7hoemk12/sync/products
```

### Via UI:
1. Go to http://localhost:3000/integrations
2. Click "Connect Shopify"
3. Enter your store details
4. Click "Sync Products"

## 9. Testing

1. Go to Playground: http://localhost:3000/playground2
2. Ask: "Show me your products"
3. Check backend logs - you'll see:
   - "Using business context" if connected
   - "Using default system data" if not

## Summary

The multi-business features are fully implemented and ready to use. They're just waiting for:
1. A Shopify store to connect to
2. Shopify API credentials
3. Optional: Pinecone configuration for vector search

Once connected, the AI automatically switches to live data without any code changes!