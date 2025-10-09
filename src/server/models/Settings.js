const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    default: null // null means global settings
  },
  organization: {
    name: { type: String, default: 'Lightwave AI' },
    domain: { type: String, default: 'lightwave.ai' },
    timezone: { type: String, default: 'UTC' },
    language: { type: String, default: 'en' }
  },
  chat: {
    welcomeMessage: { 
      type: String, 
      default: 'Hello! How can we help you today?' 
    },
    offlineMessage: { 
      type: String, 
      default: 'We are currently offline. Please leave a message and we will get back to you.' 
    },
    enableFileUpload: { type: Boolean, default: true },
    enableTypingIndicator: { type: Boolean, default: true },
    maxChatDuration: { type: Number, default: 60 },
    autoCloseInactive: { type: Number, default: 30 }
  },
  departments: [{
    name: { type: String, required: true },
    description: { type: String, default: '' },
    enabled: { type: Boolean, default: true }
  }],
  notifications: {
    email: { type: Boolean, default: true },
    browser: { type: Boolean, default: true },
    sound: { type: Boolean, default: false },
    notificationEmail: { type: String, default: 'admin@lightwave.ai' }
  },
  security: {
    requireAuth: { type: Boolean, default: false },
    enableGuestChat: { type: Boolean, default: true },
    sessionTimeout: { type: Number, default: 24 },
    maxLoginAttempts: { type: Number, default: 5 }
  },
  ai: {
    openaiApiKey: { type: String, default: '' },
    defaultModel: { type: String, default: 'gpt-4' },
    maxTokens: { type: Number, default: 2000 },
    temperature: { type: Number, default: 0.7 },
    presencePenalty: { type: Number, default: 0.6 },
    enabled: { type: Boolean, default: true }
  },
  chatFlow: {
    enabled: { type: Boolean, default: true },
    welcomeFlow: { 
      type: String, 
      default: 'Hi there! 👋 Welcome to Lightwave AI support. How can I help you today?' 
    },
    showQuickActions: { type: Boolean, default: true },
    quickActions: [{
      text: { type: String, required: true },
      response: { type: String, default: '' },
      routeToDepartment: { type: String, default: '' },
      keywords: [{ type: String }],
      enabled: { type: Boolean, default: true }
    }],
    autoResponses: [{
      keywords: [{ type: String, required: true }],
      response: { type: String, required: true },
      priority: { type: Number, default: 1 },
      enabled: { type: Boolean, default: true }
    }],
    smartRouting: {
      enabled: { type: Boolean, default: true },
      rules: [{
        keywords: [{ type: String, required: true }],
        department: { type: String, required: true },
        priority: { type: Number, default: 1 },
        enabled: { type: Boolean, default: true }
      }]
    },
    flowBuilder: {
      enabled: { type: Boolean, default: false },
      steps: [{
        id: { type: String, required: true },
        type: { type: String, required: true, enum: ['message', 'choice', 'ai_handoff', 'agent_queue', 'rating'] },
        content: { type: String, required: true },
        nextStep: { type: String, default: '' },
        options: [{
          text: { type: String, required: true },
          value: { type: String, required: true },
          nextStep: { type: String, default: '' }
        }],
        trigger: { type: String, default: '' }
      }]
    },
    departments: {
      enabled: { type: Boolean, default: true },
      list: [{
        id: { type: String, required: true },
        name: { type: String, required: true },
        description: { type: String, default: '' },
        aiEnabled: { type: Boolean, default: true },
        humanEnabled: { type: Boolean, default: true },
        priority: { type: String, default: 'medium', enum: ['low', 'medium', 'high'] },
        aiModel: { type: String, default: 'gpt-3.5-turbo' },
        businessHours: {
          enabled: { type: Boolean, default: false },
          timezone: { type: String, default: 'EST' },
          outsideHoursMessage: { type: String, default: 'Our team is currently offline.' }
        }
      }]
    },
    csat: {
      enabled: { type: Boolean, default: false },
      trigger: { type: String, default: 'conversation_end' },
      scale: { type: Number, default: 5, min: 1, max: 10 },
      question: { type: String, default: 'How would you rate your experience?' },
      followUpQuestion: { type: String, default: 'Any additional feedback? (Optional)' },
      escalation: {
        enabled: { type: Boolean, default: false },
        threshold: { type: Number, default: 3 },
        message: { type: String, default: 'We\'re sorry about your experience. Let us connect you with a supervisor.' },
        action: { type: String, default: 'human_escalation' },
        department: { type: String, default: 'supervisor' }
      },
      thankYouMessage: { type: String, default: 'Thank you for your feedback!' }
    }
  }
}, {
  timestamps: true
});

// Ensure unique settings per organization (one global settings if organizationId is null)
settingsSchema.index({ organizationId: 1 }, { unique: true });

// Static method to get or create default settings
settingsSchema.statics.getOrCreateDefault = async function(organizationId = null) {
  let settings = await this.findOne({ organizationId });
  
  if (!settings) {
    // Create default settings with initial data
    settings = new this({
      organizationId,
      departments: [
        { name: 'General', description: 'General inquiries and support' },
        { name: 'Technical', description: 'Technical support and troubleshooting' },
        { name: 'Sales', description: 'Sales inquiries and product information' }
      ],
      chatFlow: {
        quickActions: [
          { 
            text: 'Technical Support', 
            response: 'I\'ll connect you with our technical support team.',
            routeToDepartment: 'Technical'
          },
          { 
            text: 'Sales Inquiry', 
            response: 'I\'ll connect you with our sales team.',
            routeToDepartment: 'Sales'  
          },
          { 
            text: 'General Question', 
            response: 'I\'ll help you with your general question.',
            routeToDepartment: 'General'
          }
        ],
        autoResponses: [
          {
            keywords: ['hello', 'hi', 'hey'],
            response: 'Hello! Welcome to our support chat. How can I assist you today?'
          },
          {
            keywords: ['thank', 'thanks'],
            response: 'You\'re welcome! Is there anything else I can help you with?'
          },
          {
            keywords: ['bye', 'goodbye'],
            response: 'Thank you for contacting us. Have a great day!'
          }
        ],
        smartRouting: {
          enabled: true,
          rules: [
            {
              keywords: ['bug', 'error', 'issue', 'problem', 'technical'],
              department: 'Technical'
            },
            {
              keywords: ['buy', 'purchase', 'price', 'cost', 'sales'],
              department: 'Sales'
            }
          ]
        }
      }
    });
    
    await settings.save();
  }
  
  return settings;
};

// Instance method to get chatflow configuration
settingsSchema.methods.getChatFlowConfig = function() {
  return this.chatFlow || {};
};

module.exports = mongoose.model('Settings', settingsSchema);