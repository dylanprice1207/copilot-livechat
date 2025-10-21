const mongoose = require('mongoose');
const { SubscriptionPlan, OrganizationSubscription } = require('./src/server/models/Subscription');
const Organization = require('./src/server/models/Organization');

require('dotenv').config();

async function initializeSubscriptions() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Create default subscription plans
        const plans = [
            {
                name: 'starter',
                displayName: 'Starter',
                price: 29,
                currency: 'USD',
                billingCycle: 'monthly',
                limits: {
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
                limits: {
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
                limits: {
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
                price: 499, // Starting price, actual pricing is custom
                currency: 'USD',
                billingCycle: 'monthly',
                limits: {
                    maxAgents: -1, // Unlimited
                    knowledgeBaseSize: -1, // Unlimited
                    monthlyConversations: -1, // Unlimited
                    departmentCount: -1, // Unlimited
                    fileUploadSize: 500,
                    customBranding: true,
                    apiAccess: true,
                    advancedAnalytics: true,
                    prioritySupport: true
                },
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

        // Create or update plans
        for (const planData of plans) {
            const existingPlan = await SubscriptionPlan.findOne({ name: planData.name });
            
            if (existingPlan) {
                await SubscriptionPlan.updateOne({ name: planData.name }, planData);
                console.log(`✅ Updated ${planData.displayName} plan`);
            } else {
                await SubscriptionPlan.create(planData);
                console.log(`✅ Created ${planData.displayName} plan`);
            }
        }

        // Create default subscriptions for existing organizations
        const organizations = await Organization.find({});
        console.log(`\n🏢 Found ${organizations.length} organizations`);

        for (const org of organizations) {
            const existingSubscription = await OrganizationSubscription.findOne({ 
                organizationId: org._id 
            });

            if (!existingSubscription) {
                const subscription = new OrganizationSubscription({
                    organizationId: org._id,
                    planName: 'starter',
                    status: 'trial',
                    billingCycle: 'monthly'
                });

                await subscription.save();
                console.log(`✅ Created trial subscription for ${org.name}`);
            } else {
                console.log(`⏭️ Subscription already exists for ${org.name}`);
            }
        }

        console.log('\n🎉 Subscription initialization complete!');
        console.log('\n📋 Summary:');
        console.log('- ✅ All subscription plans created/updated');
        console.log('- ✅ Default subscriptions created for existing organizations');
        console.log('- ✅ System ready for subscription management');

        mongoose.disconnect();
    } catch (error) {
        console.error('❌ Error initializing subscriptions:', error);
        process.exit(1);
    }
}

initializeSubscriptions();