const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');

// Organization settings file path
const SETTINGS_FILE = path.join(__dirname, '../../../config/organization.json');

/**
 * Get organization settings
 */
router.get('/settings', async (req, res) => {
    try {
        let settings = {
            orgName: 'Lightwave AI',
            orgDomain: 'lightwave',
            maxConcurrentChats: 5,
            chatTimeout: 30,
            requireMFA: false,
            enableLogging: true,
            allowGuestChat: true
        };
        
        try {
            const data = await fs.readFile(SETTINGS_FILE, 'utf8');
            settings = { ...settings, ...JSON.parse(data) };
        } catch (error) {
            // File doesn't exist or is invalid, use defaults
            console.log('Using default organization settings');
        }
        
        res.json({
            success: true,
            settings
        });
        
    } catch (error) {
        console.error('Error getting organization settings:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

/**
 * Update organization settings
 */
router.put('/settings', async (req, res) => {
    try {
        const settings = req.body;
        
        // Validate settings
        if (!settings.orgName || !settings.orgDomain) {
            return res.status(400).json({
                success: false,
                message: 'Organization name and domain are required'
            });
        }
        
        // Ensure config directory exists
        const configDir = path.dirname(SETTINGS_FILE);
        try {
            await fs.access(configDir);
        } catch {
            await fs.mkdir(configDir, { recursive: true });
        }
        
        // Save settings to file
        await fs.writeFile(SETTINGS_FILE, JSON.stringify(settings, null, 2));
        
        res.json({
            success: true,
            message: 'Organization settings saved successfully',
            settings
        });
        
    } catch (error) {
        console.error('Error saving organization settings:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

/**
 * Get organization info (public endpoint)
 */
router.get('/info', async (req, res) => {
    try {
        let settings = {
            orgName: 'Lightwave AI',
            orgDomain: 'lightwave',
            allowGuestChat: true
        };
        
        try {
            const data = await fs.readFile(SETTINGS_FILE, 'utf8');
            const fullSettings = JSON.parse(data);
            settings = {
                orgName: fullSettings.orgName,
                orgDomain: fullSettings.orgDomain,
                allowGuestChat: fullSettings.allowGuestChat
            };
        } catch (error) {
            // Use defaults
        }
        
        res.json({
            success: true,
            info: settings
        });
        
    } catch (error) {
        console.error('Error getting organization info:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;