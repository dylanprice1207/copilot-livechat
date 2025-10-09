const OpenAI = require('openai');
const KnowledgeBaseService = require('./KnowledgeBaseService');

class OpenAIService {
    constructor() {
        this.openai = null;
        this.apiKey = null;
        this.organizationId = null;
        this.isConfigured = false;
    }

    /**
     * Configure OpenAI with API key and organization
     * @param {string} apiKey - OpenAI API key
     * @param {string} organizationId - Optional organization ID
     */
    configure(apiKey, organizationId = null) {
        try {
            if (!apiKey || !apiKey.startsWith('sk-')) {
                throw new Error('Invalid OpenAI API key format');
            }

            const config = {
                apiKey: apiKey
            };

            if (organizationId) {
                config.organization = organizationId;
            }

            this.openai = new OpenAI(config);
            this.apiKey = apiKey;
            this.organizationId = organizationId;
            this.isConfigured = true;
            
            console.log('✅ OpenAI configured successfully');
            console.log(`🔑 API Key: ${apiKey.substring(0, 7)}...${apiKey.slice(-4)}`);
            console.log(`🏢 Organization: ${organizationId || 'Default'}`);
            
            return true;
        } catch (error) {
            console.error('❌ Failed to configure OpenAI:', error.message);
            this.isConfigured = false;
            return false;
        }
    }

    /**
     * Check if OpenAI is properly configured
     */
    isReady() {
        return this.isConfigured && this.openai !== null;
    }

    /**
     * Get AI response for a message
     * @param {string} message - User message
     * @param {string} department - Department context (sales, technical, etc.)
     * @param {Array} conversationHistory - Previous messages for context
     * @param {Object} options - Additional options
     */
    async getChatResponse(message, department = 'general', conversationHistory = [], options = {}) {
        console.log('🔵 OpenAI getChatResponse called:');
        console.log('  📝 Message:', message);
        console.log('  🏢 Department:', department);
        console.log('  📚 History length:', conversationHistory.length);
        console.log('  ⚙️ Options:', JSON.stringify(options));
        
        if (!this.isReady()) {
            console.log('❌ OpenAI not ready!');
            console.log('  🔧 Configured:', this.isConfigured);
            console.log('  🔑 Has API Key:', !!this.apiKey);
            console.log('  🤖 Has OpenAI instance:', !!this.openai);
            throw new Error('OpenAI not configured. Please set API key first.');
        }

        try {
            // Get knowledge base context for the message
            const knowledgeContext = KnowledgeBaseService.getContextForMessage(message, department);
            console.log('📚 Knowledge context length:', knowledgeContext.length);
            
            // Build system prompt based on department with knowledge base context
            const baseSystemPrompt = this.buildSystemPrompt(department);
            const systemPrompt = baseSystemPrompt + knowledgeContext;
            console.log('🎯 System prompt length:', systemPrompt.length);
            
            // Prepare messages for OpenAI
            const messages = [
                { role: 'system', content: systemPrompt },
                ...conversationHistory.slice(-10), // Keep last 10 messages for context
                { role: 'user', content: message }
            ];
            
            console.log('📨 Sending to OpenAI:');
            console.log('  📋 Messages count:', messages.length);
            console.log('  🎛️ Model:', options.model || 'gpt-3.5-turbo');
            console.log('  🎚️ Max tokens:', options.maxTokens || 500);
            
            const requestPayload = {
                model: options.model || 'gpt-3.5-turbo',
                messages: messages,
                max_tokens: options.maxTokens || 500,
                temperature: options.temperature || 0.7,
                presence_penalty: options.presencePenalty || 0.1,
                frequency_penalty: options.frequencyPenalty || 0.1
            };
            
            console.log('🚀 Making OpenAI API call...');
            const startTime = Date.now();
            
            const response = await this.openai.chat.completions.create(requestPayload);
            
            const endTime = Date.now();
            console.log(`⏱️ OpenAI API response time: ${endTime - startTime}ms`);
            
            const aiMessage = response.choices[0].message.content.trim();
            
            console.log('✅ OpenAI Response received:');
            console.log('  📝 Full response:', aiMessage);
            console.log('  📊 Usage:', JSON.stringify(response.usage));
            console.log('  🎯 Department:', department);
            
            return {
                message: aiMessage,
                usage: response.usage,
                department: department,
                timestamp: new Date()
            };
        } catch (error) {
            console.error('❌ OpenAI API Error Details:');
            console.error('  🔥 Error message:', error.message);
            console.error('  📋 Error code:', error.code);
            console.error('  🎯 Error type:', error.type);
            console.error('  📚 Full error:', error);
            throw new Error(`AI service error: ${error.message}`);
        }
    }

    /**
     * Build system prompt based on department
     * @param {string} department 
     */
    buildSystemPrompt(department) {
        const basePrompt = "You are a helpful AI assistant for Lightwave company. ";
        
        const departmentPrompts = {
            general: basePrompt + "You help with general inquiries and route customers to appropriate departments. If someone asks about technical issues, suggest they speak with technical support. If they ask about purchases or pricing, suggest they speak with sales.",
            
            sales: basePrompt + "You are a sales specialist. Help customers with product information, pricing, quotes, and purchasing decisions. Be friendly, informative, and focus on understanding their needs to recommend appropriate solutions.",
            
            technical: basePrompt + "You are a technical support specialist. Help customers troubleshoot issues, provide technical guidance, and solve problems with their products or services. Be precise, ask clarifying questions, and provide step-by-step solutions.",
            
            support: basePrompt + "You are a customer support representative. Help with account issues, billing questions, service problems, and general customer care. Be empathetic and solution-focused.",
            
            billing: basePrompt + "You are a billing specialist. Help customers with payment issues, invoice questions, subscription management, and financial inquiries. Be clear about policies and procedures."
        };

        return departmentPrompts[department] || departmentPrompts.general;
    }

    /**
     * Analyze message intent and suggest department routing
     * @param {string} message 
     */
    async analyzeIntent(message) {
        if (!this.isReady()) {
            return { department: 'general', confidence: 0.5 };
        }

        try {
            const prompt = `Analyze this customer message and determine which department should handle it. 
            
Available departments:
- general: General inquiries, routing
- sales: Product info, pricing, purchases
- technical: Technical issues, troubleshooting
- support: Account, service issues
- billing: Payment, invoice, subscription issues

Message: "${message}"

Respond with only a JSON object in this format:
{"department": "department_name", "confidence": 0.95, "reasoning": "brief explanation"}`;

            const response = await this.openai.chat.completions.create({
                model: 'gpt-3.5-turbo',
                messages: [{ role: 'user', content: prompt }],
                max_tokens: 100,
                temperature: 0.3
            });

            const result = JSON.parse(response.choices[0].message.content.trim());
            console.log(`🎯 Intent Analysis:`, result);
            return result;
        } catch (error) {
            console.error('❌ Intent analysis error:', error.message);
            return { department: 'general', confidence: 0.5, reasoning: 'Analysis failed' };
        }
    }

    /**
     * Get current configuration status
     */
    getStatus() {
        return {
            configured: this.isConfigured,
            hasApiKey: !!this.apiKey,
            organization: this.organizationId,
            apiKeyPreview: this.apiKey ? `${this.apiKey.substring(0, 7)}...${this.apiKey.slice(-4)}` : null
        };
    }

    /**
     * Clear configuration
     */
    clearConfiguration() {
        this.openai = null;
        this.apiKey = null;
        this.organizationId = null;
        this.isConfigured = false;
        console.log('🗑️ OpenAI configuration cleared');
    }
}

// Export singleton instance
module.exports = new OpenAIService();