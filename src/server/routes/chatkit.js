const express = require('express');
const router = express.Router();
const ChatKitService = require('../services/ChatKitService');

/**
 * ChatKit API Routes - Custom backend integration
 * Provides ChatKit-compatible endpoints for the frontend
 */

// Create new ChatKit session
router.post('/sessions', async (req, res) => {
    try {
        const { userId, department, customerName, organizationId, ...config } = req.body;
        
        if (!userId) {
            return res.status(400).json({ error: 'userId is required' });
        }

        const session = await ChatKitService.createSession(userId, {
            department,
            customerName: customerName || 'Customer',
            organizationId: organizationId || 'default',
            ...config
        });

        res.json({
            success: true,
            sessionId: session.sessionId,
            botInfo: session.botInfo,
            flowState: session.flowState,
            organizationId: session.organizationId,
            department: session.department
        });

    } catch (error) {
        console.error('❌ Error creating ChatKit session:', error);
        res.status(500).json({ 
            error: 'Failed to create session',
            details: error.message 
        });
    }
});

// Send message to session
router.post('/sessions/:sessionId/messages', async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { message, type = 'user' } = req.body;

        if (!message) {
            return res.status(400).json({ error: 'message is required' });
        }

        const result = await ChatKitService.sendMessage(sessionId, message, type);

        res.json({
            success: true,
            messages: result.messages.map(msg => ChatKitService.formatMessage(msg, sessionId)),
            session: result.session,
            flowHandled: result.flowHandled || false,
            response: result.response,
            metadata: result.aiResponse
        });

    } catch (error) {
        console.error('❌ Error sending message:', error);
        res.status(500).json({ 
            error: 'Failed to send message',
            details: error.message 
        });
    }
});

// Stream message (Server-Sent Events)
router.post('/sessions/:sessionId/messages/stream', async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { message } = req.body;

        if (!message) {
            return res.status(400).json({ error: 'message is required' });
        }

        // Set up SSE headers
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Cache-Control'
        });

        // Stream the response
        for await (const chunk of ChatKitService.streamMessage(sessionId, message)) {
            const data = JSON.stringify({
                ...chunk,
                timestamp: new Date().toISOString()
            });
            
            res.write(`data: ${data}\n\n`);
        }

        res.write(`data: {"type": "done"}\n\n`);
        res.end();

    } catch (error) {
        console.error('❌ Error streaming message:', error);
        res.write(`data: {"type": "error", "data": {"message": "${error.message}"}}\n\n`);
        res.end();
    }
});

// Get session history
router.get('/sessions/:sessionId/messages', async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { limit = 50, offset = 0 } = req.query;

        const messages = ChatKitService.getMessageHistory(sessionId);
        const session = ChatKitService.getSession(sessionId);

        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }

        // Apply pagination
        const paginatedMessages = messages
            .slice(offset, offset + parseInt(limit))
            .map(msg => ChatKitService.formatMessage(msg, sessionId));

        res.json({
            success: true,
            messages: paginatedMessages,
            total: messages.length,
            session: session
        });

    } catch (error) {
        console.error('❌ Error getting session messages:', error);
        res.status(500).json({ 
            error: 'Failed to get messages',
            details: error.message 
        });
    }
});

// Get session info
router.get('/sessions/:sessionId', async (req, res) => {
    try {
        const { sessionId } = req.params;
        const session = ChatKitService.getSession(sessionId);

        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }

        res.json({
            success: true,
            session: session
        });

    } catch (error) {
        console.error('❌ Error getting session:', error);
        res.status(500).json({ 
            error: 'Failed to get session',
            details: error.message 
        });
    }
});

// Close session
router.delete('/sessions/:sessionId', async (req, res) => {
    try {
        const { sessionId } = req.params;
        const closed = ChatKitService.closeSession(sessionId);

        if (!closed) {
            return res.status(404).json({ error: 'Session not found' });
        }

        res.json({
            success: true,
            message: 'Session closed successfully'
        });

    } catch (error) {
        console.error('❌ Error closing session:', error);
        res.status(500).json({ 
            error: 'Failed to close session',
            details: error.message 
        });
    }
});

// Get all active sessions (admin endpoint)
router.get('/sessions', async (req, res) => {
    try {
        const sessions = ChatKitService.getActiveSessions();

        res.json({
            success: true,
            sessions: sessions,
            count: sessions.length
        });

    } catch (error) {
        console.error('❌ Error getting sessions:', error);
        res.status(500).json({ 
            error: 'Failed to get sessions',
            details: error.message 
        });
    }
});

// Health check
router.get('/health', async (req, res) => {
    try {
        const isReady = ChatKitService.isReady();
        
        res.json({
            success: true,
            status: isReady ? 'ready' : 'not_configured',
            timestamp: new Date().toISOString(),
            activeSessions: ChatKitService.getActiveSessions().length
        });

    } catch (error) {
        console.error('❌ Error checking health:', error);
        res.status(500).json({ 
            error: 'Health check failed',
            details: error.message 
        });
    }
});

// Cleanup expired sessions (maintenance endpoint)
router.post('/maintenance/cleanup', async (req, res) => {
    try {
        const { maxAgeHours = 24 } = req.body;
        
        ChatKitService.cleanupExpiredSessions(maxAgeHours);

        res.json({
            success: true,
            message: `Cleaned up sessions older than ${maxAgeHours} hours`
        });

    } catch (error) {
        console.error('❌ Error during cleanup:', error);
        res.status(500).json({ 
            error: 'Cleanup failed',
            details: error.message 
        });
    }
});

module.exports = router;