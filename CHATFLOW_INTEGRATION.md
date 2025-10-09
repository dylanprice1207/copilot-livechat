# Chatflow Integration Documentation

## Overview

The customer chat now uses the chatflow functionality to provide intelligent auto-responses, smart routing, and quick actions for customers. This integration enhances the customer experience with immediate responses and contextual assistance.

## How It Works

### 1. Chatflow Configuration
- Chatflow settings are stored in the `Settings` MongoDB model
- Configuration includes welcome messages, quick actions, auto-responses, and smart routing rules
- Admins can configure these through the existing admin interface

### 2. Customer Chat Integration
- When a customer starts a chat, a chatflow session is automatically created
- The system loads the chatflow configuration and displays welcome message + quick actions
- Every customer message is processed through the chatflow service for auto-responses and routing

### 3. Key Features

#### Welcome Messages
- Personalized welcome messages when customers start a chat
- Configurable through admin settings
- Fallback to default message if not configured

#### Quick Actions
- Pre-defined buttons for common customer needs
- Displayed at chat start and can be shown contextually
- Each action can provide instant responses or route to specific departments

#### Auto-Responses
- Keyword-based automatic responses to customer messages
- Provides immediate help for common queries
- Reduces wait time and improves customer satisfaction

#### Smart Routing
- Automatically routes customers to appropriate departments based on message keywords
- Ensures customers reach the right agent faster
- Configurable rules with priority levels

## API Endpoints

### GET /api/chatflow/config
Returns the current chatflow configuration
```json
{
  "enabled": true,
  "welcomeFlow": "Welcome message...",
  "quickActions": [...],
  "autoResponses": [...],
  "smartRouting": {...}
}
```

### GET /api/chatflow/welcome
Returns personalized welcome message
```json
{
  "message": "Hi there! Welcome to support..."
}
```

### POST /api/chatflow/session
Creates a new chatflow session for a customer
```json
{
  "customerId": "socket-id",
  "customerName": "John Doe",
  "customerEmail": "john@example.com"
}
```

### POST /api/chatflow/process
Processes a customer message through chatflow logic
```json
{
  "sessionId": "session-id",
  "message": "I need help",
  "customerId": "socket-id",
  "customerName": "John Doe"
}
```

### POST /api/chatflow/quick-action
Handles quick action button clicks
```json
{
  "sessionId": "session-id",
  "action": {
    "text": "Technical Support",
    "response": "Connecting you to tech support...",
    "routeToDepartment": "Technical"
  }
}
```

## Implementation Details

### Frontend Changes (customer.js)
1. **Session Management**: Creates chatflow session when chat starts
2. **Welcome Flow**: Loads and displays personalized welcome message
3. **Quick Actions**: Renders interactive buttons for common actions
4. **Message Processing**: Routes all messages through chatflow before sending to agents
5. **Auto-Response Display**: Shows instant responses from chatflow system

### Backend Services

#### ChatFlowService.js
- **processMessage()**: Main message processing logic
- **checkAutoResponses()**: Matches keywords against response rules
- **checkSmartRouting()**: Determines department routing based on content
- **Session Management**: Tracks customer interactions and context

#### Routes (chatflow.js)
- RESTful API endpoints for chatflow functionality
- No authentication required (public endpoints)
- JSON-based request/response format

### Database Models

#### Settings Model
- Stores all chatflow configuration
- Organization-specific settings support
- Default configuration with sample data
- Helper methods for easy access

## Testing

### Manual Testing
1. Open `http://localhost:3000/test-chatflow.html` to test API endpoints
2. Open `http://localhost:3000/customer.html` to test customer experience
3. Try different message keywords to test auto-responses and routing

### Expected Behavior
1. **Chat Start**: Welcome message + quick action buttons appear
2. **Quick Actions**: Clicking buttons provides instant responses
3. **Auto-Responses**: Keywords like "hello", "thanks" trigger automatic replies
4. **Smart Routing**: Technical keywords route to technical department
5. **Fallback**: Unknown messages proceed to normal agent workflow

## Configuration Examples

### Quick Actions
```javascript
{
  text: 'Technical Support',
  response: 'I\'ll connect you with our technical team.',
  routeToDepartment: 'Technical'
}
```

### Auto-Responses
```javascript
{
  keywords: ['hello', 'hi', 'hey'],
  response: 'Hello! Welcome to our support chat. How can I assist you today?'
}
```

### Smart Routing Rules
```javascript
{
  keywords: ['bug', 'error', 'issue', 'technical'],
  department: 'Technical',
  priority: 1
}
```

## Benefits

1. **Improved Response Time**: Instant auto-responses for common queries
2. **Better Routing**: Customers reach the right department faster
3. **Enhanced UX**: Quick actions provide easy navigation
4. **Reduced Agent Load**: Auto-responses handle simple queries
5. **Consistent Experience**: Standardized welcome flow and responses

## Future Enhancements

1. **AI Integration**: Use OpenAI for more intelligent responses
2. **Analytics**: Track chatflow effectiveness and optimization opportunities
3. **A/B Testing**: Test different welcome messages and quick actions
4. **Multilingual**: Support for multiple languages in responses
5. **Advanced Routing**: ML-based department assignment