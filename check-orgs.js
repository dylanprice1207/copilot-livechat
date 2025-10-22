require('dotenv').config();
const mongoose = require('mongoose');
const Organization = require('./src/server/models/Organization');
const database = require('./src/config/database');

async function checkOrganizations() {
    try {
        await database.connect();
        const orgs = await Organization.find({slug: {$in: ['test-free', 'test-pro']}}, 'name slug subscription');
        
        console.log('Organizations:');
        orgs.forEach(org => {
            const plan = org.subscription?.plan || 'none';
            const status = org.subscription?.status || 'none';
            console.log(`${org.slug}: ${plan} (${status})`);
        });
    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit(0);
    }
}

checkOrganizations();