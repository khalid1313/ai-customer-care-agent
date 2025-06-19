# 🚀 AI Customer Care Business Platform

A complete business platform for managing AI-powered customer care agents. This platform allows businesses to register, configure AI agents, manage conversations across multiple channels, test scenarios, and integrate with external services like Shopify, WhatsApp, and Instagram.

## ✨ Platform Features

### 🏢 **Business Management**
- **Business Registration & Login** - Complete authentication system with JWT
- **Multi-user Support** - Owner, Admin, Agent, and Member roles
- **Business Settings** - Configure business hours, notifications, and preferences
- **Team Management** - Invite and manage team members
- **Subscription Management** - Support for different subscription tiers

### 🤖 **AI Agent Configuration**
- **Multiple AI Agents** - Create and manage multiple specialized agents
- **Agent Personality** - Customize agent personality and instructions
- **Tool Selection** - Enable/disable specific tools for each agent
- **Model Configuration** - Choose between GPT-3.5, GPT-4, and configure parameters
- **Knowledge Base** - Custom knowledge base for each agent
- **Performance Analytics** - Track agent performance and usage

### 🎮 **AI Playground**
- **Test Scenarios** - Create and run complex test scenarios
- **Predefined Templates** - Pre-built scenarios based on your Python examples
- **Automated Testing** - Run multiple test messages and analyze results
- **Performance Metrics** - Track response times, tool usage, and accuracy
- **Scenario Sharing** - Share scenarios between team members

### 📨 **Multi-Channel Inbox**
- **Unified Conversations** - Manage all customer conversations in one place
- **Multi-Channel Support** - Web chat, WhatsApp, Instagram, Email, SMS
- **Smart Filtering** - Filter by status, priority, channel, assignment
- **Real-time Updates** - Live conversation updates
- **Assignment System** - Assign conversations to team members
- **Escalation Management** - Automatic escalation based on criteria

### 🎫 **Ticket System**
- **Ticket Management** - Create, assign, and track support tickets
- **Priority Levels** - LOW, NORMAL, HIGH, URGENT priorities
- **Categories** - Organize tickets by type (bug, feature, support, billing)
- **Internal Comments** - Team collaboration with internal notes
- **Resolution Tracking** - Track time to resolution and SLA compliance

### 🔌 **Integrations Hub**
- **Shopify Integration** - Sync products, orders, and customer data
- **WhatsApp Business** - Connect WhatsApp Business API
- **Instagram Messaging** - Handle Instagram DMs and comments
- **Email Integration** - SMTP/IMAP email support
- **Stripe Payments** - Payment processing integration
- **Zendesk** - Ticket system integration
- **Custom Webhooks** - Build custom integrations

### 📊 **Analytics & Reporting**
- **Business Dashboard** - Real-time metrics and KPIs
- **Conversation Analytics** - Response times, resolution rates
- **Agent Performance** - Individual agent performance metrics
- **Channel Distribution** - Traffic analysis across channels
- **Customer Satisfaction** - Track satisfaction scores and feedback
- **Tools Usage** - Monitor which AI tools are most effective

## 🏗️ Technical Architecture

### Backend (Node.js/Express)
```
src/
├── agents/           # AI agent implementations
├── middleware/       # Authentication, authorization
├── routes/          # API endpoints
│   ├── auth.js      # Authentication (login, register)
│   ├── business.js  # Business management
│   ├── agents.js    # AI agent configuration
│   ├── playground.js # Testing scenarios
│   ├── integrations.js # External integrations
│   ├── inbox.js     # Conversation management
│   └── admin.js     # Admin features
├── services/        # Business logic
├── tools/           # AI tools and capabilities
└── utils/           # Utilities and helpers
```

### Database (SQLite/PostgreSQL via Prisma)
- **Businesses** - Multi-tenant business data
- **Users** - Team members with role-based access
- **Agents** - AI agent configurations
- **Conversations** - Multi-channel conversations
- **Messages** - Individual messages and AI responses
- **Tickets** - Support ticket system
- **Integrations** - External service configurations
- **Playground** - Test scenarios and results

## 🚀 Quick Start

### 1. Setup & Installation
```bash
cd /Users/khalid/Documents/ai-customer-care-agent

# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with your OpenAI API key

# Initialize database
npx prisma generate
npx prisma migrate dev

# Setup sample business
node setup-business.js
```

### 2. Start the Server
```bash
npm run dev
# Server runs on http://localhost:3002
```

### 3. Login & Test
```bash
# Login to get JWT token
curl -X POST http://localhost:3002/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin123"}'

# Use the token for authenticated requests
export TOKEN="your_jwt_token_here"

# Get business dashboard
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3002/api/business/dashboard
```

## 📚 API Documentation

### Authentication
```bash
# Register new business
POST /api/auth/register
{
  "businessName": "My Business",
  "email": "admin@mybusiness.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe"
}

# Login
POST /api/auth/login
{
  "email": "admin@mybusiness.com",
  "password": "password123"
}

# Get user profile
GET /api/auth/me
Authorization: Bearer <token>
```

### Business Management
```bash
# Get dashboard metrics
GET /api/business/dashboard?timeRange=7d
Authorization: Bearer <token>

# Update business settings
PUT /api/business/settings
Authorization: Bearer <token>
{
  "name": "Updated Business Name",
  "settings": {
    "businessHours": {...}
  }
}

# Manage team members
GET /api/business/team
POST /api/business/team/invite
PUT /api/business/team/:userId
```

### AI Agent Management
```bash
# List all agents
GET /api/agents
Authorization: Bearer <token>

# Create new agent
POST /api/agents
Authorization: Bearer <token>
{
  "name": "Customer Support Agent",
  "personality": "Friendly and helpful",
  "tools": ["ProductSearchTool", "OrderTrackingTool"]
}

# Test agent
POST /api/agents/:agentId/test
Authorization: Bearer <token>
{
  "message": "I need help with my order"
}

# Get agent analytics
GET /api/agents/:agentId/analytics?timeRange=30d
Authorization: Bearer <token>
```

### Playground Testing
```bash
# List scenarios
GET /api/playground
Authorization: Bearer <token>

# Create scenario
POST /api/playground
Authorization: Bearer <token>
{
  "name": "Product Search Test",
  "messages": [...]
}

# Run scenario
POST /api/playground/:scenarioId/run
Authorization: Bearer <token>
{
  "agentId": "agent_id"
}

# Create from template
POST /api/playground/create-from-template
Authorization: Bearer <token>
{
  "templateName": "Product Search Scenario"
}
```

### Integrations
```bash
# List integrations
GET /api/integrations
Authorization: Bearer <token>

# Add Shopify integration
POST /api/integrations
Authorization: Bearer <token>
{
  "type": "SHOPIFY",
  "name": "My Shopify Store",
  "config": {
    "store_url": "https://mystore.myshopify.com",
    "access_token": "shpat_..."
  }
}

# Test integration
POST /api/integrations/:integrationId/test
Authorization: Bearer <token>

# Sync data
POST /api/integrations/:integrationId/sync
Authorization: Bearer <token>
```

### Inbox Management
```bash
# Get conversations
GET /api/inbox?status=ACTIVE&channel=WEB_CHAT
Authorization: Bearer <token>

# Get conversation details
GET /api/inbox/conversation/:conversationId
Authorization: Bearer <token>

# Assign conversation
PUT /api/inbox/conversation/:conversationId/assign
Authorization: Bearer <token>
{
  "assignedTo": "user_id"
}

# Update status
PUT /api/inbox/conversation/:conversationId/status
Authorization: Bearer <token>
{
  "status": "RESOLVED"
}

# Search conversations
GET /api/inbox/search?q=headphones
Authorization: Bearer <token>
```

## 🧪 Testing Scenarios

The platform includes predefined test scenarios based on your Python examples:

### 1. **Product Search Scenario**
- Tests product discovery and recommendations
- Verifies tool usage: ProductSearchTool, ProductRecommendationTool
- Validates response quality and accuracy

### 2. **Order Tracking Scenario**
- Tests order status and tracking capabilities
- Verifies tool usage: OrderTrackingTool, ShippingTool
- Validates customer support flow

### 3. **Complex Multi-Tool Scenario**
- Tests queries requiring multiple tools
- Verifies tool coordination and context management
- Validates comprehensive responses

### 4. **Customer Support Escalation**
- Tests support workflows and escalation
- Verifies tool usage: CustomerSupportTool, FAQTool
- Validates escalation triggers

### 5. **Ambiguous Query Resolution**
- Tests handling of vague questions
- Verifies clarification requests
- Validates context understanding

### 6. **Payment and Checkout Flow**
- Tests payment-related queries
- Verifies tool usage: PaymentTool, ShoppingCartTool
- Validates security information

## 🔐 Security Features

- **JWT Authentication** - Secure token-based authentication
- **Role-based Access Control** - Owner, Admin, Agent, Member roles
- **Encrypted Credentials** - Integration credentials are encrypted
- **Business Isolation** - Multi-tenant data separation
- **API Key Management** - Secure API key generation and management
- **Input Validation** - Comprehensive request validation
- **Rate Limiting** - Protection against abuse

## 🔌 Available Integrations

### E-commerce
- **Shopify** - Products, orders, customers sync
- **Stripe** - Payment processing

### Messaging
- **WhatsApp Business** - Customer messaging
- **Instagram** - Direct messages and comments
- **Email** - SMTP/IMAP support

### Support
- **Zendesk** - Ticket management
- **Slack** - Team notifications

### Custom
- **Webhooks** - Custom integrations
- **API Keys** - External service authentication

## 📈 Analytics & Metrics

### Business Dashboard
- Total conversations and messages
- Response times and resolution rates
- Channel distribution
- Customer satisfaction scores
- Agent performance overview

### Agent Analytics
- Individual agent performance
- Tool usage statistics
- Approval rates and feedback
- Processing times
- Conversation handling

### Playground Results
- Scenario execution results
- Tool usage analysis
- Response quality metrics
- Performance benchmarks

## 🚀 Deployment Options

### Development
```bash
npm run dev
```

### Production
```bash
npm start
```

### Docker
```bash
docker build -t ai-customer-care .
docker run -p 3002:3002 ai-customer-care
```

### Cloud Platforms
- **Railway** - One-click deployment
- **Vercel** - Serverless deployment
- **Heroku** - Traditional PaaS
- **AWS/GCP/Azure** - Full cloud deployment

## 📦 Environment Variables

```bash
# Core Configuration
OPENAI_API_KEY=your_openai_api_key
DATABASE_URL=file:./dev.db
PORT=3002
NODE_ENV=development

# Authentication
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=7d
ENCRYPTION_KEY=your_encryption_key

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Integrations
WHATSAPP_TOKEN=your_whatsapp_token
INSTAGRAM_ACCESS_TOKEN=your_instagram_token
# ... other integration keys
```

## 🎯 Business Use Cases

### E-commerce Stores
- Product recommendations and search
- Order tracking and support
- Cart management and checkout assistance
- Return and refund processing

### SaaS Companies
- Customer onboarding assistance
- Feature explanation and guidance
- Billing and subscription support
- Technical troubleshooting

### Service Businesses
- Appointment scheduling
- Service information and pricing
- Customer support and FAQ
- Lead qualification

### Enterprise
- Multi-department support
- Complex integration requirements
- Advanced analytics and reporting
- Custom tool development

## 🛠️ Customization

### Custom Tools
Add new tools by extending the CustomerCareTools class:

```javascript
createCustomTool() {
    return new DynamicTool({
        name: 'CustomTool',
        description: 'Your custom tool description',
        func: async (input) => {
            // Your custom logic
            return result;
        }
    });
}
```

### Custom Integrations
Add new integrations by extending the integrations framework:

```javascript
// Add to INTEGRATION_TYPES
CUSTOM_SERVICE: {
    name: 'Custom Service',
    description: 'Your custom service integration',
    category: 'Custom',
    fields: [...]
}
```

### Custom Analytics
Extend the analytics system with custom metrics:

```javascript
// Add custom metrics to dashboard
const customMetrics = await calculateCustomMetrics();
```

## 📞 Support & Documentation

### Sample Login Credentials
- **Email**: admin@example.com
- **Password**: admin123
- **Business**: Demo Business

### API Testing
Use the provided curl commands or import into Postman/Insomnia for testing.

### Development
- Check logs for debugging information
- Use Prisma Studio for database inspection: `npx prisma studio`
- Monitor API endpoints with the built-in logging

---

🎉 **Your complete AI Customer Care Business Platform is ready!** 

This platform provides everything you need to manage AI-powered customer service at scale, with multi-channel support, advanced testing capabilities, and comprehensive business management features.