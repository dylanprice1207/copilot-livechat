const express = require('express');
const router = express.Router();
const ChatFlowService = require('../services/ChatFlowService');

/**
 * GET /api/chatflow/config - Get public chatflow configuration
 */
router.get('/config', (req, res) => {
    try {
        const config = ChatFlowService.getPublicConfig();
        res.json(config);
    } catch (error) {
        console.error('❌ Error getting chatflow config:', error);
        res.status(500).json({
            error: 'Failed to get chatflow configuration'
        });
    }
});

/**
 * GET /api/chatflow/welcome - Get welcome flow configuration
 */
router.get('/welcome', (req, res) => {
    try {
        const welcome = ChatFlowService.getWelcomeFlow();
        res.json({
            message: welcome
        });
    } catch (error) {
        console.error('❌ Error getting welcome flow:', error);
        res.status(500).json({
            message: 'Welcome to our support chat! How can I help you today?'
        });
    }
});

/**
 * POST /api/chatflow/session - Create a new chatflow session
 */
router.post('/session', (req, res) => {
    try {
        const { customerId, customerName, customerEmail } = req.body;

        if (!customerId) {
            return res.status(400).json({
                error: 'Customer ID is required'
            });
        }

        const sessionId = ChatFlowService.createSession(customerId, {
            customerName,
            customerEmail
        });

        res.json({
            sessionId: sessionId
        });
    } catch (error) {
        console.error('❌ Error creating chatflow session:', error);
        res.status(500).json({
            error: 'Failed to create chatflow session'
        });
    }
});

/**
 * POST /api/chatflow/process - Process customer message through chatflow
 */
router.post('/process', async (req, res) => {
    try {
        const { customerId, message } = req.body;

        if (!customerId || !message) {
            return res.status(400).json({
                success: false,
                message: 'customerId and message are required'
            });
        }

        const result = await ChatFlowService.processMessage(customerId, message);

        res.json({
            success: true,
            result: result
        });
    } catch (error) {
        console.error('❌ Error processing chatflow message:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to process message',
            error: error.message
        });
    }
});

/**
 * POST /api/chatflow/quick-action - Handle quick action selection
 */
router.post('/quick-action', async (req, res) => {
    try {
        const { customerId, actionText } = req.body;

        if (!customerId || !actionText) {
            return res.status(400).json({
                success: false,
                message: 'customerId and actionText are required'
            });
        }

        // Find the quick action and get its response
        const config = ChatFlowService.getPublicConfig();
        const quickAction = config.quickActions.find(action => action.text === actionText);

        if (!quickAction) {
            return res.status(404).json({
                success: false,
                message: 'Quick action not found'
            });
        }

        // Process as if it was a regular message to trigger any routing
        const result = await ChatFlowService.processMessage(customerId, quickAction.text);

        // Override the response with the quick action response
        result.response = {
            text: quickAction.response,
            type: 'quick-action',
            originalAction: quickAction
        };

        res.json({
            success: true,
            result: result
        });
    } catch (error) {
        console.error('❌ Error processing quick action:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to process quick action',
            error: error.message
        });
    }
});

/**
 * GET /api/chatflow/session/:customerId - Get customer session state
 */
router.get('/session/:customerId', (req, res) => {
    try {
        const { customerId } = req.params;
        const session = ChatFlowService.getCustomerSession(customerId);

        if (!session) {
            return res.status(404).json({
                success: false,
                message: 'Session not found'
            });
        }

        res.json({
            success: true,
            session: session
        });
    } catch (error) {
        console.error('❌ Error getting session:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get session',
            error: error.message
        });
    }
});

/**
 * DELETE /api/chatflow/session/:customerId - Clear customer session
 */
router.delete('/session/:customerId', (req, res) => {
    try {
        const { customerId } = req.params;
        ChatFlowService.clearCustomerSession(customerId);

        res.json({
            success: true,
            message: 'Session cleared'
        });
    } catch (error) {
        console.error('❌ Error clearing session:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to clear session',
            error: error.message
        });
    }
});

module.exports = router;