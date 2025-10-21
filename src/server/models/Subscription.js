const mongoose = require('mongoose');

const subscriptionPlanSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        enum: ['starter', 'professional', 'business', 'enterprise']
    },
    displayName: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true
    },
    currency: {
        type: String,
        default: 'USD'
    },
    billingCycle: {
        type: String,
        enum: ['monthly', 'yearly'],
        default: 'monthly'
    },
    limits: {
        maxAgents: {
            type: Number,
            required: true
        },
        knowledgeBaseSize: {
            type: Number, // in MB
            required: true
        },
        monthlyConversations: {
            type: Number,
            required: true
        },
        departmentCount: {
            type: Number,
            default: 1
        },
        fileUploadSize: {
            type: Number, // in MB
            default: 10
        },
        customBranding: {
            type: Boolean,
            default: false
        },
        apiAccess: {
            type: Boolean,
            default: false
        },
        advancedAnalytics: {
            type: Boolean,
            default: false
        },
        prioritySupport: {
            type: Boolean,
            default: false
        }
    },
    features: [{
        type: String
    }],
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

const organizationSubscriptionSchema = new mongoose.Schema({
    organizationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        required: true,
        unique: true
    },
    planName: {
        type: String,
        required: true,
        enum: ['starter', 'professional', 'business', 'enterprise']
    },
    status: {
        type: String,
        enum: ['active', 'trial', 'suspended', 'cancelled'],
        default: 'trial'
    },
    startDate: {
        type: Date,
        default: Date.now
    },
    endDate: {
        type: Date
    },
    trialEndDate: {
        type: Date,
        default: function() {
            // 14-day trial
            return new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
        }
    },
    billingCycle: {
        type: String,
        enum: ['monthly', 'yearly'],
        default: 'monthly'
    },
    // Current usage tracking
    currentUsage: {
        agentCount: {
            type: Number,
            default: 0
        },
        knowledgeBaseSizeUsed: {
            type: Number, // in MB
            default: 0
        },
        monthlyConversationsUsed: {
            type: Number,
            default: 0
        },
        departmentCount: {
            type: Number,
            default: 1
        },
        lastResetDate: {
            type: Date,
            default: Date.now
        }
    },
    // Billing information
    billing: {
        customerId: String, // Stripe/payment provider customer ID
        subscriptionId: String, // Stripe subscription ID
        paymentMethodId: String,
        lastPaymentDate: Date,
        nextBillingDate: Date
    },
    // Feature overrides (for custom enterprise plans)
    customLimits: {
        maxAgents: Number,
        knowledgeBaseSize: Number,
        monthlyConversations: Number,
        departmentCount: Number,
        customFeatures: [String]
    }
}, {
    timestamps: true
});

// Static method to get plan limits
organizationSubscriptionSchema.statics.getPlanLimits = function(planName) {
    const plans = {
        starter: {
            maxAgents: 2,
            knowledgeBaseSize: 100, // MB
            monthlyConversations: 500,
            departmentCount: 1,
            fileUploadSize: 5,
            customBranding: false,
            apiAccess: false,
            advancedAnalytics: false,
            prioritySupport: false
        },
        professional: {
            maxAgents: 10,
            knowledgeBaseSize: 1024, // 1GB
            monthlyConversations: 2500,
            departmentCount: 5,
            fileUploadSize: 25,
            customBranding: true,
            apiAccess: false,
            advancedAnalytics: true,
            prioritySupport: true
        },
        business: {
            maxAgents: 25,
            knowledgeBaseSize: 5120, // 5GB
            monthlyConversations: 10000,
            departmentCount: 15,
            fileUploadSize: 100,
            customBranding: true,
            apiAccess: true,
            advancedAnalytics: true,
            prioritySupport: true
        },
        enterprise: {
            maxAgents: -1, // Unlimited
            knowledgeBaseSize: -1, // Unlimited
            monthlyConversations: -1, // Unlimited
            departmentCount: -1, // Unlimited
            fileUploadSize: 500,
            customBranding: true,
            apiAccess: true,
            advancedAnalytics: true,
            prioritySupport: true
        }
    };
    
    return plans[planName] || plans.starter;
};

// Instance method to check if organization can perform action
organizationSubscriptionSchema.methods.canPerformAction = function(action, currentCount = 0) {
    const limits = this.customLimits || this.constructor.getPlanLimits(this.planName);
    
    switch (action) {
        case 'addAgent':
            return limits.maxAgents === -1 || currentCount < limits.maxAgents;
        case 'uploadKnowledge':
            return limits.knowledgeBaseSize === -1 || this.currentUsage.knowledgeBaseSizeUsed < limits.knowledgeBaseSize;
        case 'createConversation':
            return limits.monthlyConversations === -1 || this.currentUsage.monthlyConversationsUsed < limits.monthlyConversations;
        case 'createDepartment':
            return limits.departmentCount === -1 || currentCount < limits.departmentCount;
        case 'useAPI':
            return limits.apiAccess;
        case 'customBranding':
            return limits.customBranding;
        case 'advancedAnalytics':
            return limits.advancedAnalytics;
        default:
            return false;
    }
};

// Instance method to get remaining limits
organizationSubscriptionSchema.methods.getRemainingLimits = function() {
    const limits = this.customLimits || this.constructor.getPlanLimits(this.planName);
    
    return {
        agents: limits.maxAgents === -1 ? 'Unlimited' : Math.max(0, limits.maxAgents - this.currentUsage.agentCount),
        knowledgeBase: limits.knowledgeBaseSize === -1 ? 'Unlimited' : Math.max(0, limits.knowledgeBaseSize - this.currentUsage.knowledgeBaseSizeUsed),
        conversations: limits.monthlyConversations === -1 ? 'Unlimited' : Math.max(0, limits.monthlyConversations - this.currentUsage.monthlyConversationsUsed),
        departments: limits.departmentCount === -1 ? 'Unlimited' : Math.max(0, limits.departmentCount - this.currentUsage.departmentCount)
    };
};

// Instance method to reset monthly usage
organizationSubscriptionSchema.methods.resetMonthlyUsage = function() {
    const now = new Date();
    const lastReset = this.currentUsage.lastResetDate;
    
    // Check if a month has passed
    if (now.getMonth() !== lastReset.getMonth() || now.getFullYear() !== lastReset.getFullYear()) {
        this.currentUsage.monthlyConversationsUsed = 0;
        this.currentUsage.lastResetDate = now;
        return this.save();
    }
    
    return Promise.resolve(this);
};

// Pre-save middleware to auto-reset monthly usage
organizationSubscriptionSchema.pre('save', function(next) {
    if (this.isModified('currentUsage.monthlyConversationsUsed')) {
        this.resetMonthlyUsage();
    }
    next();
});

const SubscriptionPlan = mongoose.model('SubscriptionPlan', subscriptionPlanSchema);
const OrganizationSubscription = mongoose.model('OrganizationSubscription', organizationSubscriptionSchema);

module.exports = {
    SubscriptionPlan,
    OrganizationSubscription
};