const AIBotService = require('./AIBotService');
const OpenAIService = require('./OpenAIService');
const chatFlowService = require('./ChatFlowService');

/**
 * ChatKit Service with ChatFlow Integration
 * Provides ChatKit-compatible API endpoints with flow-based conversations
 */
class ChatKitService {
    constructor() {
        this.activeSessions = new Map(); // Track active chat sessions
        this.messageHistory = new Map(); // Store message history per session
        this.chatFlow = chatFlowService;
        this.initializeChatFlow();
    }

    async initializeChatFlow() {
        try {
            await this.chatFlow.initialize();
            console.log('✅ ChatKit integrated with ChatFlow service');
        } catch (error) {
            console.error('❌ Failed to initialize ChatFlow in ChatKit:', error);
        }
    }

    /**
     * Create a new ChatKit session
     */
    async createSession(userId, sessionConfig = {}) {
        const sessionId = this.generateSessionId();
        
        const session = {
            id: sessionId,
            userId: userId,
            createdAt: new Date(),
            config: {
                department: sessionConfig.department || 'general',
                customerName: sessionConfig.customerName || 'Customer',
                ...sessionConfig
            },
            status: 'active'
        };

        // Initialize AI bot for this session
        const botInit = await AIBotService.initializeBotForChat(
            sessionId, 
            session.config.department, 
            session.config.customerName
        );

        // Initialize ChatFlow for this session
        const flowState = this.chatFlow.initializeCustomerSession(userId);

        session.botInfo = botInit;
        session.flowState = flowState;
        this.activeSessions.set(sessionId, session);
        this.messageHistory.set(sessionId, []);

        // Add welcome flow message if available
        if (flowState && flowState.welcomeMessage) {
            const welcomeMsg = {
                role: 'assistant',
                content: flowState.welcomeMessage,
                timestamp: new Date(),
                isFlowMessage: true
            };
            this.messageHistory.get(sessionId).push(welcomeMsg);
        }

        console.log(`🤖 ChatKit session with flow created: ${sessionId} for user ${userId}`);
        
        return {
            sessionId,
            botInfo: {
                ...botInit,
                greeting: flowState?.welcomeMessage || botInit.greeting
            },
            config: session.config,
            flowState: flowState
        };
    }

    /**
     * Send message to ChatKit session
     */
    async sendMessage(sessionId, message, messageType = 'user') {
        const session = this.activeSessions.get(sessionId);
        if (!session) {
            throw new Error(`Session ${sessionId} not found`);
        }

        const messageId = this.generateMessageId();
        const timestamp = new Date();

        // Add user message to history
        const userMessage = {
            id: messageId,
            type: messageType,
            content: message,
            timestamp: timestamp,
            sender: messageType === 'user' ? session.config.customerName : 'bot'
        };

        const history = this.messageHistory.get(sessionId) || [];
        history.push(userMessage);

        // Process message through ChatFlow first
        let flowResponse = null;
        try {
            flowResponse = await this.chatFlow.processMessage(session.userId, message);
        } catch (error) {
            console.warn('ChatFlow processing failed, falling back to AI:', error.message);
        }

        let finalResponse;
        let botMessage;

        if (flowResponse && flowResponse.handled) {
            // Use ChatFlow response
            finalResponse = flowResponse;
            botMessage = {
                id: this.generateMessageId(),
                type: 'assistant',
                content: flowResponse.response,
                timestamp: new Date(),
                sender: 'Flow Assistant',
                isFlowMessage: true,
                metadata: {
                    flowType: flowResponse.type,
                    quickActions: flowResponse.quickActions,
                    routing: flowResponse.routing
                }
            };
        } else {
            // Fall back to AI bot service with HTML formatting
            const aiResponse = await AIBotService.processMessageWithFormatting(
                sessionId, 
                message, 
                session.config.customerName
            );

            finalResponse = aiResponse;
            botMessage = {
                id: this.generateMessageId(),
                type: 'assistant',
                content: aiResponse.response,
                timestamp: new Date(),
                sender: aiResponse.botInfo?.name || 'AI Assistant',
                metadata: {
                    department: aiResponse.department,
                    needsHumanAgent: aiResponse.needsHumanAgent,
                    departmentOptions: aiResponse.departmentOptions,
                    transferred: aiResponse.transferred,
                    specialistActive: aiResponse.specialistActive
                }
            };
        }

        history.push(botMessage);
        this.messageHistory.set(sessionId, history);

        // Update session if department changed or flow state updated
        if (finalResponse.department && finalResponse.department !== session.config.department) {
            session.config.department = finalResponse.department;
            if (finalResponse.botInfo) {
                session.botInfo = finalResponse.botInfo;
            }
        }

        // Update flow state if this was a flow response
        if (flowResponse && flowResponse.newState) {
            session.flowState = flowResponse.newState;
        }

        return {
            messages: [userMessage, botMessage],
            session: session,
            response: finalResponse,
            flowHandled: !!flowResponse?.handled
        };
    }

    /**
     * Get message history for a session
     */
    getMessageHistory(sessionId) {
        return this.messageHistory.get(sessionId) || [];
    }

    /**
     * Get session info
     */
    getSession(sessionId) {
        return this.activeSessions.get(sessionId);
    }

    /**
     * Close/end a session
     */
    closeSession(sessionId) {
        const session = this.activeSessions.get(sessionId);
        if (session) {
            session.status = 'closed';
            session.closedAt = new Date();
            
            // Clean up AI conversation data
            AIBotService.clearConversationData(sessionId);
            
            console.log(`🔚 ChatKit session closed: ${sessionId}`);
            return true;
        }
        return false;
    }

    /**
     * Stream message response (for real-time typing effect)
     */
    async *streamMessage(sessionId, message) {
        const session = this.activeSessions.get(sessionId);
        if (!session) {
            throw new Error(`Session ${sessionId} not found`);
        }

        // Add user message
        const userMessage = {
            id: this.generateMessageId(),
            type: 'user',
            content: message,
            timestamp: new Date(),
            sender: session.config.customerName
        };

        const history = this.messageHistory.get(sessionId) || [];
        history.push(userMessage);

        // Yield user message first
        yield {
            type: 'message',
            data: userMessage
        };

        // Show typing indicator
        yield {
            type: 'typing',
            data: { isTyping: true, sender: 'AI Assistant' }
        };

        try {
            // Process through AI bot with HTML formatting
            const aiResponse = await AIBotService.processMessageWithFormatting(
                sessionId, 
                message, 
                session.config.customerName
            );

            // Stop typing indicator
            yield {
                type: 'typing',
                data: { isTyping: false }
            };

            // Create and yield bot message
            const botMessage = {
                id: this.generateMessageId(),
                type: 'assistant',
                content: aiResponse.response,
                timestamp: new Date(),
                sender: aiResponse.botInfo?.name || 'AI Assistant',
                metadata: {
                    department: aiResponse.department,
                    needsHumanAgent: aiResponse.needsHumanAgent,
                    departmentOptions: aiResponse.departmentOptions,
                    transferred: aiResponse.transferred,
                    specialistActive: aiResponse.specialistActive
                }
            };

            history.push(botMessage);
            this.messageHistory.set(sessionId, history);

            // Update session if needed
            if (aiResponse.department !== session.config.department) {
                session.config.department = aiResponse.department;
                session.botInfo = aiResponse.botInfo;
                
                yield {
                    type: 'session_update',
                    data: { department: aiResponse.department, botInfo: aiResponse.botInfo }
                };
            }

            yield {
                type: 'message',
                data: botMessage
            };

        } catch (error) {
            yield {
                type: 'typing',
                data: { isTyping: false }
            };
            
            yield {
                type: 'error',
                data: { message: 'Failed to process message', error: error.message }
            };
        }
    }

    /**
     * Get ChatKit-compatible message format
     */
    formatMessage(message, sessionId) {
        return {
            id: message.id,
            role: message.type === 'user' ? 'user' : 'assistant',
            content: message.content,
            created_at: message.timestamp.toISOString(),
            metadata: {
                sender: message.sender,
                sessionId: sessionId,
                ...message.metadata
            }
        };
    }

    /**
     * Generate unique session ID
     */
    generateSessionId() {
        return `chatkit_session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Generate unique message ID
     */
    generateMessageId() {
        return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Get all active sessions (for admin/monitoring)
     */
    getActiveSessions() {
        return Array.from(this.activeSessions.values()).filter(session => session.status === 'active');
    }

    /**
     * Cleanup expired sessions
     */
    cleanupExpiredSessions(maxAgeHours = 24) {
        const expiredTime = new Date(Date.now() - (maxAgeHours * 60 * 60 * 1000));
        
        for (const [sessionId, session] of this.activeSessions.entries()) {
            if (session.createdAt < expiredTime) {
                this.closeSession(sessionId);
                this.activeSessions.delete(sessionId);
                this.messageHistory.delete(sessionId);
            }
        }
    }

    /**
     * Check if OpenAI is configured for the service
     */
    isReady() {
        return OpenAIService.isReady();
    }
}

// Export singleton instance
module.exports = new ChatKitService();