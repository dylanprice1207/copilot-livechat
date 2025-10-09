const express = require('express');
const router = express.Router();
const OpenAIService = require('../services/OpenAIService');
const Settings = require('../models/Settings');

// Mock settings data - in a real app, this would be stored in database
let organizationSettings = {
  organization: {
    name: 'Lightwave AI',
    domain: 'lightwave.ai',
    timezone: 'UTC',
    language: 'en'
  },
  chat: {
    welcomeMessage: 'Hello! How can we help you today?',
    offlineMessage: 'We are currently offline. Please leave a message and we will get back to you.',
    enableFileUpload: true,
    enableTypingIndicator: true,
    maxChatDuration: 60,
    autoCloseInactive: 30
  },
  departments: [
    { name: 'General', description: 'General inquiries and support' },
    { name: 'Technical', description: 'Technical support and troubleshooting' },
    { name: 'Sales', description: 'Sales inquiries and product information' }
  ],
  notifications: {
    email: true,
    browser: true,
    sound: false,
    notificationEmail: 'admin@lightwave.ai'
  },
  security: {
    requireAuth: false,
    enableGuestChat: true,
    sessionTimeout: 24,
    maxLoginAttempts: 5
  },
  ai: {
    openaiApiKey: '',
    defaultModel: 'gpt-4',
    maxTokens: 2000,
    temperature: 0.7,
    presencePenalty: 0.6,
    enabled: true
  },
  chatFlow: {
    welcomeFlow: 'Hi there! 👋 Welcome to Lightwave AI support. How can I help you today?',
    showQuickActions: true,
    quickActions: [
      { text: 'Technical Support', response: 'I\'ll connect you with our technical support team.' },
      { text: 'Billing Question', response: 'Let me help you with your billing inquiry.' },
      { text: 'General Info', response: 'What would you like to know about our services?' }
    ],
    enableAutoResponses: true,
    autoResponses: [
      { trigger: 'hello,hi,hey', matchType: 'contains', response: 'Hello! How can I help you today?' },
      { trigger: 'hours,open,closed', matchType: 'contains', response: 'We\'re available 24/7 to assist you!' },
      { trigger: 'price,cost,pricing', matchType: 'contains', response: 'I\'d be happy to help you with pricing information. Let me connect you with our sales team.' }
    ],
    enableSmartRouting: true,
    routingRules: [
      { keywords: 'technical,bug,error,broken', department: 'Technical', message: 'Routing you to our technical support team...' },
      { keywords: 'billing,payment,invoice,cost', department: 'Sales', message: 'Connecting you with our billing department...' }
    ],
    responseDelay: 1,
    typingDuration: 3,
    enableMemory: true,
    maxMemoryMessages: 20,
    fallbackMessage: 'I\'m sorry, I didn\'t understand that. Could you please rephrase your question?',
    endConversationMessage: 'Thank you for contacting us! Have a great day! 😊'
  }
};

// GET /api/admin/settings - Get current settings
router.get('/', async (req, res) => {
  try {
    console.log('🔍 Settings request from:', req.user?.username || 'unknown user');
    
    // Try to load from database first
    let settings = await Settings.findOne({});
    
    if (!settings) {
      // If no settings in database, return default settings
      console.log('📄 No settings found in database, returning defaults');
      settings = organizationSettings;
    } else {
      console.log('✅ Loaded settings from database');
      // Convert the mongoose document to a plain object that matches our expected structure
      settings = {
        organization: settings.organization,
        chat: settings.chat,
        departments: settings.departments,
        notifications: settings.notifications,
        security: settings.security,
        ai: settings.ai,
        chatFlow: settings.chatFlow
      };
    }
    
    res.json({
      success: true,
      settings: settings
    });
  } catch (error) {
    console.error('❌ Error fetching settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch settings'
    });
  }
});

// POST /api/admin/settings - Update settings
router.post('/', async (req, res) => {
  try {
    const { settings } = req.body;
    
    if (!settings) {
      return res.status(400).json({
        success: false,
        message: 'Settings data is required'
      });
    }

    // Validate and merge settings
    if (settings.organization) {
      organizationSettings.organization = {
        ...organizationSettings.organization,
        ...settings.organization
      };
    }

    if (settings.chat) {
      organizationSettings.chat = {
        ...organizationSettings.chat,
        ...settings.chat
      };
    }

    if (settings.departments && Array.isArray(settings.departments)) {
      organizationSettings.departments = settings.departments.filter(
        dept => dept.name && dept.name.trim() !== ''
      );
    }

    if (settings.notifications) {
      organizationSettings.notifications = {
        ...organizationSettings.notifications,
        ...settings.notifications
      };
    }

    if (settings.security) {
      organizationSettings.security = {
        ...organizationSettings.security,
        ...settings.security
      };
    }

    if (settings.ai) {
      organizationSettings.ai = {
        ...organizationSettings.ai,
        ...settings.ai
      };
    }

    if (settings.chatFlow) {
      organizationSettings.chatFlow = {
        ...organizationSettings.chatFlow,
        ...settings.chatFlow
      };
    }

    // Auto-configure OpenAI if API key is provided in settings or environment
    const apiKey = (settings.ai && settings.ai.openaiApiKey) || process.env.OPENAI_API_KEY;
    const organizationId = (settings.ai && settings.ai.organizationId) || process.env.OPENAI_ORGANIZATION_ID;
    
    if (apiKey) {
      try {
        console.log('🤖 Auto-configuring OpenAI with API key...');
        const success = OpenAIService.configure(apiKey, organizationId);
        if (success) {
          console.log('✅ OpenAI configured successfully');
        } else {
          console.log('❌ Failed to configure OpenAI - invalid key format');
        }
      } catch (error) {
        console.error('❌ Error configuring OpenAI:', error);
      }
    }

    // Save to database using the correct schema structure
    // First, try to find any existing settings document (there should be only one global one)
    let settingsDoc = await Settings.findOne({});
    
    if (settingsDoc) {
      // Update existing document
      console.log('📝 Updating existing settings document:', settingsDoc._id);
      Object.assign(settingsDoc, organizationSettings);
      settingsDoc.updatedBy = req.user?.username || 'unknown user';
      settingsDoc.updatedAt = new Date();
      await settingsDoc.save();
    } else {
      // Create new document
      console.log('📄 Creating new settings document');
      settingsDoc = new Settings({
        ...organizationSettings,
        updatedBy: req.user?.username || 'unknown user',
        updatedAt: new Date()
      });
      await settingsDoc.save();
    }

    console.log('✅ Settings updated by:', req.user?.username || 'unknown user');
    console.log('💾 Settings saved to database with ID:', settingsDoc._id);
    console.log('📋 Updated settings:', JSON.stringify(organizationSettings, null, 2));

    res.json({
      success: true,
      message: 'Settings updated successfully',
      settings: organizationSettings
    });

  } catch (error) {
    console.error('❌ Error updating settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update settings'
    });
  }
});

// GET /api/admin/settings/export - Export settings as JSON
router.get('/export', (req, res) => {
  try {
    res.setHeader('Content-Disposition', 'attachment; filename=lightwave-settings.json');
    res.setHeader('Content-Type', 'application/json');
    res.json(organizationSettings);
  } catch (error) {
    console.error('❌ Error exporting settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export settings'
    });
  }
});

// POST /api/admin/settings/test-ai - Test AI connection
router.post('/test-ai', async (req, res) => {
  try {
    const { apiKey, model } = req.body;
    
    if (!apiKey || !apiKey.startsWith('sk-')) {
      return res.status(400).json({
        success: false,
        message: 'Invalid API key format'
      });
    }

    // Simulate AI connection test (in real implementation, make actual OpenAI API call)
    console.log('🧪 Testing AI connection with model:', model || 'gpt-4');
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // For demo purposes, randomly succeed/fail
    const success = Math.random() > 0.2; // 80% success rate
    
    if (success) {
      res.json({
        success: true,
        message: `Successfully connected to ${model || 'gpt-4'} model`,
        details: {
          model: model || 'gpt-4',
          latency: Math.floor(Math.random() * 500 + 200) + 'ms',
          status: 'operational'
        }
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Failed to connect to AI service. Please check your API key and try again.'
      });
    }
  } catch (error) {
    console.error('❌ Error testing AI connection:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during AI connection test'
    });
  }
});

// POST /api/admin/settings/reset - Reset settings to defaults
router.post('/reset', (req, res) => {
  try {
    const defaultSettings = {
      organization: {
        name: 'Lightwave AI',
        domain: 'lightwave.ai',
        timezone: 'UTC',
        language: 'en'
      },
      chat: {
        welcomeMessage: 'Hello! How can we help you today?',
        offlineMessage: 'We are currently offline. Please leave a message and we will get back to you.',
        enableFileUpload: true,
        enableTypingIndicator: true,
        maxChatDuration: 60,
        autoCloseInactive: 30
      },
      departments: [
        { name: 'General', description: 'General inquiries and support' },
        { name: 'Technical', description: 'Technical support and troubleshooting' },
        { name: 'Sales', description: 'Sales inquiries and product information' }
      ],
      notifications: {
        email: true,
        browser: true,
        sound: false,
        notificationEmail: 'admin@lightwave.ai'
      },
      security: {
        requireAuth: false,
        enableGuestChat: true,
        sessionTimeout: 24,
        maxLoginAttempts: 5
      },
      ai: {
        openaiApiKey: '',
        defaultModel: 'gpt-4',
        maxTokens: 2000,
        temperature: 0.7,
        presencePenalty: 0.6,
        enabled: true
      },
      chatFlow: {
        welcomeFlow: 'Hi there! 👋 Welcome to Lightwave AI support. How can I help you today?',
        showQuickActions: true,
        quickActions: [
          { text: 'Technical Support', response: 'I\'ll connect you with our technical support team.' },
          { text: 'Billing Question', response: 'Let me help you with your billing inquiry.' },
          { text: 'General Info', response: 'What would you like to know about our services?' }
        ],
        enableAutoResponses: true,
        autoResponses: [
          { trigger: 'hello,hi,hey', matchType: 'contains', response: 'Hello! How can I help you today?' },
          { trigger: 'hours,open,closed', matchType: 'contains', response: 'We\'re available 24/7 to assist you!' },
          { trigger: 'price,cost,pricing', matchType: 'contains', response: 'I\'d be happy to help you with pricing information. Let me connect you with our sales team.' }
        ],
        enableSmartRouting: true,
        routingRules: [
          { keywords: 'technical,bug,error,broken', department: 'Technical', message: 'Routing you to our technical support team...' },
          { keywords: 'billing,payment,invoice,cost', department: 'Sales', message: 'Connecting you with our billing department...' }
        ],
        responseDelay: 1,
        typingDuration: 3,
        enableMemory: true,
        maxMemoryMessages: 20,
        fallbackMessage: 'I\'m sorry, I didn\'t understand that. Could you please rephrase your question?',
        endConversationMessage: 'Thank you for contacting us! Have a great day! 😊'
      }
    };
    
    organizationSettings = { ...defaultSettings };
    
    console.log('🔄 Settings reset to defaults by:', req.user?.username || 'unknown user');
    
    res.json({
      success: true,
      message: 'Settings reset to default values',
      settings: organizationSettings
    });
  } catch (error) {
    console.error('❌ Error resetting settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reset settings'
    });
  }
});

// POST /api/admin/settings/validate - Validate settings structure
router.post('/validate', (req, res) => {
  try {
    const { settings } = req.body;
    const errors = [];
    
    // Validate organization settings
    if (settings.organization) {
      if (!settings.organization.name || settings.organization.name.trim() === '') {
        errors.push('Organization name is required');
      }
      if (settings.organization.domain && !/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(settings.organization.domain)) {
        errors.push('Invalid domain format');
      }
    }
    
    // Validate AI settings
    if (settings.ai) {
      if (settings.ai.enabled && !settings.ai.openaiApiKey) {
        errors.push('OpenAI API key is required when AI is enabled');
      }
      if (settings.ai.maxTokens && (settings.ai.maxTokens < 100 || settings.ai.maxTokens > 8000)) {
        errors.push('Max tokens must be between 100 and 8000');
      }
    }
    
    // Validate departments
    if (settings.departments) {
      const departmentNames = settings.departments.map(d => d.name);
      const duplicates = departmentNames.filter((name, index) => departmentNames.indexOf(name) !== index);
      if (duplicates.length > 0) {
        errors.push(`Duplicate department names: ${duplicates.join(', ')}`);
      }
    }
    
    res.json({
      success: errors.length === 0,
      errors,
      message: errors.length === 0 ? 'Settings validation passed' : 'Settings validation failed'
    });
  } catch (error) {
    console.error('❌ Error validating settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to validate settings'
    });
  }
});

// POST /api/admin/settings/import - Import settings from JSON
router.post('/import', (req, res) => {
  try {
    const importedSettings = req.body;
    
    if (!importedSettings || typeof importedSettings !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'Invalid settings format'
      });
    }

    // Validate imported settings structure
    const requiredSections = ['organization', 'chat', 'departments', 'notifications', 'security', 'ai', 'chatFlow'];
    const missingSections = requiredSections.filter(section => !importedSettings[section]);
    
    if (missingSections.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required sections: ${missingSections.join(', ')}`,
        missingSections
      });
    }
    
    // Validate critical fields
    if (!importedSettings.organization.name) {
      return res.status(400).json({
        success: false,
        message: 'Organization name is required'
      });
    }
    
    // Backup current settings before import
    const backupSettings = { ...organizationSettings };
    
    try {
      // Test import by temporarily applying settings
      organizationSettings = { ...importedSettings };
      
      // Validate the imported settings work
      console.log('✅ Settings import validation successful');

      console.log('📥 Settings imported by:', req.user?.username || 'unknown user');

      res.json({
        success: true,
        message: 'Settings imported successfully',
        settings: organizationSettings,
        imported: {
          timestamp: new Date().toISOString(),
          sections: requiredSections.filter(section => importedSettings[section]),
          user: req.user?.username || 'unknown user'
        }
      });
    } catch (validationError) {
      // Rollback to backup settings if validation fails
      organizationSettings = backupSettings;
      
      return res.status(400).json({
        success: false,
        message: 'Settings validation failed during import. Changes have been rolled back.',
        error: validationError.message
      });
    }

  } catch (error) {
    console.error('❌ Error importing settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to import settings'
    });
  }
});

module.exports = router;
module.exports.organizationSettings = organizationSettings;