#!/usr/bin/env node

// MongoDB Connection Test Script
// Run with: npm run test:db

require('dotenv').config();

const database = require('./src/config/database');
const knowledgeBase = require('./src/services/knowledgeBase');

async function testConnection() {
    console.log('🧪 Testing MongoDB Atlas Connection...');
    console.log('================================');
    
    try {
        // Test database connection
        console.log('📊 Connecting to MongoDB Atlas...');
        await database.connect();
        
        console.log('✅ Database connection successful!');
        console.log(`📋 Connection status: ${database.isHealthy() ? 'Healthy' : 'Unhealthy'}`);
        
        // Test knowledge base initialization
        console.log('\n📚 Testing Knowledge Base initialization...');
        const knowledgeInitialized = await knowledgeBase.initialize();
        
        if (knowledgeInitialized) {
            console.log('✅ Knowledge Base initialized successfully!');
            
            // Test knowledge search
            const searchResults = knowledgeBase.search('help');
            console.log(`📖 Knowledge Base search test: Found ${searchResults.length} results for "help"`);
            
            if (searchResults.length > 0) {
                console.log(`   First result: "${searchResults[0].question}"`);
            }
        } else {
            console.log('⚠️ Knowledge Base initialized with default data (database unavailable)');
        }
        
        // Show statistics
        const stats = knowledgeBase.getStats();
        console.log('\n📊 Knowledge Base Statistics:');
        console.log(`   Total entries: ${stats.totalEntries}`);
        console.log(`   Initialized: ${stats.isInitialized}`);
        console.log(`   Database healthy: ${stats.databaseHealthy}`);
        
        console.log('\n🎉 All tests passed successfully!');
        
    } catch (error) {
        console.error('\n❌ Connection test failed:');
        console.error(`   Error: ${error.message}`);
        console.error(`   Stack: ${error.stack}`);
        
        if (error.message.includes('SSL')) {
            console.log('\n💡 SSL/TLS troubleshooting tips:');
            console.log('   • Ensure your MongoDB Atlas cluster allows connections from your IP');
            console.log('   • Check that SSL/TLS is properly configured');
            console.log('   • Verify your connection string includes ssl=true');
        }
        
        if (error.message.includes('timeout')) {
            console.log('\n💡 Timeout troubleshooting tips:');
            console.log('   • Check your internet connection');
            console.log('   • Verify MongoDB Atlas cluster is running');
            console.log('   • Ensure firewall allows outbound connections on port 27017');
        }
        
        process.exit(1);
    } finally {
        // Cleanup
        await database.disconnect();
        console.log('\n👋 Connection closed');
    }
}

// Handle interruption
process.on('SIGINT', async () => {
    console.log('\n🛑 Test interrupted');
    await database.disconnect();
    process.exit(0);
});

// Run test
testConnection();