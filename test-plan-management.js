#!/usr/bin/env node

/**
 * Test Plan Management System
 * Tests the new service agent plan management features
 */

const mongoose = require('mongoose');
const Organization = require('./src/server/models/Organization');
const User = require('./src/server/models/User');
const Knowledge = require('./src/server/models/Knowledge');

// Database connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/convoai';

async function connectDatabase() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');
    } catch (error) {
        console.error('❌ Database connection failed:', error);
        process.exit(1);
    }
}

async function testPlanManagement() {
    console.log('\n🧪 Testing Plan Management System...\n');

    try {
        // 1. Find test organization
        console.log('1️⃣ Finding test organization...');
        let organization = await Organization.findOne({ name: /lightwave/i });
        
        if (!organization) {
            console.log('⚠️ No organization found, creating test organization...');
            organization = await Organization.create({
                name: 'Lightwave AI Test',
                slug: 'lightwave-test',
                subscription: {
                    plan: 'free',
                    status: 'active',
                    billingCycle: 'monthly'
                },
                usage: {
                    conversations: 45,
                    messagesThisMonth: 180
                }
            });
        }

        console.log(`✅ Using organization: ${organization.name} (${organization._id})`);
        console.log(`📋 Current plan: ${organization.subscription?.plan || 'free'}`);

        // 2. Test plan upgrade
        console.log('\n2️⃣ Testing plan upgrade...');
        const oldPlan = organization.subscription?.plan || 'free';
        
        organization.subscription = {
            ...organization.subscription,
            plan: 'professional',
            status: 'active',
            lastUpdated: new Date(),
            updatedBy: 'test-service-agent'
        };
        
        await organization.save();
        console.log(`✅ Plan upgraded from ${oldPlan} to professional`);

        // 3. Test usage calculation
        console.log('\n3️⃣ Testing usage calculation...');
        
        const [agentCount, knowledgeStats] = await Promise.all([
            User.countDocuments({ 
                organizationId: organization._id, 
                role: { $in: ['agent', 'admin'] },
                isActive: true 
            }),
            Knowledge.aggregate([
                { $match: { organizationId: organization._id } },
                { $group: { 
                    _id: null, 
                    totalSize: { $sum: '$size' },
                    count: { $sum: 1 }
                }}
            ])
        ]);

        const kbData = knowledgeStats[0] || { totalSize: 0, count: 0 };
        
        console.log(`👥 Active agents: ${agentCount}`);
        console.log(`📚 Knowledge entries: ${kbData.count}`);
        console.log(`💾 Knowledge storage: ${Math.round(kbData.totalSize / (1024 * 1024))} MB`);

        // 4. Test plan limits
        console.log('\n4️⃣ Testing plan limits...');
        
        const planLimits = {
            free: { agents: 1, knowledgeBase: 50 * 1024 * 1024, conversations: 100 },
            professional: { agents: 10, knowledgeBase: 1024 * 1024 * 1024, conversations: 2500 },
            business: { agents: 25, knowledgeBase: 5 * 1024 * 1024 * 1024, conversations: 10000 }
        };

        const currentPlan = organization.subscription?.plan || 'free';
        const limits = planLimits[currentPlan];
        
        console.log(`📊 Plan limits for ${currentPlan}:`);
        console.log(`  • Agents: ${agentCount}/${limits.agents} (${((agentCount/limits.agents)*100).toFixed(1)}%)`);
        console.log(`  • Storage: ${Math.round(kbData.totalSize/(1024*1024))}MB/${Math.round(limits.knowledgeBase/(1024*1024))}MB (${((kbData.totalSize/limits.knowledgeBase)*100).toFixed(1)}%)`);
        console.log(`  • Conversations: ${organization.usage?.conversations || 0}/${limits.conversations} (${(((organization.usage?.conversations || 0)/limits.conversations)*100).toFixed(1)}%)`);

        // 5. Test trial extension
        console.log('\n5️⃣ Testing trial extension...');
        
        const trialExtensionDays = 7;
        const currentTrialEnd = organization.subscription?.trialEnd ? 
            new Date(organization.subscription.trialEnd) : new Date();
        
        const newTrialEnd = new Date(currentTrialEnd.getTime() + (trialExtensionDays * 24 * 60 * 60 * 1000));

        organization.subscription = {
            ...organization.subscription,
            trialEnd: newTrialEnd,
            status: 'trial',
            lastUpdated: new Date(),
            updatedBy: 'test-service-agent'
        };

        await organization.save();
        console.log(`✅ Trial extended by ${trialExtensionDays} days until ${newTrialEnd.toLocaleDateString()}`);

        // 6. Test usage reset
        console.log('\n6️⃣ Testing usage reset...');
        
        const oldUsage = organization.usage?.conversations || 0;
        
        organization.usage = {
            conversations: 0,
            messagesThisMonth: 0,
            lastReset: new Date(),
            resetBy: 'test-service-agent'
        };

        await organization.save();
        console.log(`✅ Usage reset: conversations ${oldUsage} → 0`);

        console.log('\n🎉 All plan management tests passed!');

        // 7. Show final organization state
        console.log('\n📋 Final Organization State:');
        const finalOrg = await Organization.findById(organization._id);
        console.log(JSON.stringify({
            name: finalOrg.name,
            plan: finalOrg.subscription?.plan,
            status: finalOrg.subscription?.status,
            trialEnd: finalOrg.subscription?.trialEnd,
            usage: finalOrg.usage
        }, null, 2));

    } catch (error) {
        console.error('❌ Test failed:', error);
        throw error;
    }
}

async function cleanup() {
    try {
        await mongoose.connection.close();
        console.log('\n✅ Database connection closed');
    } catch (error) {
        console.error('❌ Cleanup error:', error);
    }
}

// Run test
async function main() {
    console.log('🚀 Starting Plan Management Tests...');
    
    try {
        await connectDatabase();
        await testPlanManagement();
        console.log('\n✅ All tests completed successfully!');
    } catch (error) {
        console.error('\n❌ Tests failed:', error.message);
        process.exit(1);
    } finally {
        await cleanup();
    }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n🛑 Received SIGINT, shutting down gracefully...');
    await cleanup();
    process.exit(0);
});

if (require.main === module) {
    main();
}

module.exports = { testPlanManagement };