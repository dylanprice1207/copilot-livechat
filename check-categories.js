const mongoose = require('mongoose');
require('dotenv').config();
const Knowledge = require('./src/server/models/Knowledge');

async function checkCategories() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/copilot-chat');
        console.log('Connected to MongoDB');
        
        // Get category distribution
        const categoryStats = await Knowledge.aggregate([
            { $match: { 'metadata.isActive': true } },
            { $group: { _id: '$category', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);
        
        console.log('\n📊 Category Distribution:');
        categoryStats.forEach(stat => {
            console.log(`  ${stat._id}: ${stat.count} items`);
        });
        
        // Sample uploaded-documents items
        console.log('\n📋 Sample uploaded-documents items:');
        const uploadedItems = await Knowledge.find({ 
            category: 'uploaded-documents' 
        }).limit(5);
        
        uploadedItems.forEach(item => {
            console.log(`  - ID: ${item.id}`);
            console.log(`    Title: ${item.title}`);
            console.log(`    Source: ${item.source}`);
            console.log(`    Created: ${item.createdAt}`);
            console.log('');
        });
        
        await mongoose.disconnect();
        console.log('✅ Database check completed');
        
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

checkCategories();