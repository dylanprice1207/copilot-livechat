const mongoose = require('mongoose');
require('dotenv').config();
const Knowledge = require('./src/server/models/Knowledge');

async function recategorizeItems() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/copilot-chat');
        console.log('🔄 Connected to MongoDB for recategorization');
        
        // Get all uploaded-documents items with excel-flexible source
        const excelItems = await Knowledge.find({
            category: 'uploaded-documents',
            source: 'excel-flexible',
            'metadata.isActive': true
        });
        
        console.log(`📊 Found ${excelItems.length} Excel items to recategorize`);
        
        let updatedCount = 0;
        const categoryMapping = {};
        
        for (const item of excelItems) {
            let newCategory = 'general'; // default
            const title = item.title.toLowerCase();
            const content = item.content ? item.content.toLowerCase() : '';
            
            // Categorize based on content analysis
            if (title.includes('troubleshoot') || title.includes('not working') || 
                title.includes('problem') || title.includes('issue') || 
                title.includes('fix') || title.includes('repair') ||
                title.includes('not lighting') || title.includes('died') ||
                title.includes('no light') || title.includes('check') ||
                content.includes('troubleshoot') || content.includes('problem')) {
                newCategory = 'troubleshooting';
            } else if (title.includes('product') || title.includes('specification') || 
                      title.includes('feature') || title.includes('model') ||
                      title.includes('device') || title.includes('hub') ||
                      title.includes('switch') || title.includes('bulb') ||
                      content.includes('product') || content.includes('specification')) {
                newCategory = 'products';
            } else if (title.includes('setup') || title.includes('install') || 
                      title.includes('configure') || title.includes('connect') ||
                      title.includes('how to') || title.includes('guide') ||
                      content.includes('setup') || content.includes('install')) {
                newCategory = 'support';
            } else if (title.includes('company') || title.includes('about') || 
                      title.includes('contact') || title.includes('service') ||
                      content.includes('company') || content.includes('about')) {
                newCategory = 'company';
            }
            
            // Update the item if category changed
            if (newCategory !== item.category) {
                await Knowledge.findByIdAndUpdate(item._id, {
                    category: newCategory,
                    updatedAt: new Date()
                });
                
                updatedCount++;
                
                // Track category changes
                if (!categoryMapping[newCategory]) {
                    categoryMapping[newCategory] = 0;
                }
                categoryMapping[newCategory]++;
                
                console.log(`✅ Updated "${item.title.substring(0, 50)}..." → ${newCategory}`);
            }
        }
        
        console.log(`\n📊 Recategorization Results:`);
        console.log(`   📄 Total items processed: ${excelItems.length}`);
        console.log(`   ✅ Items updated: ${updatedCount}`);
        console.log(`   📂 New category distribution:`);
        Object.entries(categoryMapping).forEach(([category, count]) => {
            console.log(`      ${category}: ${count} items`);
        });
        
        // Show updated category stats
        console.log('\n📈 Updated Category Distribution:');
        const newStats = await Knowledge.aggregate([
            { $match: { 'metadata.isActive': true } },
            { $group: { _id: '$category', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);
        
        newStats.forEach(stat => {
            console.log(`   ${stat._id}: ${stat.count} items`);
        });
        
        await mongoose.disconnect();
        console.log('\n🎉 Recategorization completed successfully!');
        
    } catch (error) {
        console.error('❌ Recategorization failed:', error);
        process.exit(1);
    }
}

recategorizeItems();