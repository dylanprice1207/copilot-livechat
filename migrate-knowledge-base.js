#!/usr/bin/env node

/**
 * Migration script to move knowledge base from JSON files to MongoDB
 * Run this script to migrate existing file-based knowledge base to database
 */

const mongoose = require('mongoose');
const fs = require('fs').promises;
const path = require('path');
const Knowledge = require('./src/server/models/Knowledge');

// Connect to MongoDB
async function connectDB() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/copilot-chat');
        console.log('✅ Connected to MongoDB for migration');
    } catch (error) {
        console.error('❌ MongoDB connection failed:', error);
        process.exit(1);
    }
}

// Migrate knowledge base files to MongoDB
async function migrateKnowledgeBase() {
    const knowledgeBasePath = path.join(__dirname, './src/knowledge-base');
    
    try {
        // Check if knowledge base directory exists
        try {
            await fs.access(knowledgeBasePath);
        } catch (error) {
            console.log('📂 No knowledge base directory found, skipping migration');
            return { migrated: 0, errors: 0 };
        }
        
        // Get all JSON files in knowledge base directory
        const files = await fs.readdir(knowledgeBasePath);
        const jsonFiles = files.filter(file => file.endsWith('.json'));
        
        if (jsonFiles.length === 0) {
            console.log('📂 No knowledge base files found, skipping migration');
            return { migrated: 0, errors: 0 };
        }
        
        let migratedCount = 0;
        let errorCount = 0;
        
        console.log(`📚 Found ${jsonFiles.length} knowledge base files to migrate...`);
        
        // Clear existing knowledge base in database
        const existingCount = await Knowledge.countDocuments();
        if (existingCount > 0) {
            console.log(`🗑️ Clearing ${existingCount} existing knowledge items from database...`);
            await Knowledge.deleteMany({});
        }
        
        // Process each file
        for (const file of jsonFiles) {
            const filePath = path.join(knowledgeBasePath, file);
            const category = path.basename(file, '.json');
            
            try {
                console.log(`📄 Processing ${file}...`);
                const content = await fs.readFile(filePath, 'utf-8');
                const data = JSON.parse(content);
                
                if (data.items && Array.isArray(data.items)) {
                    // Migrate each item
                    for (const item of data.items) {
                        try {
                            // Create Knowledge document with enhanced schema
                            const knowledgeDoc = new Knowledge({
                                id: item.id || `migrated-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                                category: category,
                                title: item.title || 'Untitled',
                                content: item.content || '',
                                keywords: item.keywords || [],
                                answers: item.answers || [],
                                tags: item.tags || [],
                                priority: item.priority || 'medium',
                                source: item.source || 'manual',
                                fileName: item.fileName || null,
                                uploadDate: item.uploadDate ? new Date(item.uploadDate) : new Date(),
                                metadata: {
                                    fileSize: item.fileSize || null,
                                    originalFormat: item.originalFormat || null,
                                    processingMethod: item.processingMethod || 'migration',
                                    rowNumber: item.rowNumber || null,
                                    isActive: true
                                }
                            });
                            
                            await knowledgeDoc.save();
                            migratedCount++;
                            
                        } catch (itemError) {
                            console.error(`❌ Error migrating item ${item.id || 'unknown'}:`, itemError.message);
                            errorCount++;
                        }
                    }
                }
                
            } catch (fileError) {
                console.error(`❌ Error processing file ${file}:`, fileError.message);
                errorCount++;
            }
        }
        
        return { migrated: migratedCount, errors: errorCount, files: jsonFiles.length };
        
    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    }
}

// Backup existing files before migration
async function backupFiles() {
    const knowledgeBasePath = path.join(__dirname, './src/knowledge-base');
    const backupPath = path.join(__dirname, './src/knowledge-base-backup');
    
    try {
        // Check if knowledge base directory exists
        await fs.access(knowledgeBasePath);
        
        // Create backup directory
        try {
            await fs.access(backupPath);
        } catch {
            await fs.mkdir(backupPath, { recursive: true });
        }
        
        // Copy files to backup
        const files = await fs.readdir(knowledgeBasePath);
        for (const file of files) {
            if (file.endsWith('.json')) {
                const sourcePath = path.join(knowledgeBasePath, file);
                const backupFilePath = path.join(backupPath, `${file}.backup-${Date.now()}`);
                await fs.copyFile(sourcePath, backupFilePath);
            }
        }
        
        console.log(`💾 Created backup of ${files.filter(f => f.endsWith('.json')).length} files in knowledge-base-backup/`);
        
    } catch (error) {
        console.log('📂 No existing knowledge base files to backup');
    }
}

// Main migration function
async function migrate() {
    console.log('🚀 Starting Knowledge Base Migration to MongoDB...\n');
    
    try {
        // Load environment variables
        require('dotenv').config();
        
        // Connect to database
        await connectDB();
        
        // Backup existing files
        await backupFiles();
        
        // Perform migration
        const result = await migrateKnowledgeBase();
        
        console.log('\n📊 Migration Results:');
        console.log(`   📄 Files processed: ${result.files || 0}`);
        console.log(`   ✅ Items migrated: ${result.migrated}`);
        console.log(`   ❌ Errors: ${result.errors}`);
        
        if (result.migrated > 0) {
            console.log('\n🎉 Migration completed successfully!');
            console.log('💡 You can now delete the knowledge-base directory if everything works correctly');
        } else {
            console.log('\n⚠️ No items were migrated');
        }
        
    } catch (error) {
        console.error('\n❌ Migration failed:', error.message);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log('\n👋 Disconnected from MongoDB');
    }
}

// Run migration if called directly
if (require.main === module) {
    migrate().catch(console.error);
}

module.exports = { migrate, migrateKnowledgeBase, backupFiles };