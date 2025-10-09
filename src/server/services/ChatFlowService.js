const fs = require('fs').promises;
const path = require('path');

class ChatFlowService {
    constructor() {
        this.chatFlowConfig = null;
        this.customerSessions = new Map(); // Store customer flow state
    }

    /**
     * Initialize ChatFlow service by loading configuration
     */
    async initialize() {
        try {
            // Load chatflow configuration from settings
            const settingsPath = path.join(__dirname, '../routes/settings.js');
            const { organizationSettings } = require('../routes/settings');
            this.chatFlowConfig = organizationSettings.chatFlow;
            console.log('✅ ChatFlow service initialized');
        } catch (error) {
            console.error('❌ Error initializing ChatFlow service:', error);
            // Set default configuration if loading fails
            this.setDefaultConfig();
        }
    }

    /**
     * Set default chatflow configuration
     */
    setDefaultConfig() {
        this.chatFlowConfig = {
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
                { trigger: 'hours,open,closed', matchType: 'contains', response: 'We\'re available 24/7 to assist you!' }
            ],
            enableSmartRouting: true,
            routingRules: [
                { keywords: 'technical,bug,error,broken', department: 'Technical', message: 'Routing you to our technical support team...' },
                { keywords: 'billing,payment,invoice,cost', department: 'Sales', message: 'Connecting you with our billing department...' }
            ],
            responseDelay: 1,
            typingDuration: 3,
            fallbackMessage: 'I\'m sorry, I didn\'t understand that. Could you please rephrase your question?'
        };
    }

    /**
     * Get chatflow configuration for public API
     */
    getPublicConfig() {
        if (!this.chatFlowConfig) {
            this.setDefaultConfig();
        }

        return {
            welcomeMessage: this.chatFlowConfig.welcomeFlow,
            showQuickActions: this.chatFlowConfig.showQuickActions,
            quickActions: this.chatFlowConfig.quickActions || [],
            responseDelay: this.chatFlowConfig.responseDelay || 1,
            typingDuration: this.chatFlowConfig.typingDuration || 3
        };
    }

    /**
     * Initialize a new customer session
     */
    initializeCustomerSession(customerId) {
        const session = {
            customerId,
            currentStep: 'welcome',
            conversationHistory: [],
            selectedDepartment: null,
            isAiMode: false,
            createdAt: new Date()
        };

        this.customerSessions.set(customerId, session);
        return session;
    }

    /**
     * Process customer message and determine response
     */
    async processMessage(customerId, message) {
        if (!this.chatFlowConfig) {
            this.setDefaultConfig();
        }

        let session = this.customerSessions.get(customerId);
        if (!session) {
            session = this.initializeCustomerSession(customerId);
        }

        // Add message to conversation history
        session.conversationHistory.push({
            type: 'customer',
            message: message.toLowerCase(),
            timestamp: new Date()
        });

        let response = null;
        let shouldRoute = false;
        let routedDepartment = null;

        // Check for auto-responses first
        if (this.chatFlowConfig.enableAutoResponses) {
            response = this.checkAutoResponses(message);
        }

        // Check for smart routing
        if (this.chatFlowConfig.enableSmartRouting && !response) {
            const routingResult = this.checkSmartRouting(message);
            if (routingResult) {
                shouldRoute = true;
                routedDepartment = routingResult.department;
                response = {
                    text: routingResult.message,
                    type: 'routing',
                    department: routingResult.department
                };
            }
        }

        // Use fallback message if no auto-response or routing match
        if (!response) {
            response = {
                text: this.chatFlowConfig.fallbackMessage,
                type: 'fallback'
            };
        }

        // Update session
        session.conversationHistory.push({
            type: 'system',
            message: response.text,
            timestamp: new Date()
        });

        if (shouldRoute) {
            session.selectedDepartment = routedDepartment;
        }

        this.customerSessions.set(customerId, session);

        return {
            response: response,
            shouldRoute: shouldRoute,
            department: routedDepartment,
            session: session
        };
    }

    /**
     * Check if message matches auto-response rules
     */
    checkAutoResponses(message) {
        if (!this.chatFlowConfig.autoResponses) return null;

        const messageLower = message.toLowerCase();

        for (const rule of this.chatFlowConfig.autoResponses) {
            const triggers = rule.trigger.toLowerCase().split(',');

            for (const trigger of triggers) {
                const trimmedTrigger = trigger.trim();
                let matches = false;

                switch (rule.matchType) {
                    case 'exact':
                        matches = messageLower === trimmedTrigger;
                        break;
                    case 'starts':
                        matches = messageLower.startsWith(trimmedTrigger);
                        break;
                    case 'contains':
                    default:
                        matches = messageLower.includes(trimmedTrigger);
                        break;
                }

                if (matches) {
                    return {
                        text: rule.response,
                        type: 'auto-response',
                        matchedRule: rule
                    };
                }
            }
        }

        return null;
    }

    /**
     * Check if message should be routed to specific department
     */
    checkSmartRouting(message) {
        if (!this.chatFlowConfig.routingRules) return null;

        const messageLower = message.toLowerCase();

        for (const rule of this.chatFlowConfig.routingRules) {
            const keywords = rule.keywords.toLowerCase().split(',');

            for (const keyword of keywords) {
                const trimmedKeyword = keyword.trim();
                if (messageLower.includes(trimmedKeyword)) {
                    return {
                        department: rule.department,
                        message: rule.message || `I'll connect you with our ${rule.department} department.`
                    };
                }
            }
        }

        return null;
    }

    /**
     * Get customer session
     */
    getCustomerSession(customerId) {
        return this.customerSessions.get(customerId);
    }

    /**
     * Clear customer session
     */
    clearCustomerSession(customerId) {
        this.customerSessions.delete(customerId);
    }

    /**
     * Update chatflow configuration
     */
    updateConfig(newConfig) {
        this.chatFlowConfig = { ...this.chatFlowConfig, ...newConfig };
    }

    /**
     * Get welcome message with quick actions
     */
    getWelcomeFlow() {
        if (!this.chatFlowConfig) {
            this.setDefaultConfig();
        }

        const welcome = {
            message: this.chatFlowConfig.welcomeFlow,
            showQuickActions: this.chatFlowConfig.showQuickActions,
            quickActions: this.chatFlowConfig.quickActions || []
        };

        return welcome;
    }
}

module.exports = new ChatFlowService();