# AI ChatBot Integration Guide

This document describes the AI ChatBot functionality that has been integrated into your Live Chat system.

## 🤖 AI ChatBot Features

### ✅ **Configurable OpenAI Integration**
- Dynamic API key configuration (not stored in .env)
- Organization support for OpenAI accounts
- Real-time testing and status monitoring
- Secure API key management

### ✅ **Organizational Structure**
- **Main Organization**: `/lightwave`
- **Sub-departments**:
  - `/lightwave/general` - General inquiries and routing
  - `/lightwave/sales` - Product sales, pricing, quotes
  - `/lightwave/technical` - Technical support and troubleshooting
  - `/lightwave/support` - Customer support and service
  - `/lightwave/billing` - Billing and payment support

### ✅ **Intelligent Routing & Flow**
- **Intent Analysis**: AI analyzes customer messages to suggest appropriate departments
- **Smart Routing**: Automatic department suggestions based on keywords and context
- **Flow Management**: Seamless transitions between departments and bot personalities
- **Human Handoff**: AI can transfer customers to human agents when needed

## 🚀 How It Works

### **Customer Journey Flow**

1. **Initial Contact**
   ```
   Customer starts chat → AI Bot greets (General Assistant "Alex")
   ```

2. **Intent Detection**
   ```
   Customer: "I need help with billing"
   AI: Analyzes → Routes to Billing → Transfers to "David" (Billing Specialist)
   ```

3. **Department Transfer**
   ```
   AI: "Let me transfer you to our Billing Department."
   AI: "Hi, I'm David from Billing. I can help with payment questions."
   ```

4. **Human Agent Request**
   ```
   Customer: "I want to speak with a human agent"
   AI: "I'm connecting you with our team. Please wait..."
   System: Creates agent request → Notifies human agents
   ```

### **AI Bot Personalities**

| Department | Bot Name | Role | Specialization |
|------------|----------|------|----------------|
| General | Alex | General Assistant | Routing, basic info |
| Sales | Sarah | Sales Specialist | Products, pricing, demos |
| Technical | Mike | Technical Support | Troubleshooting, bugs |
| Support | Emma | Customer Support | Account help, service |
| Billing | David | Billing Specialist | Payments, subscriptions |

## 🛠️ Setup & Configuration

### **1. Install Dependencies**
```bash
npm install
```
The OpenAI package has been added to package.json automatically.

### **2. Configure OpenAI**
1. Go to `/ai-config.html` in your browser
2. Enter your OpenAI API key (starts with `sk-`)
3. Optionally add Organization ID (starts with `org-`)
4. Click "Configure AI"
5. Test the connection

### **3. Department Management**
The system comes with pre-configured departments under `/lightwave`, but you can:
- View department statistics
- Monitor agent assignments
- Check queue sizes
- Enable/disable AI per department

### **4. Start the Server**
```bash
npm run dev
```

## 🎯 Key Features

### **Dynamic API Configuration**
- **No .env storage**: API keys are configured at runtime
- **Live updates**: Change API keys without restarting
- **Organization support**: Multi-org OpenAI accounts supported
- **Security**: Keys are masked in UI after configuration

### **Intelligent Conversation Flow**
```javascript
// Example conversation flow:
Customer: "My product isn't working properly"
AI: Detects technical issue → Routes to Technical
AI: "Let me transfer you to Technical Support..."
AI: "Hi, I'm Mike from Technical Support. What specific issue are you experiencing?"

Customer: "I want to buy your premium plan"
AI: Detects sales intent → Routes to Sales
AI: "Great! Let me connect you with our Sales team..."
AI: "Hi, I'm Sarah from Sales. I'd love to help you with our premium plan!"
```

### **Human Agent Integration**
- **AI First**: Customers start with AI bot
- **Smart Handoff**: AI transfers to humans when needed
- **Context Preservation**: Conversation history maintained
- **Agent Dashboard**: Agents see AI conversation history

## 🔧 API Endpoints

### **AI Configuration**
```
POST /api/ai/openai/configure  - Configure OpenAI API
GET  /api/ai/openai/status     - Check configuration status
POST /api/ai/openai/test       - Test AI connection
DELETE /api/ai/openai/clear    - Clear configuration
```

### **Department Management**
```
GET  /api/ai/departments       - Get all departments
PUT  /api/ai/departments/:id   - Update department
GET  /api/ai/departments/:id/stats - Get department stats
```

## 🎨 UI Components

### **Agent Dashboard Integration**
- **AI Config Button**: Quick access to AI configuration
- **AI Message Indicators**: Bot messages shown with different styling
- **Department Context**: See which department a chat belongs to

### **Customer Experience**
- **Seamless AI Chat**: Natural conversation flow
- **Department Options**: AI can show department selection buttons
- **Human Handoff**: Smooth transition to human agents

## 📊 Department Statistics

The AI Config page shows real-time statistics:
- **Agents Online**: Active agents per department
- **Queue Size**: Waiting customers per department  
- **AI Status**: Whether AI is enabled for each department
- **Total Overview**: Organization-wide metrics

## 🔄 Message Flow Architecture

```
Customer Message
    ↓
Save to Database
    ↓
Check for Human Agents in Room
    ↓
[No Human Agents] → Process with AI Bot
    ↓
AI Analyzes Intent & Department
    ↓
Generate Response OR Transfer to Human
    ↓
Send Response & Update UI
```

## 🚨 Important Notes

### **AI Safety**
- AI responses are generated in real-time
- Conversation history is maintained per chat room
- AI can recognize when to transfer to humans
- All messages are logged in the database

### **Performance**
- AI only responds when no human agents are in the room
- Conversation history is limited to last 20 messages
- Intent analysis uses lightweight models for speed

### **Fallback Handling**
- If AI fails, chat continues without interruption
- Error messages don't break the customer experience
- Human agents can always take over

## 🎯 Usage Examples

### **Configure AI**
1. Open browser to `http://localhost:3000/ai-config.html`
2. Enter OpenAI API key: `sk-your-api-key-here`
3. Test connection to verify it works
4. AI is now active for all new chats

### **Customer Scenarios**

**Sales Inquiry:**
```
Customer: "What are your pricing options?"
AI (Alex): "I can help you with pricing! Let me connect you with our Sales team."
AI (Sarah): "Hi! I'm Sarah from Sales. I'd love to help you find the perfect plan!"
```

**Technical Issue:**
```
Customer: "The app keeps crashing when I try to login"
AI (Alex): "That sounds like a technical issue. Let me transfer you to our Technical Support."
AI (Mike): "Hi, I'm Mike from Technical Support. Can you tell me what device you're using?"
```

**Human Agent Request:**
```
Customer: "I need to speak with a real person"
AI: "I understand you'd like to speak with a human agent. Let me connect you..."
System: Notifies all agents → Creates new chat request
```

## 🎉 Success!

Your AI ChatBot system is now ready! Customers will receive intelligent, contextual responses while being seamlessly routed to the right department or human agent when needed.

The system maintains your existing chat functionality while adding powerful AI capabilities that can handle common inquiries and improve customer experience.