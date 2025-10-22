const fs = require('fs').promises;
const path = require('path');
const XLSX = require('xlsx');
const mongoose = require('mongoose');

class KnowledgeBaseService {
    constructor() {
        this.knowledgeBase = new Map();
        this.categories = new Map();
        this.searchIndex = new Map();
        this.isLoaded = false;
        this.isInitialized = false;
        this.initializationRetries = 0;
        this.maxRetries = 3;
        this.Knowledge = null;
        this.knowledgeBasePath = path.join(__dirname, '../../knowledge-base');
    }

    // Safe model initialization
    async initializeModel() {
        try {
            if (!this.Knowledge) {
                try {
                    this.Knowledge = mongoose.model('Knowledge');
                    console.log('✅ ConvoAI KnowledgeBase: Using existing Knowledge model');
                } catch (error) {
                    this.Knowledge = require('../models/Knowledge');
                    console.log('✅ ConvoAI KnowledgeBase: Loaded Knowledge model');
                }
            }
            return true;
        } catch (error) {
            console.error('❌ ConvoAI KnowledgeBase: Model initialization failed:', error.message);
            return false;
        }
    }

    /**
     * Initialize knowledge base by loading all content from MongoDB
     */
    async initialize() {
        try {
            console.log('📚 ConvoAI: Initializing Knowledge Base Service...');

            // Initialize model safely
            const modelInitialized = await this.initializeModel();
            if (!modelInitialized) {
                throw new Error('Failed to initialize Knowledge model');
            }

            // Check database connection
            if (mongoose.connection.readyState !== 1) {
                console.log('⚠️ ConvoAI KnowledgeBase: Database not connected, using default knowledge');
                this.initializeDefaultKnowledge();
                return true;
            }

            // Load knowledge from database with timeout
            const knowledge = await Promise.race([
                this.loadKnowledgeBaseFromFiles(),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Knowledge base load timeout')), 15000)
                )
            ]);

            // Build search index
            this.buildSearchIndex();
            
            this.isLoaded = true;
            this.isInitialized = true;
            this.initializationRetries = 0;
            
            console.log(`✅ ConvoAI KnowledgeBase: Initialized with ${this.knowledgeBase.size} entries`);
            return true;
            
        } catch (error) {
            this.initializationRetries++;
            console.error(`❌ ConvoAI KnowledgeBase: Initialization attempt ${this.initializationRetries} failed:`, error.message);
            
            if (this.initializationRetries < this.maxRetries) {
                const delay = 5000 * this.initializationRetries;
                console.log(`⏳ ConvoAI KnowledgeBase: Retrying initialization in ${delay}ms...`);
                
                await new Promise(resolve => setTimeout(resolve, delay));
                return this.initialize();
            } else {
                console.log('💥 ConvoAI KnowledgeBase: Max retries reached, using default knowledge');
                this.initializeDefaultKnowledge();
                return false;
            }
        }
    }

    /**
     * Load knowledge base for a specific organization from MongoDB
     */
    async loadKnowledgeBaseForOrganization(organizationId) {
        try {
            if (!this.Knowledge) {
                throw new Error('Knowledge model not initialized');
            }

            console.log(`📖 ConvoAI: Loading knowledge base for organization ${organizationId}...`);
            
            // Load active knowledge items for specific organization
            const query = { 
                'metadata.isActive': true,
                $or: [
                    { organizationId: organizationId },
                    { organizationId: null } // Include global knowledge
                ]
            };
            
            const items = await this.Knowledge.find(query)
                .select('category title content keywords answers tags priority source fileName uploadDate organizationId')
                .sort({ category: 1, priority: 1, createdAt: -1 })
                .lean()
                .exec();
            
            console.log(`📚 ConvoAI: Loaded ${items.length} knowledge entries for organization ${organizationId}`);
            
            // Process items for return
            const knowledgeMap = new Map();
            const categoryMap = new Map();
            
            // Load items into organization-specific structure
            for (const item of items) {
                knowledgeMap.set(item._id.toString(), {
                    id: item._id.toString(),
                    category: item.category,
                    title: item.title,
                    content: item.content,
                    keywords: item.keywords,
                    answers: item.answers,
                    tags: item.tags,
                    priority: item.priority,
                    source: item.source,
                    fileName: item.fileName,
                    uploadDate: item.uploadDate,
                    organizationId: item.organizationId,
                    createdAt: item.createdAt,
                    updatedAt: item.updatedAt
                });
                
                // Update category counts
                if (!categoryMap.has(item.category)) {
                    categoryMap.set(item.category, {
                        name: item.category,
                        count: 0,
                        lastUpdated: item.updatedAt
                    });
                }
                const categoryData = categoryMap.get(item.category);
                categoryData.count++;
                if (item.updatedAt > categoryData.lastUpdated) {
                    categoryData.lastUpdated = item.updatedAt;
                }
            }
            
            return {
                knowledge: knowledgeMap,
                categories: categoryMap,
                totalEntries: items.length
            };
            
        } catch (error) {
            console.error(`❌ Error loading knowledge base for organization ${organizationId}:`, error);
            throw error;
        }
    }

    /**
     * Fallback to file-based system if MongoDB fails
     */
    async fallbackToFileSystem() {
        try {
            console.log('⚠️ Falling back to file-based knowledge system...');
            
            // Ensure knowledge base directory exists
            await this.ensureDirectoryExists(this.knowledgeBasePath);
            
            // Load from files using original method
            await this.loadKnowledgeBaseFromFiles();
            
            this.isLoaded = true;
            console.log(`✅ Fallback: Knowledge Base loaded with ${this.knowledgeBase.size} entries from files`);
            
        } catch (error) {
            console.error('❌ Fallback to file system also failed:', error);
            this.isLoaded = false;
        }
    }

    /**
     * Load knowledge base from files (fallback method)
     */
    async loadKnowledgeBaseFromFiles() {
        try {
            const files = await fs.readdir(this.knowledgeBasePath);
            
            for (const file of files) {
                if (file.endsWith('.json')) {
                    const filePath = path.join(this.knowledgeBasePath, file);
                    const content = await fs.readFile(filePath, 'utf-8');
                    const data = JSON.parse(content);
                    
                    // Store category information
                    this.categories.set(data.category, {
                        name: data.category,
                        count: 0,
                        lastUpdated: new Date()
                    });
                    
                    // Store each knowledge item
                    if (data.items) {
                        for (const item of data.items) {
                            this.knowledgeBase.set(item.id, {
                                ...item,
                                category: data.category,
                                source: file
                            });
                            this.categories.get(data.category).count++;
                        }
                    }
                }
            }
        } catch (error) {
            console.error('❌ Error loading knowledge base from files:', error);
        }
    }

    /**
     * Ensure directory exists
     */
    async ensureDirectoryExists(dirPath) {
        try {
            await fs.access(dirPath);
        } catch (error) {
            console.log('📁 Creating knowledge base directory...');
            await fs.mkdir(dirPath, { recursive: true });
            
            // Create default knowledge base files
            await this.createDefaultKnowledgeBase();
        }
    }

    /**
     * Create default knowledge base with example content
     */
    async createDefaultKnowledgeBase() {
        const defaultKnowledge = {
            'company.json': {
                category: 'company',
                items: []
            },
            'products.json': {
                category: 'products',
                items: []
            }
        };

        for (const [filename, data] of Object.entries(defaultKnowledge)) {
            const filePath = path.join(this.knowledgeBasePath, filename);
            await fs.writeFile(filePath, JSON.stringify(data, null, 2));
            console.log(`📝 Created default knowledge file: ${filename}`);
        }
    }

    /**
     * Initialize default knowledge when database is not available
     */
    initializeDefaultKnowledge() {
        console.log('📝 ConvoAI: Initializing default knowledge base...');
        
        const defaultKnowledge = [
            {
                id: 'default-1',
                category: 'general',
                title: 'Welcome to ConvoAI',
                content: "How can I help you?",
                keywords: ["help", "assist", "support", "start"],
                answers: ["I'm ConvoAI, your intelligent chat assistant! I can help you with questions about our services, provide support, and assist with various inquiries. What would you like to know?"],
                tags: ["welcome", "greeting"],
                priority: 1,
                source: 'default'
            },
            {
                id: 'default-2',
                category: 'general',
                title: 'Business Hours',
                content: "What are your business hours?",
                keywords: ["hours", "time", "open", "closed", "schedule"],
                answers: ["Our business hours are Monday to Friday, 9 AM to 6 PM EST. However, our ConvoAI chat support is available 24/7 to assist you!"],
                tags: ["hours", "schedule"],
                priority: 2,
                source: 'default'
            },
            {
                id: 'default-3',
                category: 'support',
                title: 'Contact Support',
                content: "How do I contact support?",
                keywords: ["contact", "support", "help", "phone", "email"],
                answers: ["You can contact our support team through this live chat system, email us at support@convoai.space, or call us during business hours. Our ConvoAI assistant is here to help 24/7!"],
                tags: ["contact", "support"],
                priority: 1,
                source: 'default'
            },
            {
                id: 'default-4',
                category: 'product',
                title: 'About ConvoAI',
                content: "What is ConvoAI?",
                keywords: ["convoai", "about", "what", "system", "ai"],
                answers: ["ConvoAI is an advanced live chat system that provides intelligent, real-time customer support. It combines AI-powered responses with human agent capabilities to deliver exceptional customer service experiences."],
                tags: ["product", "about"],
                priority: 2,
                source: 'default'
            },
            {
                id: 'default-5',
                category: 'technical',
                title: 'How Live Chat Works',
                content: "How does the live chat work?",
                keywords: ["chat", "live", "work", "how", "function"],
                answers: ["Our live chat system connects you instantly with support. You can type your questions, and our ConvoAI system will provide immediate responses. For complex issues, you'll be connected to a human agent."],
                tags: ["chat", "technical"],
                priority: 2,
                source: 'default'
            }
        ];
        
        // Clear and populate knowledge base
        this.knowledgeBase.clear();
        this.categories.clear();
        
        for (const item of defaultKnowledge) {
            this.knowledgeBase.set(item.id, item);
            
            // Update category count
            if (!this.categories.has(item.category)) {
                this.categories.set(item.category, { name: item.category, count: 0 });
            }
            this.categories.get(item.category).count++;
        }
        
        // Build search index
        this.buildSearchIndex();
        
        this.isLoaded = true;
        this.isInitialized = true;
        
        console.log(`✅ ConvoAI: Default knowledge base initialized with ${defaultKnowledge.length} entries`);
    }

    /**
     * Build search index for fast lookups
     */
    buildSearchIndex() {
        this.searchIndex.clear();
        
        for (const [id, item] of this.knowledgeBase) {
            // Index all keywords
            if (item.keywords) {
                for (const keyword of item.keywords) {
                    if (!this.searchIndex.has(keyword.toLowerCase())) {
                        this.searchIndex.set(keyword.toLowerCase(), []);
                    }
                    this.searchIndex.get(keyword.toLowerCase()).push(id);
                }
            }
            
            // Index title words
            if (item.title) {
                const titleWords = item.title.toLowerCase().split(/\s+/);
                for (const word of titleWords) {
                    if (word.length > 2) {
                        if (!this.searchIndex.has(word)) {
                            this.searchIndex.set(word, []);
                        }
                        this.searchIndex.get(word).push(id);
                    }
                }
            }
        }
    }

    /**
     * Add knowledge item (organization-aware)
     */
    async addKnowledge(category, item, organizationId, createdBy = null) {
        try {
            // Check storage quota first
            const quotaCheck = await this.checkStorageQuota(organizationId, item.fileSize ? (item.fileSize / (1024 * 1024)) : 0);
            
            if (!quotaCheck.allowed) {
                return {
                    success: false,
                    reason: quotaCheck.reason,
                    message: quotaCheck.message,
                    quotaInfo: quotaCheck
                };
            }

            if (!this.Knowledge) {
                await this.initializeModel();
            }

            // Create MongoDB document with organization context
            const knowledgeDoc = new this.Knowledge({
                id: item.id,
                category: category,
                title: item.title,
                content: item.content,
                keywords: item.keywords || [],
                answers: item.answers || [],
                tags: item.tags || [],
                priority: item.priority || 'medium',
                source: item.source || 'manual',
                fileName: item.fileName || null,
                uploadDate: item.uploadDate || new Date(),
                organizationId: organizationId,  // Set organization context
                createdBy: createdBy,
                metadata: {
                    fileSize: item.fileSize || null,
                    originalFormat: item.originalFormat || null,
                    processingMethod: item.processingMethod || null,
                    rowNumber: item.rowNumber || null,
                    isActive: true
                }
            });
            
            // Save to database (upsert if exists within organization)
            await this.Knowledge.findOneAndUpdate(
                { 
                    id: item.id,
                    organizationId: organizationId  // Scope to organization
                },
                knowledgeDoc.toObject(),
                { upsert: true, new: true }
            );
            
            console.log(`✅ Added knowledge item: ${item.id} for organization ${organizationId}`);
            
            return {
                success: true,
                message: 'Knowledge item added successfully',
                item: {
                    id: item.id,
                    category: category,
                    title: item.title,
                    organizationId: organizationId
                },
                quotaInfo: quotaCheck
            };
            
        } catch (error) {
            console.error('❌ Error adding knowledge to MongoDB:', error);
            return {
                success: false,
                message: 'Failed to add knowledge item',
                error: error.message
            };
        }
    }

    /**
     * Delete knowledge item from MongoDB
     */
    async deleteKnowledge(itemId) {
        try {
            // Find the item in memory
            const item = this.knowledgeBase.get(itemId);
            if (!item) {
                return {
                    success: false,
                    message: 'Knowledge item not found'
                };
            }

            const category = item.category;
            
            try {
                // Soft delete in MongoDB (mark as inactive)
                const result = await Knowledge.findOneAndUpdate(
                    { id: itemId },
                    { 'metadata.isActive': false, updatedAt: new Date() },
                    { new: true }
                );
                
                if (!result) {
                    console.log(`⚠️ Knowledge item ${itemId} not found in database, removing from memory only`);
                }
                
            } catch (dbError) {
                console.error('❌ Error deleting from database:', dbError);
                // Continue with file-based deletion as fallback
                await this.deleteFromFile(itemId, category);
            }
            
            // Remove from memory
            this.knowledgeBase.delete(itemId);
            
            // Update category count
            if (this.categories.has(category)) {
                const categoryData = this.categories.get(category);
                categoryData.count = Math.max(0, categoryData.count - 1);
                categoryData.lastUpdated = new Date();
            }
            
            // Rebuild search index
            this.buildSearchIndex();
            
            console.log(`✅ Deleted knowledge item: ${itemId}`);
            return {
                success: true,
                message: 'Knowledge item deleted successfully'
            };
                
        } catch (error) {
            console.error('❌ Error deleting knowledge item:', error);
            return {
                success: false,
                message: 'Failed to delete knowledge item'
            };
        }
    }

    /**
     * Add knowledge item to file (fallback method)
     */
    async addKnowledgeToFile(category, item) {
        try {
            const filename = `${category}.json`;
            const filePath = path.join(this.knowledgeBasePath, filename);
            
            let data = { category, items: [] };
            try {
                const content = await fs.readFile(filePath, 'utf-8');
                data = JSON.parse(content);
            } catch (error) {
                // File doesn't exist, create new
            }
            
            // Add or update item
            const existingIndex = data.items.findIndex(i => i.id === item.id);
            if (existingIndex >= 0) {
                data.items[existingIndex] = item;
            } else {
                data.items.push(item);
            }
            
            await fs.writeFile(filePath, JSON.stringify(data, null, 2));
            console.log(`✅ Added knowledge item to file: ${item.id}`);
            return true;
            
        } catch (error) {
            console.error('❌ Error adding knowledge to file:', error);
            return false;
        }
    }

    /**
     * Delete knowledge item from file (fallback method)
     */
    async deleteFromFile(itemId, category) {
        try {
            const filename = `${category}.json`;
            const filePath = path.join(this.knowledgeBasePath, filename);
            
            try {
                await fs.access(filePath);
            } catch (accessError) {
                console.log(`⚠️ File ${filename} doesn't exist, item was only in memory`);
                return true;
            }

            const content = await fs.readFile(filePath, 'utf-8');
            const data = JSON.parse(content);
            
            // Remove item from array
            data.items = data.items.filter(i => i.id !== itemId);
            
            // Write back to file
            await fs.writeFile(filePath, JSON.stringify(data, null, 2));
            return true;
            
        } catch (error) {
            console.error('❌ Error deleting from file:', error);
            return false;
        }
    }

    /**
     * Search knowledge base for specific organization
     */
    async searchKnowledge(query, organizationId, category = null, limit = 5) {
        try {
            if (!this.Knowledge) {
                await this.initializeModel();
            }

            console.log(`🔍 ConvoAI: Searching knowledge for organization ${organizationId}, query: "${query}"`);
            
            // Use the Knowledge model's searchKnowledge static method
            const results = await this.Knowledge.searchKnowledge(query, category, limit, organizationId);
            
            // Convert to the expected format
            const formattedResults = results.map(item => ({
                id: item._id.toString(),
                category: item.category,
                title: item.title,
                content: item.content,
                keywords: item.keywords,
                answers: item.answers,
                tags: item.tags,
                priority: item.priority,
                source: item.source,
                fileName: item.fileName,
                organizationId: item.organizationId
            }));

            console.log(`📝 ConvoAI: Found ${formattedResults.length} knowledge entries for query`);
            return formattedResults;

        } catch (error) {
            console.error('❌ Error searching knowledge base:', error);
            return [{
                id: 'error-1',
                category: 'system',
                title: 'Search Error',
                content: 'Error occurred while searching',
                answers: ["I apologize, but I encountered an error while searching the knowledge base. Please try again."],
                priority: 1,
                source: 'system'
            }];
        }
    }

    /**
     * Get context for AI responses (organization-aware)
     */
    async getContextForMessage(message, organizationId, department = null) {
        const results = await this.searchKnowledge(message, organizationId, department, 3);
        
        if (results.length === 0) {
            return "";
        }

        let context = "\n\nKnowledge Base Context:\n";
        for (const item of results) {
            context += `\n- ${item.title}: ${item.content}`;
            if (item.answers && item.answers.length > 0) {
                context += `\n  Quick answers: ${item.answers.join('; ')}`;
            }
        }
        context += "\n";

        return context;
    }

    /**
     * Get all categories for organization
     */
    async getCategories(organizationId) {
        try {
            if (!this.Knowledge) {
                await this.initializeModel();
            }

            const query = { 
                'metadata.isActive': true,
                $or: [
                    { organizationId: organizationId },
                    { organizationId: null } // Include global knowledge
                ]
            };

            const categories = await this.Knowledge.distinct('category', query);
            return categories.filter(cat => cat); // Remove any null/empty categories
        } catch (error) {
            console.error('❌ Error getting categories:', error);
            return [];
        }
    }

    /**
     * Get items by category for organization
     */
    async getItemsByCategory(category, organizationId) {
        try {
            if (!this.Knowledge) {
                await this.initializeModel();
            }

            const results = await this.Knowledge.findByCategory(category, organizationId);
            
            return results.map(item => ({
                id: item._id.toString(),
                category: item.category,
                title: item.title,
                content: item.content,
                keywords: item.keywords,
                answers: item.answers,
                tags: item.tags,
                priority: item.priority,
                source: item.source,
                fileName: item.fileName,
                organizationId: item.organizationId
            }));
        } catch (error) {
            console.error('❌ Error getting items by category:', error);
            return [];
        }
    }

    /**
     * Get statistics for organization
     */
    async getStats(organizationId) {
        try {
            if (!this.Knowledge) {
                await this.initializeModel();
            }

            const query = { 
                'metadata.isActive': true,
                $or: [
                    { organizationId: organizationId },
                    { organizationId: null } // Include global knowledge
                ]
            };

            // Get total count
            const totalItems = await this.Knowledge.countDocuments(query);

            // Get category counts
            const categoryPipeline = [
                { $match: query },
                { $group: { _id: '$category', count: { $sum: 1 } } },
                { $sort: { _id: 1 } }
            ];
            
            const categoryStats = await this.Knowledge.aggregate(categoryPipeline);
            const categoryCounts = {};
            categoryStats.forEach(stat => {
                if (stat._id) {
                    categoryCounts[stat._id] = stat.count;
                }
            });

            // Get last updated
            const lastItem = await this.Knowledge.findOne(query, {}, { sort: { updatedAt: -1 } });

            return {
                totalItems: totalItems,
                categories: Object.keys(categoryCounts).length,
                categoryCounts: categoryCounts,
                isLoaded: totalItems > 0,
                lastUpdated: lastItem ? lastItem.updatedAt.getTime() : Date.now(),
                organizationId: organizationId
            };
        } catch (error) {
            console.error('❌ Error getting stats:', error);
            return {
                totalItems: 0,
                categories: 0,
                categoryCounts: {},
                isLoaded: false,
                lastUpdated: Date.now(),
                organizationId: organizationId
            };
        }
    }

    /**
     * Get knowledge storage limits based on organization subscription
     */
    getStorageLimits(subscriptionPlan) {
        const limits = {
            free: {
                maxEntries: 50,
                maxFileSizeMB: 5,
                maxTotalSizeMB: 25
            },
            professional: {
                maxEntries: 1000,
                maxFileSizeMB: 25,
                maxTotalSizeMB: 500
            },
            enterprise: {
                maxEntries: -1, // Unlimited
                maxFileSizeMB: 100,
                maxTotalSizeMB: -1 // Unlimited
            }
        };

        return limits[subscriptionPlan] || limits.free;
    }

    /**
     * Check if organization can add new knowledge entry
     */
    async checkStorageQuota(organizationId, newFileSizeMB = 0) {
        try {
            // Get organization subscription
            const Organization = require('../models/Organization');
            const org = await Organization.findById(organizationId);
            
            if (!org) {
                throw new Error('Organization not found');
            }

            const subscriptionPlan = org.subscription?.plan || 'free';
            const limits = this.getStorageLimits(subscriptionPlan);

            // Get current usage
            const stats = await this.getStats(organizationId);
            
            // Check entry count limit
            if (limits.maxEntries !== -1 && stats.totalItems >= limits.maxEntries) {
                return {
                    allowed: false,
                    reason: 'entry_limit_exceeded',
                    message: `Knowledge base entry limit reached (${limits.maxEntries} entries max for ${subscriptionPlan} plan)`,
                    currentUsage: stats.totalItems,
                    limit: limits.maxEntries,
                    plan: subscriptionPlan
                };
            }

            // Check file size limit
            if (newFileSizeMB > limits.maxFileSizeMB) {
                return {
                    allowed: false,
                    reason: 'file_size_exceeded',
                    message: `File size exceeds limit (${limits.maxFileSizeMB}MB max for ${subscriptionPlan} plan)`,
                    fileSize: newFileSizeMB,
                    limit: limits.maxFileSizeMB,
                    plan: subscriptionPlan
                };
            }

            // Get total storage usage
            const totalSizeQuery = { 
                'metadata.isActive': true,
                organizationId: organizationId
            };
            
            const sizeAggregation = await this.Knowledge.aggregate([
                { $match: totalSizeQuery },
                { $group: { _id: null, totalSize: { $sum: '$metadata.fileSize' } } }
            ]);

            const currentTotalSizeMB = sizeAggregation.length > 0 
                ? (sizeAggregation[0].totalSize || 0) / (1024 * 1024)
                : 0;

            // Check total storage limit
            if (limits.maxTotalSizeMB !== -1 && (currentTotalSizeMB + newFileSizeMB) > limits.maxTotalSizeMB) {
                return {
                    allowed: false,
                    reason: 'storage_limit_exceeded',
                    message: `Storage limit exceeded (${limits.maxTotalSizeMB}MB max for ${subscriptionPlan} plan)`,
                    currentUsage: Math.round(currentTotalSizeMB * 100) / 100,
                    limit: limits.maxTotalSizeMB,
                    plan: subscriptionPlan
                };
            }

            return {
                allowed: true,
                plan: subscriptionPlan,
                limits: limits,
                usage: {
                    entries: stats.totalItems,
                    totalSizeMB: Math.round(currentTotalSizeMB * 100) / 100
                }
            };

        } catch (error) {
            console.error('❌ Error checking storage quota:', error);
            return {
                allowed: false,
                reason: 'quota_check_error',
                message: 'Unable to verify storage quota',
                error: error.message
            };
        }
    }

    /**
     * Get storage usage summary for organization
     */
    async getStorageUsage(organizationId) {
        try {
            const Organization = require('../models/Organization');
            const org = await Organization.findById(organizationId);
            
            const subscriptionPlan = org?.subscription?.plan || 'free';
            const limits = this.getStorageLimits(subscriptionPlan);
            const stats = await this.getStats(organizationId);

            // Get storage size
            const totalSizeQuery = { 
                'metadata.isActive': true,
                organizationId: organizationId
            };
            
            const sizeAggregation = await this.Knowledge.aggregate([
                { $match: totalSizeQuery },
                { $group: { _id: null, totalSize: { $sum: '$metadata.fileSize' } } }
            ]);

            const currentTotalSizeMB = sizeAggregation.length > 0 
                ? (sizeAggregation[0].totalSize || 0) / (1024 * 1024)
                : 0;

            return {
                plan: subscriptionPlan,
                limits: limits,
                usage: {
                    entries: {
                        current: stats.totalItems,
                        limit: limits.maxEntries,
                        percentage: limits.maxEntries === -1 ? 0 : Math.round((stats.totalItems / limits.maxEntries) * 100)
                    },
                    storage: {
                        currentMB: Math.round(currentTotalSizeMB * 100) / 100,
                        limitMB: limits.maxTotalSizeMB,
                        percentage: limits.maxTotalSizeMB === -1 ? 0 : Math.round((currentTotalSizeMB / limits.maxTotalSizeMB) * 100)
                    }
                },
                warnings: this.getStorageWarnings(stats.totalItems, currentTotalSizeMB, limits)
            };

        } catch (error) {
            console.error('❌ Error getting storage usage:', error);
            return null;
        }
    }

    /**
     * Generate storage warnings
     */
    getStorageWarnings(currentEntries, currentSizeMB, limits) {
        const warnings = [];

        // Check entry limit warnings
        if (limits.maxEntries !== -1) {
            const entryPercentage = (currentEntries / limits.maxEntries) * 100;
            if (entryPercentage >= 90) {
                warnings.push({
                    type: 'entry_limit_critical',
                    message: `Knowledge base entries critically low: ${currentEntries}/${limits.maxEntries} (${Math.round(entryPercentage)}%)`
                });
            } else if (entryPercentage >= 80) {
                warnings.push({
                    type: 'entry_limit_warning',
                    message: `Knowledge base entries getting full: ${currentEntries}/${limits.maxEntries} (${Math.round(entryPercentage)}%)`
                });
            }
        }

        // Check storage limit warnings
        if (limits.maxTotalSizeMB !== -1) {
            const storagePercentage = (currentSizeMB / limits.maxTotalSizeMB) * 100;
            if (storagePercentage >= 90) {
                warnings.push({
                    type: 'storage_limit_critical',
                    message: `Knowledge base storage critically low: ${Math.round(currentSizeMB)}MB/${limits.maxTotalSizeMB}MB (${Math.round(storagePercentage)}%)`
                });
            } else if (storagePercentage >= 80) {
                warnings.push({
                    type: 'storage_limit_warning',
                    message: `Knowledge base storage getting full: ${Math.round(currentSizeMB)}MB/${limits.maxTotalSizeMB}MB (${Math.round(storagePercentage)}%)`
                });
            }
        }

        return warnings;
    }

    /**
     * Rename category (not implemented for MongoDB yet)
     */
    async renameCategory(oldName, newName) {
        try {
            // Update all items in the category
            await Knowledge.updateMany(
                { category: oldName },
                { category: newName, updatedAt: new Date() }
            );

            // Reload knowledge base to reflect changes
            await this.loadKnowledgeBaseFromFiles();
            this.buildSearchIndex();

            return {
                success: true,
                message: `Category renamed from ${oldName} to ${newName}`
            };
        } catch (error) {
            console.error('❌ Error renaming category:', error);
            return {
                success: false,
                message: 'Failed to rename category'
            };
        }
    }

    /**
     * Process uploaded files
     */
    async processUploadedFiles(files, category) {
        const results = {
            successCount: 0,
            failureCount: 0,
            processedFiles: [],
            errors: []
        };

        // Process each file
        for (const file of files) {
            try {
                // Check if it's an Excel file
                if (file.mimetype === 'application/vnd.ms-excel' || 
                    file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
                    
                    console.log(`📊 Processing Excel file: ${file.originalname}`);
                    // For Excel files, don't use the upload category - let Excel content determine categories
                    const excelResults = await this.processExcelTemplate(file.path, null);
                    
                    if (excelResults.success) {
                        results.successCount += excelResults.processedCount;
                        results.processedFiles.push({
                            fileName: file.originalname,
                            title: `Excel File - ${excelResults.processedCount} Items Created`,
                            contentLength: excelResults.processedCount,
                            id: `excel-batch-${Date.now()}`,
                            details: excelResults.itemDetails || []
                        });
                    } else {
                        // Basic Excel processing fallback
                        const content = this.processExcelContent(file.path);
                        const knowledgeItem = {
                            id: `excel-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                            title: path.basename(file.originalname, path.extname(file.originalname)),
                            content: content.trim(),
                            keywords: this.extractKeywords(content),
                            answers: this.extractQuickAnswers(content),
                            tags: ['file-upload', 'excel'],
                            uploadDate: new Date().toISOString(),
                            fileName: file.originalname
                        };
                        
                        await this.addKnowledge(category, knowledgeItem);
                        results.successCount++;
                        results.processedFiles.push({
                            fileName: file.originalname,
                            title: knowledgeItem.title,
                            contentLength: content.length,
                            id: knowledgeItem.id
                        });
                    }
                } else {
                    // Regular file processing
                    let content = '';
                    let title = path.basename(file.originalname, path.extname(file.originalname));

                    if (file.mimetype === 'text/plain' || file.mimetype === 'text/markdown') {
                        content = await fs.readFile(file.path, 'utf-8');
                    } else {
                        content = `File: ${file.originalname}\nSize: ${file.size} bytes\nType: ${file.mimetype}`;
                    }

                    const knowledgeItem = {
                        id: `${category}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                        title: title,
                        content: content.trim(),
                        keywords: this.extractKeywords(content),
                        answers: this.extractQuickAnswers(content),
                        tags: ['file-upload'],
                        uploadDate: new Date().toISOString(),
                        fileName: file.originalname
                    };
                    
                    await this.addKnowledge(category, knowledgeItem);
                    results.successCount++;
                    results.processedFiles.push({
                        fileName: file.originalname,
                        title: knowledgeItem.title,
                        contentLength: content.length,
                        id: knowledgeItem.id
                    });
                }

                // Clean up uploaded file
                try {
                    await fs.unlink(file.path);
                } catch (unlinkError) {
                    console.warn('Could not delete uploaded file:', unlinkError);
                }
                
            } catch (error) {
                console.error(`❌ Error processing file ${file.originalname}:`, error);
                results.errors.push({
                    fileName: file.originalname,
                    error: error.message
                });
                results.failureCount++;
            }
        }

        return results;
    }

    /**
     * Process Excel template (simplified for now)
     */
    async processExcelTemplate(filePath, category) {
        try {
            const ExcelTemplateService = require('./ExcelTemplateService');
            const validation = await ExcelTemplateService.validateTemplate(filePath);
            
            if (!validation.valid) {
                return { success: false, error: validation.error };
            }

            let processedCount = 0;
            const itemDetails = [];
            
            for (const item of validation.data) {
                const uniqueId = `${item.category}-${Date.now()}-${processedCount}-${Math.random().toString(36).substr(2, 9)}`;
                const knowledgeItem = {
                    ...item,
                    id: uniqueId,
                    uploadDate: new Date().toISOString(),
                    source: 'excel-template'
                };
                
                await this.addKnowledge(item.category, knowledgeItem);
                processedCount++;
                
                itemDetails.push({
                    id: uniqueId,
                    title: item.title,
                    category: item.category,
                    rowNumber: processedCount
                });
            }

            return {
                success: true,
                processedCount,
                itemDetails,
                message: `${processedCount} items created from Excel template`
            };
            
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Process Excel content
     */
    processExcelContent(filePath) {
        try {
            const workbook = XLSX.readFile(filePath);
            let result = `Excel Document with ${workbook.SheetNames.length} sheet(s):\n\n`;
            
            workbook.SheetNames.forEach((sheetName, index) => {
                result += `=== Sheet ${index + 1}: ${sheetName} ===\n\n`;
                const worksheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                
                if (jsonData.length === 0) {
                    result += "Sheet is empty\n\n";
                    return;
                }

                // Show headers
                if (jsonData[0]) {
                    result += `Headers: ${jsonData[0].join(', ')}\n\n`;
                }

                // Show first few data rows
                for (let i = 1; i < Math.min(jsonData.length, 6); i++) {
                    if (jsonData[i] && jsonData[i].length > 0) {
                        result += `Row ${i}: ${jsonData[i].join(' | ')}\n`;
                    }
                }

                if (jsonData.length > 6) {
                    result += `... and ${jsonData.length - 6} more rows\n`;
                }
                result += '\n';
            });

            return result;
        } catch (error) {
            console.error('Error processing Excel:', error);
            return `Error processing Excel file: ${error.message}`;
        }
    }

    /**
     * Extract keywords from content
     */
    extractKeywords(content) {
        const words = content.toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .split(/\s+/)
            .filter(word => word.length > 3)
            .filter(word => !['this', 'that', 'with', 'from', 'they', 'were', 'been', 'have'].includes(word));

        const wordFreq = {};
        words.forEach(word => {
            wordFreq[word] = (wordFreq[word] || 0) + 1;
        });

        return Object.entries(wordFreq)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10)
            .map(([word]) => word);
    }

    /**
     * Extract quick answers from content
     */
    extractQuickAnswers(content) {
        const sentences = content.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 10);
        const actionWords = ['how', 'what', 'when', 'where', 'why', 'can', 'should', 'will', 'to'];
        
        const quickAnswers = sentences
            .filter(sentence => 
                actionWords.some(word => sentence.toLowerCase().includes(word)) &&
                sentence.length < 200
            )
            .slice(0, 3);

        return quickAnswers.length > 0 ? quickAnswers : [sentences[0] || ''].filter(s => s);
    }
}

module.exports = new KnowledgeBaseService();