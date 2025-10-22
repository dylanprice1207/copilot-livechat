require('dotenv').config();
const mongoose = require('mongoose');
const database = require('./src/config/database');

// Import models
const Organization = require('./src/server/models/Organization');

async function testSubscriptionRestrictions() {
    try {
        console.log('🔒 Testing ConvoAI Branding Subscription Restrictions...');
        
        // Connect to database
        await database.connect();
        console.log('✅ Database connected');
        
        // Create test organizations with different plans
        const testOrgs = [
            {
                name: 'Free Plan Company',
                slug: 'test-free',
                subscription: { plan: 'free', status: 'active' }
            },
            {
                name: 'Professional Plan Company', 
                slug: 'test-pro',
                subscription: { plan: 'professional', status: 'active' }
            },
            {
                name: 'Inactive Company',
                slug: 'test-inactive',
                subscription: { plan: 'professional', status: 'inactive' }
            }
        ];
        
        for (const orgData of testOrgs) {
            // Remove existing test org
            await Organization.findOneAndDelete({ slug: orgData.slug });
            
            // Create new test org
            const org = new Organization({
                name: orgData.name,
                slug: orgData.slug,
                domain: `${orgData.slug}.local`,
                isActive: true,
                subscription: orgData.subscription
            });
            await org.save();
            console.log(`✅ Created ${orgData.name} (${orgData.subscription.plan})`);
        }
        
        console.log('\n🔗 Test URLs for Subscription Restrictions:');
        console.log('   Free Plan (Should be blocked):');
        console.log('     http://localhost:3000/test-free/brand-manager');
        console.log('     http://localhost:3000/api/branding/test-free/branding');
        console.log('   Professional Plan (Should work):');
        console.log('     http://localhost:3000/test-pro/brand-manager');
        console.log('     http://localhost:3000/api/branding/test-pro/branding');
        console.log('   Inactive Plan (Should be blocked):');
        console.log('     http://localhost:3000/test-inactive/brand-manager');
        console.log('     http://localhost:3000/api/branding/test-inactive/branding');
        
        console.log('\n🧪 Test API call for free plan:');
        console.log('curl http://localhost:3000/api/branding/test-free/branding');
        
        console.log('\n✅ Subscription restriction test setup completed!');
        
    } catch (error) {
        console.error('❌ Error setting up subscription tests:', error);
    } finally {
        process.exit(0);
    }
}

testSubscriptionRestrictions();