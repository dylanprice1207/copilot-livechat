const mongoose = require('mongoose');
const database = require('../config/database');

// Knowledge Base Schema
const knowledgeSchema = new mongoose.Schema({
    question: { type: String, required: true, index: true },
    answer: { type: String, required: true },
    category: { type: String, default: 'general', index: true },
    keywords: [{ type: String, index: true }],
    priority: { type: Number, default: 1 },
    isActive: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

const Knowledge = mongoose.model('Knowledge', knowledgeSchema);

class KnowledgeBaseService {
    constructor() {
        this.knowledgeBase = new Map();
        this.isInitialized = false;
        this.initializationRetries = 0;
        this.maxRetries = 3;
    }

    async initialize() {
        try {
            // Wait for database connection
            if (!database.isHealthy()) {
                console.log('⏳ Waiting for database connection...');
                await this.waitForConnection();
            }

            console.log('📚 Initializing Knowledge Base...');
            
            // Load with timeout and error handling
            const knowledge = await Promise.race([
                this.loadKnowledgeFromDatabase(),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Knowledge base load timeout')), 15000)
                )
            ]);

            this.buildSearchIndex(knowledge);
            this.isInitialized = true;
            this.initializationRetries = 0;
            
            console.log(`✅ Knowledge Base initialized with ${knowledge.length} entries`);
            return true;

        } catch (error) {
            this.initializationRetries++;
            console.error(`❌ Knowledge Base initialization attempt ${this.initializationRetries} failed:`, error.message);
            
            if (this.initializationRetries < this.maxRetries) {
                const delay = 5000 * this.initializationRetries;
                console.log(`⏳ Retrying knowledge base initialization in ${delay}ms...`);
                
                await new Promise(resolve => setTimeout(resolve, delay));
                return this.initialize();
            } else {
                console.error('💥 Failed to initialize Knowledge Base after maximum retries');
                // Continue with empty knowledge base
                this.initializeDefaultKnowledge();
                return false;
            }
        }
    }

    async waitForConnection(maxWait = 30000) {
        const start = Date.now();
        
        while (!database.isHealthy() && (Date.now() - start) < maxWait) {
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        if (!database.isHealthy()) {
            throw new Error('Database connection timeout');
        }
    }

    async loadKnowledgeFromDatabase() {
        try {
            console.log('📖 Loading knowledge base from MongoDB...');
            
            const knowledge = await Knowledge.find({ isActive: true })
                .select('question answer category keywords priority')
                .lean()
                .timeout(10000); // 10 second timeout
            
            console.log(`📚 Loaded ${knowledge.length} knowledge entries from database`);
            return knowledge;
            
        } catch (error) {
            console.error('❌ Error loading knowledge base from MongoDB:', error.message);
            throw error;
        }
    }

    buildSearchIndex(knowledge) {
        this.knowledgeBase.clear();
        
        knowledge.forEach(item => {
            // Index by keywords
            if (item.keywords) {
                item.keywords.forEach(keyword => {
                    const key = keyword.toLowerCase();
                    if (!this.knowledgeBase.has(key)) {
                        this.knowledgeBase.set(key, []);
                    }
                    this.knowledgeBase.get(key).push(item);
                });
            }
            
            // Index by question words
            const questionWords = item.question.toLowerCase().split(/\W+/);
            questionWords.forEach(word => {
                if (word.length > 2) {
                    if (!this.knowledgeBase.has(word)) {
                        this.knowledgeBase.set(word, []);
                    }
                    this.knowledgeBase.get(word).push(item);
                }
            });
        });
    }

    initializeDefaultKnowledge() {
        console.log('📝 Initializing default knowledge base...');
        
        const defaultKnowledge = [
            {
                question: "How can I help you?",
                answer: "I'm here to assist you with any questions about our services. What would you like to know?",
                category: "general",
                keywords: ["help", "assist", "support"],
                priority: 1
            },
            {
                question: "What are your business hours?",
                answer: "Our business hours are Monday to Friday, 9 AM to 6 PM EST. However, our chat support is available 24/7!",
                category: "general",
                keywords: ["hours", "time", "open", "closed"],
                priority: 2
            },
            {
                question: "How do I contact support?",
                answer: "You can contact our support team through this chat, email us at support@convoai.space, or call us during business hours.",
                category: "support",
                keywords: ["contact", "support", "help", "phone", "email"],
                priority: 1
            },
            {
                question: "What services do you offer?",
                answer: "We offer professional live chat solutions, AI-powered customer support, and real-time messaging systems for businesses of all sizes.",
                category: "services",
                keywords: ["services", "offer", "products", "solutions"],
                priority: 1
            },
            {
                question: "Is this chat secure?",
                answer: "Yes, all conversations are encrypted and secure. We prioritize your privacy and data protection.",
                category: "security",
                keywords: ["secure", "privacy", "encryption", "safe"],
                priority: 1
            }
        ];
        
        this.buildSearchIndex(defaultKnowledge);
        this.isInitialized = true;
        
        console.log(`✅ Default knowledge base initialized with ${defaultKnowledge.length} entries`);
    }

    search(query, limit = 5) {
        if (!this.isInitialized) {
            return [{
                question: "System Initializing",
                answer: "Our knowledge base is currently initializing. Please try again in a moment.",
                category: "system",
                priority: 1,
                score: 1.0
            }];
        }

        const queryWords = query.toLowerCase().split(/\W+/);
        const matches = new Map();
        
        queryWords.forEach(word => {
            if (word.length > 2 && this.knowledgeBase.has(word)) {
                this.knowledgeBase.get(word).forEach(item => {
                    const key = item.question;
                    if (matches.has(key)) {
                        matches.set(key, matches.get(key) + 1);
                    } else {
                        matches.set(key, { ...item, score: 1 });
                    }
                });
            }
        });
        
        return Array.from(matches.values())
            .sort((a, b) => (b.score * b.priority) - (a.score * a.priority))
            .slice(0, limit);
    }

    async addKnowledge(data) {
        try {
            if (!database.isHealthy()) {
                throw new Error('Database not available');
            }

            const knowledge = new Knowledge(data);
            await knowledge.save();
            
            // Update search index
            this.buildSearchIndex([data]);
            
            console.log('✅ Knowledge entry added successfully');
            return knowledge;
            
        } catch (error) {
            console.error('❌ Error adding knowledge entry:', error.message);
            throw error;
        }
    }

    async updateKnowledge(id, data) {
        try {
            if (!database.isHealthy()) {
                throw new Error('Database not available');
            }

            const knowledge = await Knowledge.findByIdAndUpdate(id, {
                ...data,
                updatedAt: new Date()
            }, { new: true });
            
            if (!knowledge) {
                throw new Error('Knowledge entry not found');
            }
            
            // Reload knowledge base to update search index
            await this.initialize();
            
            console.log('✅ Knowledge entry updated successfully');
            return knowledge;
            
        } catch (error) {
            console.error('❌ Error updating knowledge entry:', error.message);
            throw error;
        }
    }

    async deleteKnowledge(id) {
        try {
            if (!database.isHealthy()) {
                throw new Error('Database not available');
            }

            const knowledge = await Knowledge.findByIdAndDelete(id);
            
            if (!knowledge) {
                throw new Error('Knowledge entry not found');
            }
            
            // Reload knowledge base to update search index
            await this.initialize();
            
            console.log('✅ Knowledge entry deleted successfully');
            return knowledge;
            
        } catch (error) {
            console.error('❌ Error deleting knowledge entry:', error.message);
            throw error;
        }
    }

    getStats() {
        return {
            totalEntries: this.knowledgeBase.size,
            isInitialized: this.isInitialized,
            initializationRetries: this.initializationRetries,
            databaseHealthy: database.isHealthy()
        };
    }
}

module.exports = new KnowledgeBaseService();