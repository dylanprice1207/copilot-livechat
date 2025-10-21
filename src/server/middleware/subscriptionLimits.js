const { OrganizationSubscription } = require('../models/Subscription');
const User = require('../models/User');

// Middleware to check if organization can add agents
const checkAgentLimit = async (req, res, next) => {
    try {
        if (!req.user || !req.user.organizationId) {
            return next();
        }

        const subscription = await OrganizationSubscription.findOne({ 
            organizationId: req.user.organizationId 
        });

        if (!subscription) {
            return res.status(403).json({ 
                success: false, 
                message: 'No subscription found. Please set up a subscription plan.',
                code: 'NO_SUBSCRIPTION'
            });
        }

        // Count current agents
        const currentAgentCount = await User.countDocuments({ 
            organizationId: req.user.organizationId,
            role: { $in: ['agent', 'admin'] }
        });

        const canAddAgent = subscription.canPerformAction('addAgent', currentAgentCount);

        if (!canAddAgent) {
            const limits = subscription.customLimits || OrganizationSubscription.getPlanLimits(subscription.planName);
            return res.status(403).json({ 
                success: false, 
                message: `Agent limit reached. Your ${subscription.planName} plan allows ${limits.maxAgents} agents. Please upgrade to add more agents.`,
                code: 'AGENT_LIMIT_REACHED',
                currentCount: currentAgentCount,
                maxAllowed: limits.maxAgents,
                planName: subscription.planName
            });
        }

        req.subscription = subscription;
        next();
    } catch (error) {
        console.error('Agent limit check error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error checking agent limits' 
        });
    }
};

// Middleware to check knowledge base limits
const checkKnowledgeLimit = (sizeInMB) => {
    return async (req, res, next) => {
        try {
            if (!req.user || !req.user.organizationId) {
                return next();
            }

            const subscription = await OrganizationSubscription.findOne({ 
                organizationId: req.user.organizationId 
            });

            if (!subscription) {
                return res.status(403).json({ 
                    success: false, 
                    message: 'No subscription found',
                    code: 'NO_SUBSCRIPTION'
                });
            }

            const limits = subscription.customLimits || OrganizationSubscription.getPlanLimits(subscription.planName);
            const currentUsage = subscription.currentUsage.knowledgeBaseSizeUsed;
            const proposedUsage = currentUsage + sizeInMB;

            if (limits.knowledgeBaseSize !== -1 && proposedUsage > limits.knowledgeBaseSize) {
                return res.status(403).json({ 
                    success: false, 
                    message: `Knowledge base limit exceeded. Your ${subscription.planName} plan allows ${limits.knowledgeBaseSize}MB. Adding this content would use ${proposedUsage}MB.`,
                    code: 'KNOWLEDGE_LIMIT_REACHED',
                    currentUsage,
                    maxAllowed: limits.knowledgeBaseSize,
                    planName: subscription.planName
                });
            }

            req.subscription = subscription;
            next();
        } catch (error) {
            console.error('Knowledge limit check error:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Error checking knowledge base limits' 
            });
        }
    };
};

// Middleware to check conversation limits
const checkConversationLimit = async (req, res, next) => {
    try {
        if (!req.user || !req.user.organizationId) {
            return next();
        }

        const subscription = await OrganizationSubscription.findOne({ 
            organizationId: req.user.organizationId 
        });

        if (!subscription) {
            return res.status(403).json({ 
                success: false, 
                message: 'No subscription found',
                code: 'NO_SUBSCRIPTION'
            });
        }

        const canCreateConversation = subscription.canPerformAction('createConversation');

        if (!canCreateConversation) {
            const limits = subscription.customLimits || OrganizationSubscription.getPlanLimits(subscription.planName);
            return res.status(403).json({ 
                success: false, 
                message: `Monthly conversation limit reached. Your ${subscription.planName} plan allows ${limits.monthlyConversations} conversations per month.`,
                code: 'CONVERSATION_LIMIT_REACHED',
                currentUsage: subscription.currentUsage.monthlyConversationsUsed,
                maxAllowed: limits.monthlyConversations,
                planName: subscription.planName
            });
        }

        req.subscription = subscription;
        next();
    } catch (error) {
        console.error('Conversation limit check error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error checking conversation limits' 
        });
    }
};

// Middleware to check API access
const checkAPIAccess = async (req, res, next) => {
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
                message: 'No subscription found',
                code: 'NO_SUBSCRIPTION'
            });
        }

        const hasAPIAccess = subscription.canPerformAction('useAPI');

        if (!hasAPIAccess) {
            return res.status(403).json({ 
                success: false, 
                message: `API access not available on your ${subscription.planName} plan. Please upgrade to Business or Enterprise plan.`,
                code: 'API_ACCESS_DENIED',
                planName: subscription.planName
            });
        }

        req.subscription = subscription;
        next();
    } catch (error) {
        console.error('API access check error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error checking API access' 
        });
    }
};

// Function to update usage after successful operations
const updateUsage = async (organizationId, type, amount = 1) => {
    try {
        const subscription = await OrganizationSubscription.findOne({ 
            organizationId 
        });

        if (!subscription) {
            console.warn('No subscription found for organization:', organizationId);
            return;
        }

        switch (type) {
            case 'agent':
                const agentCount = await User.countDocuments({ 
                    organizationId,
                    role: { $in: ['agent', 'admin'] }
                });
                subscription.currentUsage.agentCount = agentCount;
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
        console.log(`Updated ${type} usage for organization ${organizationId}:`, subscription.currentUsage);
    } catch (error) {
        console.error('Error updating usage:', error);
    }
};

// Function to create default subscription for new organizations
const createDefaultSubscription = async (organizationId) => {
    try {
        const existingSubscription = await OrganizationSubscription.findOne({ organizationId });
        
        if (existingSubscription) {
            return existingSubscription;
        }

        const subscription = new OrganizationSubscription({
            organizationId,
            planName: 'starter',
            status: 'trial',
            billingCycle: 'monthly'
        });

        await subscription.save();
        console.log('Created default subscription for organization:', organizationId);
        return subscription;
    } catch (error) {
        console.error('Error creating default subscription:', error);
        throw error;
    }
};

module.exports = {
    checkAgentLimit,
    checkKnowledgeLimit,
    checkConversationLimit,
    checkAPIAccess,
    updateUsage,
    createDefaultSubscription
};