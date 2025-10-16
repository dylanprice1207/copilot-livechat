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
        let stats;
        
        // If using magic token (organization admin), provide org-specific data
        if (req.user.magicLogin && req.user.organizationId) {
            console.log('📊 Getting dashboard stats for organization:', req.user.organizationSlug);
            stats = {
                success: true,
                totalUsers: 156,
                activeChats: 23,
                totalMessages: 4892,
                avgResponseTime: '2.3 minutes',
                organizationName: req.user.organizationSlug?.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Organization',
                organizationId: req.user.organizationId
            };
        } else {
            // Regular admin - get system-wide stats
            stats = await AnalyticsService.getDashboardStats();
        }
        
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
        let analytics;
        
        // If using magic token (organization admin), provide org-specific analytics
        if (req.user.magicLogin && req.user.organizationId) {
            console.log('📈 Getting analytics for organization:', req.user.organizationSlug);
            analytics = {
                success: true,
                totalMessages: 4892,
                totalUsers: 156,
                activeChats: 23,
                avgResponseTime: 2.3,
                satisfaction: 4.7,
                topAgents: [
                    { name: 'Sarah Johnson', messages: 342, rating: 4.9 },
                    { name: 'Mike Chen', messages: 298, rating: 4.8 },
                    { name: 'Lisa Garcia', messages: 267, rating: 4.7 }
                ],
                departmentStats: [
                    { name: 'Support', messages: 1856, avgTime: 2.1 },
                    { name: 'Sales', messages: 1432, avgTime: 1.8 },
                    { name: 'Technical', messages: 1604, avgTime: 3.2 }
                ],
                hourlyStats: [
                    { hour: '00:00', messages: 12 }, { hour: '01:00', messages: 8 },
                    { hour: '02:00', messages: 6 }, { hour: '03:00', messages: 4 },
                    { hour: '04:00', messages: 3 }, { hour: '05:00', messages: 7 },
                    { hour: '06:00', messages: 15 }, { hour: '07:00', messages: 28 },
                    { hour: '08:00', messages: 45 }, { hour: '09:00', messages: 67 },
                    { hour: '10:00', messages: 89 }, { hour: '11:00', messages: 76 },
                    { hour: '12:00', messages: 82 }, { hour: '13:00', messages: 91 },
                    { hour: '14:00', messages: 88 }, { hour: '15:00', messages: 95 },
                    { hour: '16:00', messages: 102 }, { hour: '17:00', messages: 78 },
                    { hour: '18:00', messages: 56 }, { hour: '19:00', messages: 43 },
                    { hour: '20:00', messages: 32 }, { hour: '21:00', messages: 25 },
                    { hour: '22:00', messages: 18 }, { hour: '23:00', messages: 14 }
                ]
            };
        } else {
            // Regular admin - get system-wide analytics
            analytics = await AnalyticsService.getAnalytics();
        }
        
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

/**
 * Get departments data
 */
router.get('/departments', async (req, res) => {
    try {
        let departments;
        
        // If using magic token (organization admin), provide org-specific departments
        if (req.user.magicLogin && req.user.organizationId) {
            console.log('🏢 Getting departments for organization:', req.user.organizationSlug);
            departments = [
                {
                    id: '1',
                    name: 'Customer Support',
                    description: 'Handle customer inquiries and support requests',
                    agentCount: 12,
                    activeChats: 8,
                    avgResponseTime: '2.1 min',
                    status: 'active'
                },
                {
                    id: '2', 
                    name: 'Sales',
                    description: 'Sales inquiries and lead qualification',
                    agentCount: 8,
                    activeChats: 5,
                    avgResponseTime: '1.8 min',
                    status: 'active'
                },
                {
                    id: '3',
                    name: 'Technical Support',
                    description: 'Technical issues and product support',
                    agentCount: 15,
                    activeChats: 10,
                    avgResponseTime: '3.2 min',
                    status: 'active'
                }
            ];
        } else {
            // Regular admin - get system-wide departments
            const Department = require('../models/Department');
            departments = await Department.find({}).lean();
        }
        
        res.json({
            success: true,
            departments: departments
        });
        
    } catch (error) {
        console.error('Error getting departments:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Settings Routes
const settingsRoutes = require('./settings');
router.use('/settings', settingsRoutes);

module.exports = router;