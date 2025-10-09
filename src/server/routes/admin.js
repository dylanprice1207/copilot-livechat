const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const AnalyticsService = require('../services/AnalyticsService');

/**
 * Get all users (admin only)
 */
router.get('/users', async (req, res) => {
    try {
        const users = await User.find({})
            .select('-password')
            .sort({ createdAt: -1 });
            
        res.json({
            success: true,
            users: users
        });
    } catch (error) {
        console.error('Error getting users:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

/**
 * Create new user (admin only)
 */
router.post('/users', async (req, res) => {
    try {
        const { username, email, password, role, departments } = req.body;
        
        // Validate required fields
        if (!username || !email || !password) {
            return res.status(400).json({ 
                success: false, 
                message: 'Username, email, and password are required' 
            });
        }
        
        // Check if user already exists
        const existingUser = await User.findOne({
            $or: [{ email }, { username }]
        });
        
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'User with this email or username already exists'
            });
        }
        
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 12);
        
        // Create user
        const userData = {
            username,
            email,
            password: hashedPassword,
            role: role || 'customer',
            departments: departments || [],
            createdAt: new Date()
        };
        
        // Set default departments for admins
        if (userData.role === 'admin') {
            userData.departments = ['general', 'sales', 'technical', 'support', 'billing'];
        }
        
        const user = new User(userData);
        await user.save();
        
        // Remove password from response
        const userResponse = user.toObject();
        delete userResponse.password;
        
        res.status(201).json({
            success: true,
            message: 'User created successfully',
            user: userResponse
        });
        
    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

/**
 * Update user (admin only)
 */
router.put('/users/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const { username, email, role, departments } = req.body;
        
        const updateData = {
            username,
            email,
            role,
            departments: departments || [],
            lastActive: new Date()
        };
        
        // Set default departments for admins
        if (updateData.role === 'admin') {
            updateData.departments = ['general', 'sales', 'technical', 'support', 'billing'];
        }
        
        const user = await User.findByIdAndUpdate(
            userId,
            updateData,
            { new: true }
        ).select('-password');
        
        if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: 'User not found' 
            });
        }
        
        res.json({
            success: true,
            message: 'User updated successfully',
            user: user
        });
        
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

/**
 * Delete user (admin only)
 */
router.delete('/users/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        
        const user = await User.findByIdAndDelete(userId);
        
        if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: 'User not found' 
            });
        }
        
        res.json({
            success: true,
            message: 'User deleted successfully'
        });
        
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

/**
 * Get dashboard statistics
 */
router.get('/dashboard', async (req, res) => {
    try {
        const stats = await AnalyticsService.getDashboardStats();
        res.json(stats);
        
    } catch (error) {
        console.error('Error getting dashboard stats:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

/**
 * Get analytics data
 */
router.get('/analytics', async (req, res) => {
    try {
        const analytics = await AnalyticsService.getAnalytics();
        res.json(analytics);
        
    } catch (error) {
        console.error('Error getting analytics:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

/**
 * Get online metrics
 */
router.get('/metrics/online', async (req, res) => {
    try {
        const metrics = await AnalyticsService.getOnlineMetrics();
        res.json({
            success: true,
            ...metrics
        });
        
    } catch (error) {
        console.error('Error getting online metrics:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

/**
 * Get chat metrics
 */
router.get('/metrics/chats', async (req, res) => {
    try {
        const metrics = await AnalyticsService.getChatMetrics();
        res.json({
            success: true,
            ...metrics
        });
        
    } catch (error) {
        console.error('Error getting chat metrics:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

/**
 * Get hourly message distribution for the last 24 hours
 */
router.get('/analytics/hourly', async (req, res) => {
    try {
        const hourlyData = await AnalyticsService.getHourlyDistribution();
        res.json({
            success: true,
            data: hourlyData
        });
        
    } catch (error) {
        console.error('Error getting hourly analytics:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

/**
 * Get top performing agents
 */
router.get('/analytics/top-agents', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 5;
        const topAgents = await AnalyticsService.getTopAgents(limit);
        res.json({
            success: true,
            agents: topAgents
        });
        
    } catch (error) {
        console.error('Error getting top agents:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Settings Routes
const settingsRoutes = require('./settings');
router.use('/settings', settingsRoutes);

module.exports = router;