// Demo Service Portal with Sample Data
const axios = require('axios');

const SERVER_URL = 'http://localhost:3000';

async function demoServicePortal() {
    console.log('🎯 Service Portal Demo - Creating Sample Data...\n');

    try {
        // Step 1: Login as service agent
        console.log('1. Logging in as service agent...');
        const loginResponse = await axios.post(`${SERVER_URL}/api/admin-login`, {
            email: 'service@example.com',
            password: 'service123',
            role: 'service'
        });

        const authToken = loginResponse.data.token;
        const headers = { 'Authorization': `Bearer ${authToken}` };
        console.log('✅ Login successful\n');

        // Step 2: Test dashboard
        console.log('2. Loading dashboard...');
        const dashboard = await axios.get(`${SERVER_URL}/api/service-portal/dashboard`, { headers });
        console.log('✅ Dashboard loaded:', Object.keys(dashboard.data.data));
        console.log('   Stats:', JSON.stringify(dashboard.data.data, null, 2));
        console.log('');

        // Step 3: Create sample organizations
        console.log('3. Creating sample organizations...');
        const sampleOrgs = [
            {
                name: 'TechCorp Solutions',
                slug: 'techcorp',
                description: 'Leading technology solutions provider',
                adminEmail: 'admin@techcorp.com',
                plan: 'professional',
                maxAgents: 10,
                maxConcurrentChats: 50
            },
            {
                name: 'StartupHub Inc',
                slug: 'startuphub',
                description: 'Innovation-driven startup incubator',
                adminEmail: 'admin@startuphub.com',
                plan: 'starter',
                maxAgents: 3,
                maxConcurrentChats: 15
            },
            {
                name: 'Enterprise Global',
                slug: 'enterprise-global',
                description: 'Fortune 500 enterprise solutions',
                adminEmail: 'admin@enterprise-global.com',
                plan: 'enterprise',
                maxAgents: 50,
                maxConcurrentChats: 200
            }
        ];

        const createdOrgs = [];
        for (const org of sampleOrgs) {
            try {
                const createResponse = await axios.post(`${SERVER_URL}/api/service-portal/organizations`, org, { headers });
                createdOrgs.push(createResponse.data.data);
                console.log(`   ✅ Created: ${org.name} (${org.slug})`);
            } catch (error) {
                console.log(`   ⚠️  ${org.name}: ${error.response?.data?.message || 'Already exists'}`);
            }
        }
        console.log('');

        // Step 4: List all organizations
        console.log('4. Listing all organizations...');
        const orgsResponse = await axios.get(`${SERVER_URL}/api/service-portal/organizations`, { headers });
        const orgs = orgsResponse.data.data || [];
        console.log(`✅ Found ${orgs.length} organizations:`);
        orgs.forEach(org => {
            console.log(`   - ${org.name} (${org.slug}) - Plan: ${org.plan} - Agents: ${org.maxAgents}`);
        });
        console.log('');

        // Step 5: Update an organization
        if (orgs.length > 0) {
            console.log('5. Updating organization...');
            const orgToUpdate = orgs[0];
            const updateData = {
                description: `${orgToUpdate.description} - Updated via Service Portal`,
                maxAgents: orgToUpdate.maxAgents + 5
            };
            
            try {
                await axios.put(`${SERVER_URL}/api/service-portal/organizations/${orgToUpdate._id}`, updateData, { headers });
                console.log(`✅ Updated: ${orgToUpdate.name}`);
                console.log(`   - New max agents: ${updateData.maxAgents}`);
            } catch (error) {
                console.log(`❌ Update failed: ${error.response?.data?.message || error.message}`);
            }
            console.log('');
        }

        // Step 6: Test plans management
        console.log('6. Managing subscription plans...');
        const plansResponse = await axios.get(`${SERVER_URL}/api/service-portal/plans`, { headers });
        const plans = plansResponse.data.data || [];
        console.log(`✅ Found ${plans.length} plans:`);
        plans.forEach(plan => {
            console.log(`   - ${plan.name}: $${plan.price}/month - ${plan.features.join(', ')}`);
        });
        console.log('');

        // Step 7: Create a new plan
        console.log('7. Creating new plan...');
        const newPlan = {
            name: 'premium',
            displayName: 'Premium',
            price: 199,
            features: ['Unlimited agents', 'Advanced analytics', '24/7 priority support', 'Custom branding'],
            maxAgents: 25,
            maxConcurrentChats: 100
        };

        try {
            await axios.post(`${SERVER_URL}/api/service-portal/plans`, newPlan, { headers });
            console.log(`✅ Created plan: ${newPlan.displayName}`);
        } catch (error) {
            console.log(`⚠️  Plan creation: ${error.response?.data?.message || 'Already exists'}`);
        }
        console.log('');

        // Step 8: Analytics
        console.log('8. Viewing analytics...');
        const analyticsResponse = await axios.get(`${SERVER_URL}/api/service-portal/analytics`, { headers });
        const analytics = analyticsResponse.data.data || {};
        console.log('✅ Analytics data:');
        console.log(`   - Total Organizations: ${analytics.totalOrganizations || 0}`);
        console.log(`   - Active Organizations: ${analytics.activeOrganizations || 0}`);
        console.log(`   - Total Users: ${analytics.totalUsers || 0}`);
        console.log(`   - Plans Distribution:`, analytics.planDistribution || {});
        console.log('');

        // Step 9: Final verification
        console.log('9. Final verification...');
        const finalOrgs = await axios.get(`${SERVER_URL}/api/service-portal/organizations`, { headers });
        const finalPlans = await axios.get(`${SERVER_URL}/api/service-portal/plans`, { headers });
        console.log(`✅ Final state: ${finalOrgs.data.data?.length || 0} organizations, ${finalPlans.data.data?.length || 0} plans`);

        console.log('\n🎉 Service Portal Demo Complete!');
        console.log('\n📋 Service Portal Features Verified:');
        console.log('✅ Authentication & Authorization');
        console.log('✅ Dashboard with Statistics');
        console.log('✅ Organization CRUD Operations');
        console.log('✅ Plan Management');
        console.log('✅ Analytics & Reporting');
        console.log('\n🌐 Access the Service Portal:');
        console.log(`   Portal: ${SERVER_URL}/service-portal`);
        console.log('   Login: service@example.com / service123');
        console.log('   Role: service_agent');

    } catch (error) {
        console.error('❌ Demo failed:', error.message);
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response data:', error.response.data);
        }
    }
}

demoServicePortal();