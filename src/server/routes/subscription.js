const express = require('express');
const router = express.Router();
const { OrganizationSubscription, SubscriptionPlan } = require('../models/Subscription');
const Organization = require('../models/Organization');
const User = require('../models/User');

// Middleware to check subscription limits
const checkSubscriptionLimits = async (req, res, next) => {
    try {
        if (!req.user || !req.user.organizationId) {
            return res.status(403).json({ 
                success: false, 
                message: 'Organization context required' 
            });
        }

        const subscription = await OrganizationSubscription.findOne({ 
            organizationId: req.user.organizationId 
        });

        if (!subscription) {
            return res.status(403).json({ 
                success: false, 
                message: 'No active subscription found' 
            });
        }

        // Check if subscription is active
        if (subscription.status !== 'active' && subscription.status !== 'trial') {
            return res.status(403).json({ 
                success: false, 
                message: 'Subscription is not active. Please upgrade your plan.' 
            });
        }

        // Check if trial has expired
        if (subscription.status === 'trial' && new Date() > subscription.trialEndDate) {
            subscription.status = 'suspended';
            await subscription.save();
            
            return res.status(403).json({ 
                success: false, 
                message: 'Trial period has expired. Please upgrade to continue.' 
            });
        }

        req.subscription = subscription;
        next();
    } catch (error) {
        console.error('Subscription check error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error checking subscription' 
        });
    }
};

// Get organization subscription info
router.get('/info', checkSubscriptionLimits, async (req, res) => {
    try {
        const subscription = req.subscription;
        const limits = subscription.customLimits || OrganizationSubscription.getPlanLimits(subscription.planName);
        const remaining = subscription.getRemainingLimits();

        res.json({
            success: true,
            subscription: {
                planName: subscription.planName,
                status: subscription.status,
                trialEndDate: subscription.trialEndDate,
                billingCycle: subscription.billingCycle,
                limits,
                currentUsage: subscription.currentUsage,
                remaining
            }
        });
    } catch (error) {
        console.error('Error getting subscription info:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error retrieving subscription information' 
        });
    }
});

// Check if organization can add an agent
router.get('/check/agent', checkSubscriptionLimits, async (req, res) => {
    try {
        const subscription = req.subscription;
        const currentAgentCount = await User.countDocuments({ 
            organizationId: req.user.organizationId,
            role: { $in: ['agent', 'admin'] }
        });

        const canAdd = subscription.canPerformAction('addAgent', currentAgentCount);
        const limits = subscription.customLimits || OrganizationSubscription.getPlanLimits(subscription.planName);

        res.json({
            success: true,
            canAddAgent: canAdd,
            currentCount: currentAgentCount,
            maxAllowed: limits.maxAgents === -1 ? 'Unlimited' : limits.maxAgents,
            remaining: limits.maxAgents === -1 ? 'Unlimited' : Math.max(0, limits.maxAgents - currentAgentCount)
        });
    } catch (error) {
        console.error('Error checking agent limits:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error checking agent limits' 
        });
    }
});

// Check knowledge base limits
router.get('/check/knowledge', checkSubscriptionLimits, async (req, res) => {
    try {
        const subscription = req.subscription;
        const canUpload = subscription.canPerformAction('uploadKnowledge');
        const limits = subscription.customLimits || OrganizationSubscription.getPlanLimits(subscription.planName);

        res.json({
            success: true,
            canUpload,
            currentUsage: subscription.currentUsage.knowledgeBaseSizeUsed,
            maxAllowed: limits.knowledgeBaseSize === -1 ? 'Unlimited' : limits.knowledgeBaseSize,
            remaining: limits.knowledgeBaseSize === -1 ? 'Unlimited' : Math.max(0, limits.knowledgeBaseSize - subscription.currentUsage.knowledgeBaseSizeUsed)
        });
    } catch (error) {
        console.error('Error checking knowledge base limits:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error checking knowledge base limits' 
        });
    }
});

// Update usage (internal endpoint)
router.post('/usage/update', checkSubscriptionLimits, async (req, res) => {
    try {
        const { type, amount } = req.body;
        const subscription = req.subscription;

        switch (type) {
            case 'agent':
                subscription.currentUsage.agentCount = amount;
                break;
            case 'knowledge':
                subscription.currentUsage.knowledgeBaseSizeUsed += amount;
                break;
            case 'conversation':
                subscription.currentUsage.monthlyConversationsUsed += 1;
                break;
            case 'department':
                subscription.currentUsage.departmentCount = amount;
                break;
        }

        await subscription.save();

        res.json({
            success: true,
            message: 'Usage updated successfully',
            currentUsage: subscription.currentUsage
        });
    } catch (error) {
        console.error('Error updating usage:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error updating usage' 
        });
    }
});

// Get available plans
router.get('/plans', async (req, res) => {
    try {
        const plans = [
            {
                name: 'starter',
                displayName: 'Starter',
                price: 29,
                currency: 'USD',
                billingCycle: 'monthly',
                ...OrganizationSubscription.getPlanLimits('starter'),
                features: [
                    'Up to 2 agents',
                    '100MB knowledge base',
                    '500 monthly conversations',
                    'Basic analytics',
                    'Email support',
                    'Standard integrations'
                ]
            },
            {
                name: 'professional',
                displayName: 'Professional',
                price: 79,
                currency: 'USD',
                billingCycle: 'monthly',
                ...OrganizationSubscription.getPlanLimits('professional'),
                features: [
                    'Up to 10 agents',
                    '1GB knowledge base',
                    '2,500 monthly conversations',
                    'Advanced analytics & reports',
                    'Priority support',
                    'All integrations',
                    'Custom branding',
                    'Department management'
                ]
            },
            {
                name: 'business',
                displayName: 'Business',
                price: 149,
                currency: 'USD',
                billingCycle: 'monthly',
                ...OrganizationSubscription.getPlanLimits('business'),
                features: [
                    'Up to 25 agents',
                    '5GB knowledge base',
                    '10,000 monthly conversations',
                    'Real-time analytics',
                    '24/7 phone support',
                    'API access',
                    'Advanced AI features',
                    'Role-based permissions',
                    'Data export'
                ]
            },
            {
                name: 'enterprise',
                displayName: 'Enterprise',
                price: null,
                currency: 'USD',
                billingCycle: 'custom',
                ...OrganizationSubscription.getPlanLimits('enterprise'),
                features: [
                    'Unlimited agents',
                    'Unlimited knowledge base',
                    'Unlimited conversations',
                    'Enterprise security',
                    'Custom integrations',
                    'Dedicated support',
                    'SLA guarantees',
                    'On-premise deployment'
                ]
            }
        ];

        res.json({
            success: true,
            plans
        });
    } catch (error) {
        console.error('Error getting plans:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error retrieving plans' 
        });
    }
});

// Upgrade/downgrade subscription
router.post('/change-plan', checkSubscriptionLimits, async (req, res) => {
    try {
        const { newPlan } = req.body;
        const subscription = req.subscription;

        // Validate new plan
        const validPlans = ['starter', 'professional', 'business', 'enterprise'];
        if (!validPlans.includes(newPlan)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid plan selected' 
            });
        }

        // Check if downgrading would exceed new limits
        const newLimits = OrganizationSubscription.getPlanLimits(newPlan);
        const currentUsage = subscription.currentUsage;

        if (newLimits.maxAgents !== -1 && currentUsage.agentCount > newLimits.maxAgents) {
            return res.status(400).json({ 
                success: false, 
                message: `Cannot downgrade: You currently have ${currentUsage.agentCount} agents, but the ${newPlan} plan only allows ${newLimits.maxAgents}` 
            });
        }

        if (newLimits.knowledgeBaseSize !== -1 && currentUsage.knowledgeBaseSizeUsed > newLimits.knowledgeBaseSize) {
            return res.status(400).json({ 
                success: false, 
                message: `Cannot downgrade: Your knowledge base is ${currentUsage.knowledgeBaseSizeUsed}MB, but the ${newPlan} plan only allows ${newLimits.knowledgeBaseSize}MB` 
            });
        }

        // Update subscription
        subscription.planName = newPlan;
        subscription.status = 'active'; // Assume payment processing happens elsewhere
        await subscription.save();

        res.json({
            success: true,
            message: `Successfully changed to ${newPlan} plan`,
            subscription: {
                planName: subscription.planName,
                status: subscription.status,
                limits: newLimits
            }
        });
    } catch (error) {
        console.error('Error changing plan:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error changing subscription plan' 
        });
    }
});

module.exports = {
    router,
    checkSubscriptionLimits
};