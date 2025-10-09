const fs = require('fs').promises;
const path = require('path');
const XLSX = require('xlsx');
const Knowledge = require('../models/Knowledge');

class KnowledgeBaseService {
    constructor() {
        this.knowledgeBase = new Map();
        this.categories = new Map();
        this.searchIndex = new Map();
        this.isLoaded = false;
        this.knowledgeBasePath = path.join(__dirname, '../../knowledge-base');
    }

    /**
     * Initialize knowledge base by loading all content
     */
    async initialize() {
        try {
            console.log('📚 Initializing Knowledge Base...');
            
            // Load knowledge base from MongoDB
            await this.loadKnowledgeBase();
            
            // Build search index
            this.buildSearchIndex();
            
            this.isLoaded = true;
            console.log(`✅ Knowledge Base loaded with ${this.knowledgeBase.size} entries`);
            
        } catch (error) {
            console.error('❌ Failed to initialize Knowledge Base from MongoDB:', error);
            // Fallback to file-based system if MongoDB fails
            await this.fallbackToFileSystem();
        }
    }

    /**
     * Ensure knowledge base directory exists
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
     * Create default knowledge base with Lightwave content
     */
    async createDefaultKnowledgeBase() {
        const defaultKnowledge = {
            'products.json': {
                category: 'products',
                items: [
                    {
                        id: 'dimmer-switch',
                        title: 'Lightwave Dimmer Switch',
                        content: 'The Lightwave Dimmer Switch allows you to control your lights remotely via smartphone app. It features smooth dimming, scheduling, and energy monitoring. Compatible with LED, halogen, and incandescent bulbs up to 400W.',
                        keywords: ['dimmer', 'switch', 'lights', 'control', 'smartphone', 'app', 'LED', 'halogen', 'incandescent', '400W'],
                        tags: ['product', 'lighting', 'smart-home'],
                        answers: [
                            'The dimmer switch allows remote control of your lights via our smartphone app',
                            'It supports LED, halogen, and incandescent bulbs up to 400W',
                            'Features include smooth dimming, scheduling, and energy monitoring'
                        ]
                    },
                    {
                        id: 'smart-socket',
                        title: 'Lightwave Smart Socket',
                        content: 'Transform any appliance into a smart device with our Smart Socket. Control remotely, set schedules, monitor energy usage, and create automation rules.',
                        keywords: ['socket', 'smart', 'appliance', 'remote', 'schedule', 'energy', 'automation'],
                        tags: ['product', 'smart-home', 'automation'],
                        answers: [
                            'The smart socket turns any appliance into a smart device',
                            'You can control it remotely and set schedules',
                            'It includes energy monitoring and automation features'
                        ]
                    }
                ]
            },
            'troubleshooting.json': {
                category: 'support',
                items: [
                    {
                        id: 'pairing-dimmer',
                        title: 'How to Pair Dimmer Switch',
                        content: 'To pair your Lightwave dimmer switch: 1) Download the Lightwave app 2) Create an account 3) Press and hold the dimmer button for 5 seconds until it flashes 4) In the app, tap "Add Device" 5) Follow the on-screen instructions',
                        keywords: ['pair', 'pairing', 'dimmer', 'switch', 'setup', 'install', 'app', 'connect'],
                        tags: ['setup', 'pairing', 'troubleshooting'],
                        answers: [
                            'To pair the dimmer: hold the button for 5 seconds until it flashes, then use the app to add the device',
                            'First download our Lightwave app, then press and hold the dimmer button for 5 seconds',
                            'The pairing process involves holding the dimmer button and following the app instructions'
                        ]
                    },
                    {
                        id: 'wifi-connection',
                        title: 'WiFi Connection Issues',
                        content: 'If your device won\'t connect to WiFi: 1) Check your WiFi password is correct 2) Ensure 2.4GHz network is available 3) Move device closer to router 4) Restart your router 5) Reset the device and try pairing again',
                        keywords: ['wifi', 'connection', 'network', 'password', '2.4GHz', 'router', 'reset'],
                        tags: ['troubleshooting', 'wifi', 'connectivity'],
                        answers: [
                            'Check your WiFi password and ensure you\'re using a 2.4GHz network',
                            'Try moving the device closer to your router during setup',
                            'If issues persist, restart your router and reset the device'
                        ]
                    }
                ]
            },
            'company.json': {
                category: 'company',
                items: [
                    {
                        id: 'about-lightwave',
                        title: 'About Lightwave',
                        content: 'Lightwave is a leading UK smart home technology company. We specialize in intelligent lighting, heating, and power control solutions that make homes more comfortable, efficient, and secure.',
                        keywords: ['lightwave', 'company', 'UK', 'smart', 'home', 'lighting', 'heating', 'power'],
                        tags: ['company', 'about'],
                        answers: [
                            'Lightwave is a UK-based smart home technology company',
                            'We specialize in intelligent lighting, heating, and power control',
                            'Our solutions make homes more comfortable, efficient, and secure'
                        ]
                    },
                    {
                        id: 'support-hours',
                        title: 'Support Hours',
                        content: 'Our support team is available Monday to Friday, 9 AM to 5 PM GMT. For urgent technical issues outside these hours, please use our online chat system.',
                        keywords: ['support', 'hours', 'monday', 'friday', '9am', '5pm', 'GMT', 'chat'],
                        tags: ['support', 'hours', 'contact'],
                        answers: [
                            'Support is available Monday to Friday, 9 AM to 5 PM GMT',
                            'For urgent issues outside hours, use our online chat system',
                            'Our team operates during standard UK business hours'
                        ]
                    }
                ]
            }
        };

        // Write default knowledge base files
        for (const [filename, data] of Object.entries(defaultKnowledge)) {
            const filePath = path.join(this.knowledgeBasePath, filename);
            await fs.writeFile(filePath, JSON.stringify(data, null, 2));
            console.log(`📝 Created default knowledge file: ${filename}`);
        }
    }

    /**
     * Load knowledge base from MongoDB
     */
    async loadKnowledgeBase() {
        try {
            // Load all active knowledge items from database
            const items = await Knowledge.find({ 'metadata.isActive': true })
                .sort({ category: 1, priority: 1, createdAt: -1 });
            
            // Clear existing cache
            this.knowledgeBase.clear();
            this.categories.clear();
            
            // Load items into memory for fast access
            for (const item of items) {
                this.knowledgeBase.set(item.id, {
                    id: item.id,
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
                    createdAt: item.createdAt,
                    updatedAt: item.updatedAt
                });
                
                // Update category counts
                if (!this.categories.has(item.category)) {
                    this.categories.set(item.category, {
                        name: item.category,
                        count: 0,
                        lastUpdated: item.updatedAt
                    });
                }
                const categoryData = this.categories.get(item.category);
                categoryData.count++;
                if (item.updatedAt > categoryData.lastUpdated) {
                    categoryData.lastUpdated = item.updatedAt;
                }
            }
            
        } catch (error) {
            console.error('❌ Error loading knowledge base from MongoDB:', error);
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
     * Search knowledge base for relevant content
     */
    searchKnowledge(query, category = null, limit = 5) {
        if (!this.isLoaded) {
            console.warn('⚠️ Knowledge base not loaded yet');
            return [];
        }

        const queryWords = query.toLowerCase().split(/\s+/);
        const matches = new Map(); // id -> score

        for (const word of queryWords) {
            // Direct keyword match
            if (this.searchIndex.has(word)) {
                for (const id of this.searchIndex.get(word)) {
                    const item = this.knowledgeBase.get(id);
                    if (!category || item.category === category) {
                        matches.set(id, (matches.get(id) || 0) + 10);
                    }
                }
            }

            // Partial keyword match
            for (const [keyword, ids] of this.searchIndex) {
                if (keyword.includes(word) || word.includes(keyword)) {
                    for (const id of ids) {
                        const item = this.knowledgeBase.get(id);
                        if (!category || item.category === category) {
                            matches.set(id, (matches.get(id) || 0) + 5);
                        }
                    }
                }
            }
        }

        // Sort by relevance and return top results
        const sorted = Array.from(matches.entries())
            .sort(([,a], [,b]) => b - a)
            .slice(0, limit)
            .map(([id]) => this.knowledgeBase.get(id));

        return sorted;
    }

    /**
     * Get knowledge context for AI responses
     */
    getContextForMessage(message, department = 'general') {
        const relevantKnowledge = this.searchKnowledge(message, null, 3);
        
        if (relevantKnowledge.length === 0) {
            return '';
        }

        let context = '\n--- KNOWLEDGE BASE CONTEXT ---\n';
        context += 'Use this information to provide accurate, specific answers:\n\n';
        
        for (const item of relevantKnowledge) {
            context += `**${item.title}**\n`;
            context += `${item.content}\n`;
            if (item.answers && item.answers.length > 0) {
                context += `Quick answers: ${item.answers.join('; ')}\n`;
            }
            context += '\n';
        }
        
        context += '--- END CONTEXT ---\n';
        return context;
    }

    /**
     * Add new knowledge item
     */
    async addKnowledge(category, item) {
        try {
            // Create or update MongoDB document
            const knowledgeDoc = new Knowledge({
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
                metadata: {
                    fileSize: item.fileSize || null,
                    originalFormat: item.originalFormat || null,
                    processingMethod: item.processingMethod || null,
                    rowNumber: item.rowNumber || null,
                    isActive: true
                }
            });
            
            // Save to database (upsert if exists)
            await Knowledge.findOneAndUpdate(
                { id: item.id },
                knowledgeDoc.toObject(),
                { upsert: true, new: true }
            );
            
            // Add to memory cache
            this.knowledgeBase.set(item.id, { ...item, category });
            
            // Update category cache
            if (!this.categories.has(category)) {
                this.categories.set(category, {
                    name: category,
                    count: 0,
                    lastUpdated: new Date()
                });
            }
            const categoryData = this.categories.get(category);
            categoryData.count++;
            categoryData.lastUpdated = new Date();
            
            // Rebuild search index
            this.buildSearchIndex();
            
            console.log(`✅ Added knowledge item: ${item.id}`);
            return true;
            
        } catch (error) {
            console.error('❌ Error adding knowledge:', error);
            // Fallback to file-based storage
            return await this.addKnowledgeToFile(category, item);
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
     * Delete knowledge item
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
                
            } catch (fileError) {
                console.error('❌ Error updating file after delete:', fileError);
                // Item was removed from memory, but file update failed
                this.buildSearchIndex();
                return {
                    success: true,
                    message: 'Item deleted from memory, but file update failed'
                };
            }
            
        } catch (error) {
            console.error('❌ Error deleting knowledge item:', error);
            return {
                success: false,
                message: 'Failed to delete knowledge item'
            };
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
     * Get all categories
     */
    getCategories() {
        return Array.from(this.categories.keys());
    }

    /**
     * Get items by category
     */
    getItemsByCategory(category) {
        const items = [];
        for (const [id, item] of this.knowledgeBase) {
            if (item.category === category) {
                items.push(item);
            }
        }
        return items;
    }

    /**
     * Get knowledge base statistics
     */
    getStats() {
        const stats = {
            totalItems: this.knowledgeBase.size,
            categories: this.categories.size,
            searchTerms: this.searchIndex.size,
            isLoaded: this.isLoaded
        };
        
        const categoryCounts = {};
        for (const [id, item] of this.knowledgeBase) {
            categoryCounts[item.category] = (categoryCounts[item.category] || 0) + 1;
        }
        stats.categoryCounts = categoryCounts;
        
        return stats;
    }

    /**
     * Rename a category and move all its items
     */
    async renameCategory(oldName, newName) {
        try {
            // Validate new name
            if (!newName || newName.trim() === '') {
                return {
                    success: false,
                    message: 'New category name cannot be empty'
                };
            }

            // Check if new category already exists
            if (this.categories.has(newName)) {
                return {
                    success: false,
                    message: 'Category with that name already exists'
                };
            }

            // Get all items from old category
            const items = this.getItemsByCategory(oldName);
            if (items.length === 0) {
                return {
                    success: false,
                    message: 'No items found in category to rename'
                };
            }

            // Update items in memory
            let movedItems = 0;
            for (const item of items) {
                if (this.knowledgeBase.has(item.id)) {
                    const updatedItem = { ...item, category: newName };
                    this.knowledgeBase.set(item.id, updatedItem);
                    movedItems++;
                }
            }

            // Update category mapping
            this.categories.delete(oldName);
            this.categories.set(newName, items.length);

            // Update files
            try {
                const oldFilePath = path.join(this.knowledgeBasePath, `${oldName}.json`);
                const newFilePath = path.join(this.knowledgeBasePath, `${newName}.json`);

                // Check if old file exists
                try {
                    await fs.access(oldFilePath);
                    
                    // Read old file
                    const content = await fs.readFile(oldFilePath, 'utf-8');
                    const data = JSON.parse(content);
                    
                    // Update category in file data
                    data.category = newName;
                    data.items.forEach(item => {
                        item.category = newName;
                    });
                    
                    // Write to new file
                    await fs.writeFile(newFilePath, JSON.stringify(data, null, 2));
                    
                    // Delete old file
                    await fs.unlink(oldFilePath);
                    
                } catch (fileError) {
                    // File doesn't exist or couldn't be processed
                    console.warn(`Could not process file for category ${oldName}:`, fileError.message);
                }
            } catch (error) {
                console.error('Error updating category files:', error);
            }

            // Rebuild search index
            this.buildSearchIndex();

            console.log(`✅ Renamed category "${oldName}" to "${newName}" (${movedItems} items moved)`);
            
            return {
                success: true,
                movedItems: movedItems,
                message: `Successfully renamed category and moved ${movedItems} items`
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
     * Process uploaded files and extract knowledge
     */
    async processUploadedFiles(files, category) {
        const results = {
            successCount: 0,
            failureCount: 0,
            processedFiles: [],
            errors: []
        };

        // First, check if any files are Excel files and process them as structured templates
        const excelFiles = files.filter(file => 
            file.mimetype === 'application/vnd.ms-excel' || 
            file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );

        // Process Excel files first (each row becomes a separate knowledge item)
        for (const excelFile of excelFiles) {
            try {
                console.log(`📊 Processing Excel file: ${excelFile.originalname}`);
                const excelResults = await this.processExcelTemplate(excelFile.path, category);
                
                if (excelResults.success) {
                    results.successCount += excelResults.processedCount;
                    results.processedFiles.push({
                        fileName: excelFile.originalname,
                        title: `Excel File - ${excelResults.processedCount} Knowledge Items Created`,
                        contentLength: excelResults.processedCount,
                        id: `excel-batch-${Date.now()}`,
                        details: excelResults.itemDetails || []
                    });
                    console.log(`✅ Created ${excelResults.processedCount} knowledge items from ${excelFile.originalname}`);
                } else {
                    // If template processing fails, try flexible Excel processing
                    console.log(`⚠️ Template processing failed, trying flexible Excel processing for ${excelFile.originalname}`);
                    const flexibleResults = await this.processFlexibleExcel(excelFile.path, category);
                    
                    if (flexibleResults.success && flexibleResults.itemCount > 0) {
                        results.successCount += flexibleResults.itemCount;
                        results.processedFiles.push({
                            fileName: excelFile.originalname,
                            title: `Excel File - ${flexibleResults.itemCount} Items Created`,
                            contentLength: flexibleResults.itemCount,
                            id: `excel-flexible-${Date.now()}`,
                            details: flexibleResults.itemDetails || []
                        });
                        console.log(`✅ Created ${flexibleResults.itemCount} knowledge items from ${excelFile.originalname} using flexible processing`);
                    } else {
                        // Final fallback to basic Excel processing
                        const basicContent = this.processExcelContent(excelFile.path);
                        
                        const knowledgeItem = {
                            id: `excel-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                            title: path.basename(excelFile.originalname, path.extname(excelFile.originalname)),
                            content: basicContent.trim(),
                            keywords: this.extractKeywords(basicContent),
                            answers: this.extractQuickAnswers(basicContent),
                            tags: ['file-upload', 'excel', 'basic-processing'],
                            uploadDate: new Date().toISOString(),
                            fileName: excelFile.originalname
                        };
                        
                        await this.addKnowledge(category, knowledgeItem);
                        results.successCount++;
                        results.processedFiles.push({
                            fileName: excelFile.originalname,
                            title: knowledgeItem.title,
                            contentLength: basicContent.length,
                            id: knowledgeItem.id
                        });
                    }
                }

                // Clean up Excel file
                try {
                    await fs.unlink(excelFile.path);
                } catch (unlinkError) {
                    console.warn('Could not delete Excel file:', unlinkError);
                }
            } catch (error) {
                console.error(`❌ Error processing Excel file ${excelFile.originalname}:`, error);
                results.errors.push({
                    fileName: excelFile.originalname,
                    error: error.message
                });
                results.failureCount++;
                
                // Clean up failed file
                try {
                    await fs.unlink(excelFile.path);
                } catch (unlinkError) {
                    console.warn('Could not delete failed Excel file:', unlinkError);
                }
            }
        }

        // Process remaining non-Excel files
        const regularFiles = files.filter(file => !excelFiles.includes(file));
        
        for (const file of regularFiles) {
            try {
                let content = '';
                let title = path.basename(file.originalname, path.extname(file.originalname));

                // Read file content based on type
                if (file.mimetype === 'text/plain' || file.mimetype === 'text/markdown') {
                    content = await fs.readFile(file.path, 'utf8');
                } else if (file.mimetype === 'application/json') {
                    const jsonData = JSON.parse(await fs.readFile(file.path, 'utf8'));
                    content = typeof jsonData === 'string' ? jsonData : JSON.stringify(jsonData, null, 2);
                } else if (file.mimetype === 'text/csv') {
                    content = await fs.readFile(file.path, 'utf8');
                    // Basic CSV processing - convert to readable format
                    content = this.processCSVContent(content);
                // Excel files are now processed separately above
                } else {
                    // For other file types, try to read as text
                    content = await fs.readFile(file.path, 'utf8');
                }

                // Create knowledge item
                const knowledgeItem = {
                    id: `${category}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    title: title,
                    content: content.trim(),
                    keywords: this.extractKeywords(content),
                    answers: this.extractQuickAnswers(content),
                    tags: [`file-upload`, `${file.mimetype.split('/')[1]}`],
                    uploadDate: new Date().toISOString(),
                    fileName: file.originalname
                };

                // Add to knowledge base
                await this.addKnowledge(category, knowledgeItem);

                results.processedFiles.push({
                    fileName: file.originalname,
                    title: title,
                    contentLength: content.length,
                    id: knowledgeItem.id
                });
                results.successCount++;

                // Clean up uploaded file
                try {
                    await fs.unlink(file.path);
                } catch (unlinkError) {
                    console.warn('Could not delete uploaded file:', unlinkError);
                }

            } catch (error) {
                console.error('Error processing file:', file.originalname, error);
                results.errors.push({
                    fileName: file.originalname,
                    error: error.message
                });
                results.failureCount++;

                // Clean up failed file
                try {
                    await fs.unlink(file.path);
                } catch (unlinkError) {
                    console.warn('Could not delete failed file:', unlinkError);
                }
            }
        }

        return results;
    }

    /**
     * Process CSV content into readable format
     */
    processCSVContent(csvText) {
        const lines = csvText.split('\n').filter(line => line.trim());
        if (lines.length === 0) return csvText;

        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        let result = `CSV Data with ${headers.length} columns:\n\n`;
        
        result += `Headers: ${headers.join(', ')}\n\n`;
        
        for (let i = 1; i < Math.min(lines.length, 11); i++) { // Show first 10 data rows
            const row = lines[i].split(',').map(cell => cell.trim().replace(/"/g, ''));
            result += `Row ${i}: `;
            for (let j = 0; j < headers.length && j < row.length; j++) {
                result += `${headers[j]}: ${row[j]}; `;
            }
            result += '\n';
        }

        if (lines.length > 11) {
            result += `... and ${lines.length - 11} more rows\n`;
        }

        return result;
    }

    /**
     * Process Excel content into readable format
     */
    processExcelContent(filePath) {
        try {
            // Read the Excel file
            const workbook = XLSX.readFile(filePath);
            let result = `Excel Document with ${workbook.SheetNames.length} sheet(s):\n\n`;
            
            // Process each sheet
            workbook.SheetNames.forEach((sheetName, index) => {
                result += `=== Sheet ${index + 1}: ${sheetName} ===\n\n`;
                
                const worksheet = workbook.Sheets[sheetName];
                
                // Convert sheet to JSON for easier processing
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                
                if (jsonData.length === 0) {
                    result += "Sheet is empty\n\n";
                    return;
                }
                
                // Get headers (first row)
                const headers = jsonData[0] || [];
                if (headers.length > 0) {
                    result += `Headers: ${headers.join(', ')}\n\n`;
                }
                
                // Show sample data (up to 10 rows)
                const dataRows = jsonData.slice(1, Math.min(jsonData.length, 11));
                dataRows.forEach((row, rowIndex) => {
                    result += `Row ${rowIndex + 1}: `;
                    row.forEach((cell, cellIndex) => {
                        if (cellIndex < headers.length && headers[cellIndex]) {
                            result += `${headers[cellIndex]}: ${cell || 'empty'}; `;
                        } else {
                            result += `Col${cellIndex + 1}: ${cell || 'empty'}; `;
                        }
                    });
                    result += '\n';
                });
                
                if (jsonData.length > 11) {
                    result += `... and ${jsonData.length - 11} more rows\n`;
                }
                
                result += '\n';
            });
            
            // Add summary statistics
            const totalSheets = workbook.SheetNames.length;
            let totalRows = 0;
            workbook.SheetNames.forEach(sheetName => {
                const worksheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                totalRows += jsonData.length;
            });
            
            result += `\n--- Summary ---\n`;
            result += `Total Sheets: ${totalSheets}\n`;
            result += `Total Rows (all sheets): ${totalRows}\n`;
            
            return result;
            
        } catch (error) {
            console.error('Error processing Excel file:', error);
            return `Error processing Excel file: ${error.message}`;
        }
    }

    /**
     * Process Excel template with validation
     */
    async processExcelTemplate(filePath, category) {
        try {
            const ExcelTemplateService = require('./ExcelTemplateService');
            
            // Validate template structure
            console.log(`📋 Validating Excel template structure for: ${path.basename(filePath)}`);
            const validation = await ExcelTemplateService.validateTemplate(filePath);
            
            if (!validation.valid) {
                console.log(`⚠️ Template validation failed: ${validation.error}`);
                return {
                    success: false,
                    isTemplate: false,
                    error: validation.error
                };
            }
            
            console.log(`✅ Template validation passed - found ${validation.data.length} valid rows`)

            // Process validated data - each row becomes a separate knowledge item
            let processedCount = 0;
            const itemDetails = [];
            const errors = [];
            
            console.log(`📊 Processing ${validation.data.length} rows from Excel template...`);
            
            for (const item of validation.data) {
                try {
                    // Ensure unique ID for each row
                    const uniqueId = item.id || `${item.category}-row-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
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
                    
                    console.log(`✅ Created knowledge item ${processedCount}: "${item.title}" (${uniqueId})`);
                } catch (error) {
                    console.error(`❌ Failed to add knowledge item "${item.title}" (${item.id}):`, error);
                    errors.push(`Row ${processedCount + 1}: ${error.message}`);
                }
            }

            const result = {
                success: true,
                isTemplate: true,
                processedCount: processedCount,
                itemDetails: itemDetails,
                message: `${processedCount} individual knowledge items created from Excel rows`
            };
            
            if (errors.length > 0) {
                result.errors = errors;
                result.message += ` (${errors.length} errors occurred)`;
            }
            
            return result;
            
        } catch (error) {
            return {
                success: false,
                isTemplate: true,
                error: error.message
            };
        }
    }

    /**
     * Process Excel file with flexible structure - tries to detect columns automatically
     */
    async processFlexibleExcel(filePath, category) {
        try {
            console.log(`🔍 Starting flexible Excel processing for: ${path.basename(filePath)}`);
            
            // Read Excel file using XLSX library
            const workbook = XLSX.readFile(filePath);
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            
            // Convert to JSON with header detection
            const jsonData = XLSX.utils.sheet_to_json(worksheet);
            
            if (!jsonData || jsonData.length === 0) {
                console.log('❌ No data found in Excel file');
                return {
                    success: false,
                    error: 'No data found in Excel file'
                };
            }

            console.log(`📊 Found ${jsonData.length} data rows in Excel file`);
            
            const itemDetails = [];
            let itemCount = 0;
            
            // Process each row
            for (let i = 0; i < jsonData.length; i++) {
                const row = jsonData[i];
                
                // Try to detect title and content from various possible column names
                const titleKeys = Object.keys(row).find(key => 
                    key.toLowerCase().includes('title') || 
                    key.toLowerCase().includes('name') || 
                    key.toLowerCase().includes('question')
                );
                
                const contentKeys = Object.keys(row).find(key => 
                    key.toLowerCase().includes('content') || 
                    key.toLowerCase().includes('description') || 
                    key.toLowerCase().includes('answer') || 
                    key.toLowerCase().includes('text')
                );
                
                const title = row[titleKeys] || `Excel Item ${i + 1}`;
                const content = row[contentKeys] || JSON.stringify(row);
                
                // Skip empty rows
                if (!title && !content) continue;
                
                const uniqueId = `excel-${category}-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 9)}`;
                
                const knowledgeItem = {
                    id: uniqueId,
                    title: title.toString().trim(),
                    content: content.toString().trim(),
                    keywords: this.extractKeywords(content.toString()),
                    answers: this.extractQuickAnswers(content.toString()),
                    tags: ['excel-import', 'flexible-processing'],
                    uploadDate: new Date().toISOString(),
                    source: 'excel-flexible'
                };
                
                // Try to extract other fields if they exist
                Object.keys(row).forEach(key => {
                    const lowerKey = key.toLowerCase();
                    if (lowerKey.includes('keyword')) {
                        knowledgeItem.keywords = row[key].toString().split(',').map(k => k.trim());
                    } else if (lowerKey.includes('tag')) {
                        knowledgeItem.tags = [...knowledgeItem.tags, ...row[key].toString().split(',').map(t => t.trim())];
                    } else if (lowerKey.includes('priority')) {
                        knowledgeItem.priority = row[key].toString().toLowerCase();
                    }
                });
                
                await this.addKnowledge(category, knowledgeItem);
                itemCount++;
                
                itemDetails.push({
                    id: uniqueId,
                    title: knowledgeItem.title,
                    category: category,
                    rowNumber: i + 1
                });
                
                console.log(`✅ Created flexible knowledge item ${itemCount}: "${knowledgeItem.title}" (${uniqueId})`);
            }
            
            return {
                success: true,
                itemCount: itemCount,
                itemDetails: itemDetails,
                message: `${itemCount} knowledge items created from Excel rows using flexible processing`
            };
            
        } catch (error) {
            console.error('❌ Error in flexible Excel processing:', error);
            return {
                success: false,
                error: error.message
            };
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
            .filter(word => !['this', 'that', 'with', 'from', 'they', 'were', 'been', 'have', 'their', 'said', 'each', 'which', 'more', 'like', 'other', 'many', 'some', 'time', 'very', 'when', 'much', 'than', 'only', 'just', 'first', 'last', 'good', 'great', 'little', 'should', 'could', 'would', 'also'].includes(word));

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
        
        // Look for sentences that start with action words or seem like instructions
        const actionWords = ['to ', 'you can', 'simply', 'just', 'first', 'next', 'then', 'finally', 'click', 'press', 'select', 'choose', 'enter', 'type'];
        
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