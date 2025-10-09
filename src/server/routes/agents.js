const express = require('express');
const router = express.Router();
const User = require('../models/User');
const DepartmentRouter = require('../services/DepartmentRouter');

/**
 * Get all agents in the system (root route)
 */
router.get('/', async (req, res) => {
    console.log('🔍 GET /api/agents called');
    try {
        const agents = await User.find({ 
            role: { $in: ['agent', 'admin'] } 
        }).select('username email role departments agentProfile isOnline lastActive');
        
        console.log(`📊 Found ${agents.length} agents`);
        
        const agentList = agents.map(agent => ({
            id: agent._id,
            username: agent.username,
            email: agent.email,
            role: agent.role,
            departments: agent.departments,
            agentProfile: agent.agentProfile,
            isOnline: agent.isOnline,
            lastActive: agent.lastActive
        }));
        
        res.json({
            success: true,
            agents: agentList,
            totalAgents: agentList.length
        });
    } catch (error) {
        console.error('Error getting agents:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

/**
 * Get agent's departments
 */
router.get('/agent/:agentId/departments', async (req, res) => {
    try {
        const { agentId } = req.params;
        const agent = await User.findById(agentId).select('departments agentProfile role');
        
        if (!agent) {
            return res.status(404).json({ success: false, message: 'Agent not found' });
        }

        if (!['agent', 'admin'].includes(agent.role)) {
            return res.status(403).json({ success: false, message: 'User is not an agent' });
        }

        res.json({
            success: true,
            agentId: agentId,
            departments: agent.departments,
            agentProfile: agent.agentProfile,
            availableDepartments: ['general', 'sales', 'technical', 'support', 'billing']
        });
    } catch (error) {
        console.error('Error getting agent departments:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * Update agent's department assignments
 */
router.put('/agent/:agentId/departments', async (req, res) => {
    try {
        const { agentId } = req.params;
        const { departments, agentProfile } = req.body;

        // Validate departments
        const validDepartments = ['general', 'sales', 'technical', 'support', 'billing'];
        const invalidDepts = departments.filter(dept => !validDepartments.includes(dept));
        
        if (invalidDepts.length > 0) {
            return res.status(400).json({ 
                success: false, 
                message: `Invalid departments: ${invalidDepts.join(', ')}` 
            });
        }

        const updateData = { 
            departments,
            lastActive: new Date()
        };

        if (agentProfile) {
            updateData.agentProfile = agentProfile;
        }

        const agent = await User.findByIdAndUpdate(
            agentId,
            updateData,
            { new: true }
        ).select('username departments agentProfile role');

        if (!agent) {
            return res.status(404).json({ success: false, message: 'Agent not found' });
        }

        // Update department router with agent assignments
        departments.forEach(dept => {
            DepartmentRouter.addAgentToDepartment(dept, agentId, {
                name: agent.username,
                status: 'available',
                profile: agent.agentProfile
            });
        });

        res.json({
            success: true,
            message: 'Agent departments updated successfully',
            agent: {
                id: agent._id,
                username: agent.username,
                departments: agent.departments,
                agentProfile: agent.agentProfile
            }
        });
    } catch (error) {
        console.error('Error updating agent departments:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * Get all agents and their department assignments
 */
router.get('/agents', async (req, res) => {
    try {
        const agents = await User.find(
            { role: { $in: ['agent', 'admin'] } }
        ).select('username email role departments agentProfile isOnline lastActive');

        const agentList = agents.map(agent => ({
            id: agent._id,
            username: agent.username,
            email: agent.email,
            role: agent.role,
            departments: agent.departments,
            agentProfile: agent.agentProfile,
            isOnline: agent.isOnline,
            lastActive: agent.lastActive
        }));

        res.json({
            success: true,
            agents: agentList,
            totalAgents: agentList.length
        });
    } catch (error) {
        console.error('Error getting agents:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * Get agent's assigned chats based on departments
 */
router.get('/agent/:agentId/chats', async (req, res) => {
    try {
        const { agentId } = req.params;
        const agent = await User.findById(agentId).select('departments');
        
        if (!agent) {
            return res.status(404).json({ success: false, message: 'Agent not found' });
        }

        // Get chats from all departments the agent has access to
        const ChatRoom = require('../models/ChatRoom');
        const chats = await ChatRoom.find({
            status: { $in: ['waiting', 'active'] },
            // Filter by department if we add department field to ChatRoom later
        }).populate('agent', 'username').populate('customer', 'username');

        // For now, return all chats - later we'll filter by AI bot department assignment
        res.json({
            success: true,
            agentDepartments: agent.departments,
            chats: chats.map(chat => ({
                id: chat._id,
                roomId: chat.roomId,
                status: chat.status,
                agent: chat.agent,
                customer: chat.customer || chat.guestInfo,
                createdAt: chat.createdAt,
                isGuest: !!chat.guestInfo
            }))
        });
    } catch (error) {
        console.error('Error getting agent chats:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;