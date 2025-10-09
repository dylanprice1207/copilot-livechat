const OpenAIService = require('./OpenAIService');
const DepartmentRouter = require('./DepartmentRouter');
const KnowledgeBaseService = require('./KnowledgeBaseService');

class AIBotService {
    constructor() {
        this.conversationHistory = new Map(); // Store conversation history per chat room
        this.botPersonalities = new Map();
        this.setupBotPersonalities();
        this.flowStates = new Map(); // Track conversation flow states
        
        // Load saved configurations after initial setup
        this.loadBotConfigurationsFromDisk().catch(err => {
            console.log('Using default bot configurations');
        });
    }

    /**
     * Setup bot personalities for different departments
     */
    setupBotPersonalities() {
        // Main General Router - Entry point for all customers
        this.botPersonalities.set('general', {
            name: 'Alex',
            role: 'Lightwave Assistant',
            greeting: "Hi! I'm Alex, your Lightwave assistant. Welcome to our support system! I can help you with any questions or connect you with the right specialist. What can I help you with today?",
            style: 'friendly, professional, and routing-focused',
            capabilities: ['routing', 'general_info', 'department_transfer', 'initial_triage'],
            isMainRouter: true
        });

        // Specialized Department Agents - Customers get transferred here from general
        this.botPersonalities.set('sales', {
            name: 'Sarah',
            role: 'Sales Specialist',
            greeting: "Hello! I'm Sarah from our Sales team. I've been brought in to help you with your inquiry. I'd love to help you find the perfect solution for your needs!",
            style: 'enthusiastic, solution-focused, and consultative',
            capabilities: ['product_info', 'pricing', 'demos', 'quotes', 'sales_process'],
            specialization: 'sales',
            transferredFrom: 'general'
        });

        this.botPersonalities.set('technical', {
            name: 'Mike',
            role: 'Technical Specialist',
            greeting: "Hi, I'm Mike from our Technical team. I understand you have a technical question or issue. Let me help you get this resolved quickly and efficiently.",
            style: 'analytical, precise, and solution-oriented',
            capabilities: ['troubleshooting', 'technical_guidance', 'bug_reports', 'system_help'],
            specialization: 'technical',
            transferredFrom: 'general'
        });

        this.botPersonalities.set('support', {
            name: 'Emma',
            role: 'Customer Support Specialist',
            greeting: "Hello! I'm Emma from Customer Support. I've been assigned to help you with your inquiry. I'm here to ensure you have the best possible experience with Lightwave.",
            style: 'empathetic, patient, and customer-focused',
            capabilities: ['account_help', 'service_issues', 'general_support', 'customer_care'],
            specialization: 'support',
            transferredFrom: 'general'
        });

        this.botPersonalities.set('billing', {
            name: 'David',
            role: 'Billing Specialist',
            greeting: "Hi, I'm David from our Billing department. I've been brought in to help with your billing or payment question. I'll make sure we get this sorted out for you.",
            style: 'clear, professional, and detail-oriented',
            capabilities: ['billing_help', 'payment_issues', 'subscriptions', 'invoicing'],
            specialization: 'billing',
            transferredFrom: 'general'
        });
    }

    /**
     * Initialize AI bot for a chat room - Always starts in general chat (centralized hub)
     */
    async initializeBotForChat(roomId, department = 'general', customerName = 'there') {
        if (!OpenAIService.isReady()) {
            throw new Error('AI service not configured. Please configure OpenAI API key.');
        }

        // CENTRALIZED HUB: All customers always start in general chat
        const startingDepartment = 'general';

        // Initialize conversation history
        this.conversationHistory.set(roomId, []);
        
        // Set flow state - everyone starts at the central hub
        this.flowStates.set(roomId, {
            department: startingDepartment,
            step: 'greeting',
            awaitingDepartmentSelection: false,
            customerName: customerName,
            centralizedFlow: true, // Flag to indicate hub-and-spoke model
            requestedDepartment: department !== 'general' ? department : null // Track if they wanted specific dept
        });

        // Get general bot personality (main router)
        const bot = this.botPersonalities.get(startingDepartment);
        
        // Send greeting from the main router
        let greeting = bot.greeting.replace(/Hi!|Hello!/, `Hi ${customerName}!`);
        
        // If they requested a specific department, acknowledge it in greeting
        if (department !== 'general') {
            const requestedBot = this.botPersonalities.get(department);
            if (requestedBot) {
                greeting += ` I see you're looking for ${requestedBot.role} help. I'll help you get connected with the right specialist.`;
            }
        }
        
        console.log(`🤖 AI Bot ${bot.name} (Central Hub) initialized for room ${roomId} - Customer started in general chat`);
        
        return {
            botName: bot.name,
            botRole: bot.role,
            greeting: greeting,
            department: startingDepartment,
            centralHub: true,
            isMainRouter: true
        };
    }

    /**
     * Process customer message with centralized hub routing
     */
    async processMessage(roomId, message, customerName = 'Customer') {
        try {
            if (!OpenAIService.isReady()) {
                return {
                    response: "I'm sorry, but the AI service is not available right now. Let me connect you with a human agent.",
                    needsHumanAgent: true,
                    department: 'general'
                };
            }

            const flowState = this.flowStates.get(roomId) || { 
                department: 'general', 
                step: 'conversation',
                centralizedFlow: true 
            };
            const history = this.conversationHistory.get(roomId) || [];

            // Add customer message to history
            history.push({ role: 'user', content: message });

            // CENTRALIZED HUB LOGIC: Route through general chat first
            let response;
            let newDepartment = flowState.department;
            let needsHumanAgent = false;
            let departmentOptions = null;
            let transferring = false;

            // If customer explicitly wants human agent
            if (this.isRequestingHumanAgent(message)) {
                response = await this.handleHumanAgentRequest(roomId, flowState.department);
                needsHumanAgent = true;
            } 
            // If customer is in general chat (hub), analyze for routing to specialists
            else if (flowState.department === 'general') {
                const routingAnalysis = DepartmentRouter.routeMessage(message, 'general');
                
                // High confidence routing - transfer to specialist
                if (routingAnalysis.confidence > 0.7 && routingAnalysis.department !== 'general') {
                    response = await this.handleCentralizedRouting(roomId, routingAnalysis, customerName);
                    newDepartment = routingAnalysis.department;
                    transferring = true;
                } 
                // Medium confidence - offer department options
                else if (routingAnalysis.confidence > 0.4 && routingAnalysis.suggestions) {
                    response = await this.handleRegularConversation(roomId, message, flowState);
                    departmentOptions = routingAnalysis.suggestions;
                    this.flowStates.set(roomId, { 
                        ...flowState, 
                        awaitingDepartmentSelection: true 
                    });
                } 
                // Low confidence - general conversation with routing hints
                else {
                    response = await this.handleHubConversation(roomId, message, flowState, routingAnalysis);
                }
            }
            // If customer is in specialist department, handle specialized conversation
            else {
                // Check if they want to go back to general or switch departments
                const backToGeneral = this.isRequestingGeneralHelp(message);
                const routingAnalysis = DepartmentRouter.routeMessage(message, flowState.department);
                
                if (backToGeneral) {
                    response = await this.handleBackToHub(roomId, customerName);
                    newDepartment = 'general';
                    transferring = true;
                } else if (routingAnalysis.confidence > 0.8 && routingAnalysis.department !== flowState.department) {
                    // High confidence transfer to different specialist
                    response = await this.handleSpecialistTransfer(roomId, routingAnalysis, customerName);
                    newDepartment = routingAnalysis.department;
                    transferring = true;
                } else {
                    // Continue specialized conversation
                    response = await this.handleSpecializedConversation(roomId, message, flowState);
                }
            }

            // Handle department selection if customer is choosing from options
            if (flowState.awaitingDepartmentSelection && !transferring) {
                const selectionResponse = await this.handleDepartmentSelection(roomId, message, customerName);
                if (selectionResponse.transferred) {
                    response = selectionResponse.message;
                    newDepartment = selectionResponse.department;
                    transferring = true;
                }
            }

            // Add AI response to history
            history.push({ role: 'assistant', content: response });
            
            // Keep history manageable (last 20 messages)
            if (history.length > 20) {
                this.conversationHistory.set(roomId, history.slice(-20));
            }

            // Update flow state for transfers
            if (newDepartment !== flowState.department) {
                this.flowStates.set(roomId, {
                    ...flowState,
                    department: newDepartment,
                    step: transferring ? 'transferred' : flowState.step,
                    awaitingDepartmentSelection: false,
                    lastTransfer: new Date()
                });
            }

            return {
                response,
                department: newDepartment,
                needsHumanAgent,
                departmentOptions,
                botInfo: this.botPersonalities.get(newDepartment),
                centralHub: newDepartment === 'general',
                transferred: transferring,
                specialistActive: newDepartment !== 'general'
            };

        } catch (error) {
            console.error('❌ AI Bot processing error:', error.message);
            return {
                response: "I'm experiencing some technical difficulties. Let me connect you with a human agent who can better assist you.",
                needsHumanAgent: true,
                department: 'general',
                error: error.message
            };
        }
    }

    /**
     * Handle centralized routing from general chat to specialists
     */
    async handleCentralizedRouting(roomId, routingAnalysis, customerName) {
        const newBot = this.botPersonalities.get(routingAnalysis.department);
        
        // Update flow state for transfer
        const currentState = this.flowStates.get(roomId) || {};
        this.flowStates.set(roomId, {
            ...currentState,
            department: routingAnalysis.department,
            step: 'transferred',
            awaitingDepartmentSelection: false,
            transferredFrom: 'general',
            transferReason: routingAnalysis.reason
        });

        console.log(`🔄 Central Hub: Routing customer from general to ${routingAnalysis.department}`);

        return `I can see you need help with ${routingAnalysis.department}-related matters. Let me connect you with our ${newBot.role} who specializes in this area.\n\n${newBot.greeting}`;
    }

    /**
     * Handle hub conversation (general chat with routing awareness)
     */
    async handleHubConversation(roomId, message, flowState, routingAnalysis) {
        const history = this.conversationHistory.get(roomId) || [];
        
        console.log('🎯 AIBotService.handleHubConversation:');
        console.log('  📝 Message:', message);
        console.log('  🏠 Room:', roomId);
        console.log('  📚 History length:', history.length);
        console.log('  🧭 Routing analysis:', routingAnalysis);
        
        // Get AI response with hub context
        const aiResponse = await OpenAIService.getChatResponse(
            message,
            'general',
            history,
            {
                temperature: 0.7,
                maxTokens: 800,
                systemPrompt: `You are Alex, the main Lightwave assistant at the central hub. Your role is to:
1. Help customers with general questions
2. Identify when they need specialist help and offer to connect them
3. Be friendly and professional
4. Always be ready to route to: Sales, Technical, Support, or Billing specialists
${routingAnalysis.hints ? `Current routing hints: ${routingAnalysis.hints.join(', ')}` : ''}`
            }
        );

        return aiResponse.message;
    }

    /**
     * Handle specialized conversation in specific departments
     */
    async handleSpecializedConversation(roomId, message, flowState) {
        const history = this.conversationHistory.get(roomId) || [];
        const bot = this.botPersonalities.get(flowState.department);
        
        console.log('🔧 AIBotService.handleSpecializedConversation:');
        console.log('  📝 Message:', message);
        console.log('  🏢 Department:', flowState.department);
        console.log('  🤖 Bot:', bot?.name || 'Unknown');
        console.log('  📚 History length:', history.length);
        
        const aiResponse = await OpenAIService.getChatResponse(
            message,
            flowState.department,
            history,
            {
                temperature: 0.7,
                maxTokens: 800,
                systemPrompt: `You are ${bot.name}, a ${bot.role} at Lightwave. You were transferred this customer from our general chat.
Your specialization: ${bot.specialization}
Your capabilities: ${bot.capabilities.join(', ')}
Style: ${bot.style}
Always be ready to suggest connecting with other specialists if the question is outside your expertise.`
            }
        );

        return aiResponse.message;
    }

    /**
     * Handle customer wanting to go back to general hub
     */
    async handleBackToHub(roomId, customerName) {
        const generalBot = this.botPersonalities.get('general');
        
        console.log(`🔄 Specialist → Hub: Customer returning to general chat`);
        
        return `I'm transferring you back to our main assistant who can help you with anything else you need.\n\n${generalBot.greeting.replace(/Hi!|Hello!/, `Welcome back ${customerName}!`)} Is there anything else I can help you with today?`;
    }

    /**
     * Handle transfer between specialists
     */
    async handleSpecialistTransfer(roomId, routingAnalysis, customerName) {
        const newBot = this.botPersonalities.get(routingAnalysis.department);
        
        console.log(`🔄 Specialist → Specialist: Transferring to ${routingAnalysis.department}`);
        
        return `I can see this is more of a ${routingAnalysis.department} question. Let me transfer you to our ${newBot.role} who can better assist you.\n\n${newBot.greeting}`;
    }

    /**
     * Check if customer wants general help or to return to hub
     */
    isRequestingGeneralHelp(message) {
        const generalKeywords = [
            'general help', 'main menu', 'go back', 'start over',
            'different question', 'something else', 'other help',
            'general chat', 'main assistant'
        ];
        
        const text = message.toLowerCase();
        return generalKeywords.some(keyword => text.includes(keyword));
    }

    /**
     * Handle human agent request
     */
    async handleHumanAgentRequest(roomId, currentDepartment) {
        const departmentInfo = DepartmentRouter.getDepartment(currentDepartment);
        return `I understand you'd like to speak with a human agent. I'm connecting you with our ${departmentInfo.name} team. Please wait a moment while I find an available agent for you.`;
    }

    /**
     * Handle department selection in centralized hub model
     */
    async handleDepartmentSelection(roomId, message, customerName) {
        const departments = DepartmentRouter.getSuggestedDepartments();
        const selectedDept = this.findDepartmentFromMessage(message, departments);

        if (selectedDept) {
            const bot = this.botPersonalities.get(selectedDept.id);
            
            // Update flow state for transfer from hub
            const currentState = this.flowStates.get(roomId) || {};
            this.flowStates.set(roomId, {
                ...currentState,
                department: selectedDept.id,
                step: 'transferred',
                awaitingDepartmentSelection: false,
                transferredFrom: 'general',
                selectionMade: true
            });

            console.log(`🎯 Hub Selection: Customer chose ${selectedDept.id} department`);

            return {
                transferred: true,
                department: selectedDept.id,
                message: `Perfect! I'm connecting you with our ${selectedDept.name}.\n\n${bot.greeting}`
            };
        } else {
            return {
                transferred: false,
                message: "I'm not sure which department you'd like. Could you please choose from:\n" +
                       departments.map(d => `• ${d.name} - ${d.description}`).join('\n') +
                       "\n\nOr you can say 'human agent' to speak with someone directly."
            };
        }
    }

    /**
     * Handle regular AI conversation
     */
    async handleRegularConversation(roomId, message, flowState) {
        const history = this.conversationHistory.get(roomId) || [];
        
        console.log('💬 AIBotService.handleRegularConversation:');
        console.log('  📝 Message:', message);
        console.log('  🏢 Department:', flowState.department);
        console.log('  📚 History length:', history.length);
        
        const aiResponse = await OpenAIService.getChatResponse(
            message,
            flowState.department,
            history,
            {
                temperature: 0.7,
                maxTokens: 800
            }
        );
        
        console.log('✅ Regular conversation response received:', aiResponse.message.substring(0, 100) + '...');

        return aiResponse.message;
    }

    /**
     * Check if customer is requesting human agent
     */
    isRequestingHumanAgent(message) {
        const humanRequestKeywords = [
            'human agent', 'real person', 'speak to someone', 
            'talk to agent', 'human help', 'live agent',
            'customer service', 'representative'
        ];
        
        const text = message.toLowerCase();
        return humanRequestKeywords.some(keyword => text.includes(keyword));
    }

    /**
     * Find department from customer message
     */
    findDepartmentFromMessage(message, departments) {
        const text = message.toLowerCase();
        
        return departments.find(dept => {
            const nameMatch = text.includes(dept.name.toLowerCase());
            const keywords = dept.id === 'sales' ? ['sales', 'buy', 'purchase'] :
                           dept.id === 'technical' ? ['technical', 'tech', 'support'] :
                           dept.id === 'billing' ? ['billing', 'payment', 'bill'] :
                           [dept.id];
            
            return nameMatch || keywords.some(keyword => text.includes(keyword));
        });
    }

    /**
     * Get conversation history for a room
     */
    getConversationHistory(roomId) {
        return this.conversationHistory.get(roomId) || [];
    }

    /**
     * Clear conversation data for a room
     */
    clearConversationData(roomId) {
        this.conversationHistory.delete(roomId);
        this.flowStates.delete(roomId);
        console.log(`🗑️ Cleared AI conversation data for room ${roomId}`);
    }

    /**
     * Get flow state for debugging
     */
    getFlowState(roomId) {
        return this.flowStates.get(roomId);
    }

    /**
     * Generate department selection options for centralized hub
     */
    generateDepartmentOptions() {
        const departments = DepartmentRouter.getSuggestedDepartments();
        return {
            message: "I'd be happy to connect you with one of our specialists! Please choose from:",
            options: departments.map(dept => ({
                id: dept.id,
                name: dept.name,
                description: dept.description,
                emoji: this.getDepartmentEmoji(dept.id),
                specialist: this.botPersonalities.get(dept.id)?.name || 'Specialist'
            })),
            note: "All our specialists work together as part of the Lightwave team to give you the best support possible."
        };
    }

    /**
     * Get emoji for department
     */
    getDepartmentEmoji(departmentId) {
        const emojis = {
            sales: '💰',
            technical: '🔧',
            support: '🎧',
            billing: '💳',
            general: '💬'
        };
        return emojis[departmentId] || '💬';
    }

    /**
     * Get current bot configurations for admin portal
     */
    getBotConfigurations() {
        const configs = {};
        
        this.botPersonalities.forEach((bot, department) => {
            configs[department] = {
                name: bot.name,
                role: bot.role,
                style: bot.style,
                greeting: bot.greeting,
                capabilities: bot.capabilities,
                specialization: bot.specialization || department
            };
        });
        
        return configs;
    }

    /**
     * Update bot configurations from admin portal
     */
    async updateBotConfigurations(newConfigs) {
        try {
            // Store original configurations for rollback if needed
            const originalConfigs = new Map(this.botPersonalities);
            
            // Update each department's bot configuration
            Object.keys(newConfigs).forEach(department => {
                const newConfig = newConfigs[department];
                const currentBot = this.botPersonalities.get(department);
                
                if (currentBot && newConfig.name && newConfig.role && newConfig.style) {
                    // Update the bot personality with new values
                    this.botPersonalities.set(department, {
                        ...currentBot,
                        name: newConfig.name,
                        role: newConfig.role,
                        style: newConfig.style,
                        greeting: this.generateGreeting(newConfig.name, newConfig.role, department)
                    });
                    
                    console.log(`🤖 Updated ${department} bot: ${newConfig.name} (${newConfig.role})`);
                }
            });
            
            // Save configurations to persistent storage (file or database)
            await this.saveBotConfigurationsToDisk(newConfigs);
            
            console.log('✅ Bot configurations updated successfully');
            return true;
            
        } catch (error) {
            console.error('❌ Error updating bot configurations:', error);
            throw error;
        }
    }

    /**
     * Generate appropriate greeting based on bot name, role, and department
     */
    generateGreeting(name, role, department) {
        const baseGreetings = {
            general: `Hi! I'm ${name}, your ${role}. Welcome to our support system! I can help you with any questions or connect you with the right specialist. What can I help you with today?`,
            sales: `Hello! I'm ${name} from our Sales team. I've been brought in to help you with your inquiry. I'd love to help you find the perfect solution for your needs!`,
            technical: `Hi, I'm ${name} from our Technical team. I understand you have a technical question or issue. Let me help you get this resolved quickly and efficiently.`,
            support: `Hello! I'm ${name} from Customer Support. I've been assigned to help you with your inquiry. I'm here to ensure you have the best possible experience with Lightwave.`,
            billing: `Hi, I'm ${name} from our Billing department. I've been brought in to help with your billing or payment question. I'll make sure we get this sorted out for you.`
        };
        
        return baseGreetings[department] || baseGreetings.general;
    }

    /**
     * Save bot configurations to disk for persistence
     */
    async saveBotConfigurationsToDisk(configs) {
        const fs = require('fs').promises;
        const path = require('path');
        
        try {
            const configDir = path.join(__dirname, '../../../config');
            const configFile = path.join(configDir, 'bot-personalities.json');
            
            // Ensure config directory exists
            try {
                await fs.mkdir(configDir, { recursive: true });
            } catch (err) {
                // Directory might already exist
            }
            
            // Save configurations
            await fs.writeFile(configFile, JSON.stringify(configs, null, 2));
            console.log('💾 Bot configurations saved to disk');
            
        } catch (error) {
            console.error('❌ Error saving bot configurations to disk:', error);
            // Don't throw error - configurations are still in memory
        }
    }

    /**
     * Load bot configurations from disk
     */
    async loadBotConfigurationsFromDisk() {
        const fs = require('fs').promises;
        const path = require('path');
        
        try {
            const configFile = path.join(__dirname, '../../../config/bot-personalities.json');
            const configData = await fs.readFile(configFile, 'utf8');
            const savedConfigs = JSON.parse(configData);
            
            // Apply saved configurations
            await this.updateBotConfigurations(savedConfigs);
            console.log('📂 Bot configurations loaded from disk');
            
        } catch (error) {
            console.log('📝 No saved bot configurations found, using defaults');
            // This is fine - we'll use default configurations
        }
    }

    /**
     * Test bot personalities - return status of each bot
     */
    testBotPersonalities() {
        const testResults = {};
        
        this.botPersonalities.forEach((bot, department) => {
            testResults[department] = {
                botName: bot.name,
                role: bot.role,
                style: bot.style,
                status: 'Active',
                hasGreeting: !!bot.greeting,
                capabilityCount: bot.capabilities ? bot.capabilities.length : 0
            };
        });
        
        return testResults;
    }

    /**
     * Reset bot configurations to defaults
     */
    async resetBotConfigurations() {
        console.log('🔄 Resetting bot configurations to defaults');
        
        // Reinitialize with default personalities
        this.setupBotPersonalities();
        
        // Clear saved configurations
        const fs = require('fs').promises;
        const path = require('path');
        
        try {
            const configFile = path.join(__dirname, '../../../config/bot-personalities.json');
            await fs.unlink(configFile);
            console.log('🗑️ Saved bot configurations cleared');
        } catch (error) {
            // File might not exist, which is fine
        }
        
        return true;
    }

    /**
     * Format message with HTML conversion for better display
     * Converts markdown-style formatting to HTML
     */
    formatMessageHTML(message) {
        if (!message || typeof message !== 'string') {
            return message;
        }

        let formattedMessage = message;

        // Convert **bold** to <strong>bold</strong>
        formattedMessage = formattedMessage.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        
        // Convert *italic* to <em>italic</em>
        formattedMessage = formattedMessage.replace(/\*(.*?)\*/g, '<em>$1</em>');
        
        // Convert numbered lists (1. 2. 3. etc.) to HTML ordered lists
        const numberedListRegex = /(?:^|\n)(\d+\.\s+.*?)(?=(?:\n\d+\.\s+|\n\n|$))/gs;
        formattedMessage = formattedMessage.replace(numberedListRegex, (match, content) => {
            const items = content.trim().split(/\n(?=\d+\.\s+)/);
            const listItems = items.map(item => {
                const cleanItem = item.replace(/^\d+\.\s+/, '').trim();
                return `<li>${cleanItem}</li>`;
            }).join('\n');
            return `<ol>\n${listItems}\n</ol>`;
        });

        // Convert bullet lists (- or • or *) to HTML unordered lists
        const bulletListRegex = /(?:^|\n)((?:[•\-\*]\s+.*?\n?)+)/gm;
        formattedMessage = formattedMessage.replace(bulletListRegex, (match, content) => {
            const items = content.trim().split(/\n(?=[•\-\*]\s+)/);
            const listItems = items.map(item => {
                const cleanItem = item.replace(/^[•\-\*]\s+/, '').trim();
                return `<li>${cleanItem}</li>`;
            }).join('\n');
            return `\n<ul>\n${listItems}\n</ul>\n`;
        });

        // Convert line breaks to <br> tags (but not inside lists)
        formattedMessage = formattedMessage.replace(/\n(?!<\/?(ul|ol|li))/g, '<br>\n');
        
        // Clean up extra line breaks around lists
        formattedMessage = formattedMessage.replace(/(<br>\s*)+(<\/(ul|ol)>)/g, '$2');
        formattedMessage = formattedMessage.replace(/(<(ul|ol)>)\s*(<br>\s*)+/g, '$1\n');
        
        // Convert step numbers in parentheses like (1) to highlighted format
        formattedMessage = formattedMessage.replace(/\((\d+)\)/g, '<span style="background: #667eea; color: white; padding: 2px 6px; border-radius: 50%; font-weight: bold; font-size: 0.85em;">$1</span>');

        return formattedMessage.trim();
    }

    /**
     * Enhanced message processing with HTML formatting
     */
    async processMessageWithFormatting(roomId, message, customerName = 'Customer') {
        try {
            // Get the standard AI response
            const result = await this.processMessage(roomId, message, customerName);
            
            // Format the response with HTML
            if (result.response) {
                result.response = this.formatMessageHTML(result.response);
                result.formatted = true;
            }
            
            return result;

        } catch (error) {
            console.error('❌ Error processing message with formatting:', error);
            return {
                response: "I'm experiencing some technical difficulties. Let me connect you with a human agent who can better assist you.",
                needsHumanAgent: true,
                department: 'general',
                error: error.message
            };
        }
    }
}

module.exports = new AIBotService();