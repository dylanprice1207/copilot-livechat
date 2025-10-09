const express = require('express');
const router = express.Router();
const AIConfigController = require('../controllers/AIConfigController');
const fs = require('fs').promises;
const path = require('path');

// AI config file path
const AI_CONFIG_FILE = path.join(__dirname, '../../../config/ai-config.json');

// OpenAI Configuration Routes
router.post('/openai/configure', AIConfigController.configureOpenAI);
router.get('/openai/status', AIConfigController.getOpenAIStatus);
router.post('/openai/test', AIConfigController.testOpenAI);
router.delete('/openai/clear', AIConfigController.clearOpenAI);

// Department Management Routes
router.get('/departments', AIConfigController.getDepartments);
router.put('/departments/:departmentId', AIConfigController.updateDepartment);
router.get('/departments/:departmentId/stats', AIConfigController.getDepartmentStats);

// Chat Response Route
router.post('/chat', AIConfigController.getChatResponse);

// Debug status route
router.get('/status', (req, res) => {
    const OpenAIService = require('../services/OpenAIService');
    const status = OpenAIService.getStatus();
    
    res.json({
        success: true,
        openai: status,
        environment: {
            hasEnvKey: !!process.env.OPENAI_API_KEY,
            envKeyPreview: process.env.OPENAI_API_KEY ? 
                `${process.env.OPENAI_API_KEY.substring(0, 7)}...${process.env.OPENAI_API_KEY.slice(-4)}` : 
                null,
            nodeEnv: process.env.NODE_ENV
        }
    });
});

/**
 * Get AI configuration for admin portal
 */
router.get('/config', async (req, res) => {
    try {
        let config = {
            defaultModel: 'gpt-4',
            maxTokens: 2000,
            temperature: 0.7,
            presencePenalty: 0.6
        };
        
        try {
            const data = await fs.readFile(AI_CONFIG_FILE, 'utf8');
            config = { ...config, ...JSON.parse(data) };
        } catch (error) {
            console.log('Using default AI configuration');
        }
        
        // Don't send the actual API key, just indicate if it's set
        res.json({
            success: true,
            config: {
                ...config,
                hasApiKey: !!process.env.OPENAI_API_KEY
            }
        });
        
    } catch (error) {
        console.error('Error getting AI config:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

/**
 * Update AI configuration for admin portal
 */
router.put('/config', async (req, res) => {
    try {
        const { openaiApiKey, defaultModel, maxTokens, temperature, presencePenalty } = req.body;
        
        const config = {
            defaultModel: defaultModel || 'gpt-4',
            maxTokens: maxTokens || 2000,
            temperature: temperature !== undefined ? temperature : 0.7,
            presencePenalty: presencePenalty !== undefined ? presencePenalty : 0.6
        };
        
        // Ensure config directory exists
        const configDir = path.dirname(AI_CONFIG_FILE);
        try {
            await fs.access(configDir);
        } catch {
            await fs.mkdir(configDir, { recursive: true });
        }
        
        // Save config to file
        await fs.writeFile(AI_CONFIG_FILE, JSON.stringify(config, null, 2));
        
        // Update environment variable if API key is provided
        if (openaiApiKey && openaiApiKey !== '••••••••••') {
            process.env.OPENAI_API_KEY = openaiApiKey;
            
            // Update .env file
            const envPath = path.join(__dirname, '../../../.env');
            try {
                let envContent = await fs.readFile(envPath, 'utf8');
                if (envContent.includes('OPENAI_API_KEY=')) {
                    envContent = envContent.replace(/OPENAI_API_KEY=.*/g, `OPENAI_API_KEY=${openaiApiKey}`);
                } else {
                    envContent += `\nOPENAI_API_KEY=${openaiApiKey}`;
                }
                await fs.writeFile(envPath, envContent);
            } catch (error) {
                console.error('Error updating .env file:', error);
            }
        }
        
        res.json({
            success: true,
            message: 'AI configuration saved successfully'
        });
        
    } catch (error) {
        console.error('Error saving AI config:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

/**
 * Get bot configurations for all departments
 */
router.get('/bots/config', async (req, res) => {
    try {
        const AIBotService = require('../services/AIBotService');
        const botConfigs = AIBotService.getBotConfigurations();
        res.json(botConfigs);
    } catch (error) {
        console.error('Error getting bot configurations:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

/**
 * Save bot configurations for all departments
 */
router.post('/bots/config', async (req, res) => {
    try {
        const AIBotService = require('../services/AIBotService');
        const botConfigs = req.body;
        
        // Validate bot configurations
        const departments = ['general', 'sales', 'technical', 'support', 'billing'];
        for (const dept of departments) {
            if (botConfigs[dept]) {
                const config = botConfigs[dept];
                if (!config.name || !config.role || !config.style) {
                    return res.status(400).json({
                        success: false,
                        message: `Invalid configuration for ${dept} department. Name, role, and style are required.`
                    });
                }
            }
        }
        
        // Save configurations
        await AIBotService.updateBotConfigurations(botConfigs);
        
        res.json({
            success: true,
            message: 'Bot configurations saved successfully'
        });
        
    } catch (error) {
        console.error('Error saving bot configurations:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

/**
 * Test bot personalities - returns status of each bot
 */
router.post('/bots/test', async (req, res) => {
    try {
        const AIBotService = require('../services/AIBotService');
        const testResults = AIBotService.testBotPersonalities();
        
        res.json({
            success: true,
            tests: testResults
        });
        
    } catch (error) {
        console.error('Error testing bot personalities:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

/**
 * Reset bot configurations to defaults
 */
router.post('/bots/reset', async (req, res) => {
    try {
        const AIBotService = require('../services/AIBotService');
        await AIBotService.resetBotConfigurations();
        
        res.json({
            success: true,
            message: 'Bot configurations reset to defaults'
        });
        
    } catch (error) {
        console.error('Error resetting bot configurations:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;