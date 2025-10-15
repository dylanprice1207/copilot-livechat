const mongoose = require('mongoose');

const knowledgeSchema = new mongoose.Schema({
    id: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    category: {
        type: String,
        required: true,
        index: true,
        enum: ['support', 'products', 'troubleshooting', 'company', 'general', 'uploaded-documents']
    },
    title: {
        type: String,
        required: true,
        index: 'text'
    },
    content: {
        type: String,
        required: true,
        index: 'text'
    },
    keywords: {
        type: [String],
        default: [],
        index: true
    },
    answers: {
        type: [String],
        default: []
    },
    tags: {
        type: [String],
        default: [],
        index: true
    },
    priority: {
        type: String,
        enum: ['high', 'medium', 'low', 'critical'],
        default: 'medium',
        index: true
    },
    source: {
        type: String,
        enum: ['manual', 'file-upload', 'excel-template', 'excel-flexible', 'basic-processing'],
        default: 'manual'
    },
    fileName: {
        type: String,
        default: null
    },
    uploadDate: {
        type: Date,
        default: Date.now,
        index: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    },
    // Organization context for multi-tenancy
    organizationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        default: null
    },
    // User who created/uploaded this knowledge item
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    // Additional metadata
    metadata: {
        fileSize: Number,
        originalFormat: String,
        processingMethod: String,
        rowNumber: Number, // For Excel uploads
        isActive: {
            type: Boolean,
            default: true,
            index: true
        }
    }
}, {
    timestamps: true,
    // Create text index for full-text search
    index: {
        title: 'text',
        content: 'text',
        keywords: 'text'
    }
});

// Compound indexes for efficient queries
knowledgeSchema.index({ category: 1, priority: 1, createdAt: -1 });
knowledgeSchema.index({ organizationId: 1, category: 1, isActive: 1 });
knowledgeSchema.index({ keywords: 1, category: 1 });

// Update the updatedAt field on save
knowledgeSchema.pre('save', function(next) {
    this.updatedAt = new Date();
    next();
});

// Static methods for common queries
knowledgeSchema.statics.findByCategory = function(category, organizationId = null) {
    const query = { 
        category: category, 
        'metadata.isActive': true 
    };
    if (organizationId) {
        query.organizationId = organizationId;
    }
    return this.find(query).sort({ priority: 1, createdAt: -1 });
};

knowledgeSchema.statics.searchKnowledge = function(searchText, category = null, limit = 5, organizationId = null) {
    const query = {
        'metadata.isActive': true,
        $or: [
            { title: { $regex: searchText, $options: 'i' } },
            { content: { $regex: searchText, $options: 'i' } },
            { keywords: { $in: [new RegExp(searchText, 'i')] } }
        ]
    };
    
    if (category) {
        query.category = category;
    }
    
    if (organizationId) {
        query.organizationId = organizationId;
    }
    
    return this.find(query)
        .sort({ priority: 1, createdAt: -1 })
        .limit(limit);
};

knowledgeSchema.statics.getStats = function(organizationId = null) {
    const matchStage = { 'metadata.isActive': true };
    if (organizationId) {
        matchStage.organizationId = organizationId;
    }
    
    return this.aggregate([
        { $match: matchStage },
        {
            $group: {
                _id: '$category',
                count: { $sum: 1 },
                lastUpdated: { $max: '$updatedAt' }
            }
        },
        {
            $group: {
                _id: null,
                totalItems: { $sum: '$count' },
                categories: {
                    $push: {
                        category: '$_id',
                        count: '$count',
                        lastUpdated: '$lastUpdated'
                    }
                },
                categoryCount: { $sum: 1 }
            }
        }
    ]);
};

// Instance methods
knowledgeSchema.methods.softDelete = function() {
    this.metadata.isActive = false;
    return this.save();
};

knowledgeSchema.methods.restore = function() {
    this.metadata.isActive = true;
    return this.save();
};

knowledgeSchema.methods.incrementUsage = function() {
    this.usage_count += 1;
    this.last_used = new Date();
    return this.save();
};

// Static methods
knowledgeSchema.statics.findByKeywords = function(keywords) {
    return this.find({
        'metadata.isActive': true,
        keywords: { $in: keywords }
    }).sort({ priority: -1, usage_count: -1 });
};

knowledgeSchema.statics.searchByText = function(searchText, limit = 10) {
    return this.find({
        $and: [
            { 'metadata.isActive': true },
            {
                $or: [
                    { question: { $regex: searchText, $options: 'i' } },
                    { answer: { $regex: searchText, $options: 'i' } },
                    { keywords: { $in: [new RegExp(searchText, 'i')] } }
                ]
            }
        ]
    })
    .sort({ priority: -1, usage_count: -1 })
    .limit(limit);
};

// CRITICAL FIX: Prevent model overwrite error
let Knowledge;
try {
    // Try to get existing model
    Knowledge = mongoose.model('Knowledge');
    console.log('✅ ConvoAI: Using existing Knowledge model');
} catch (error) {
    // Model doesn't exist, create new one
    Knowledge = mongoose.model('Knowledge', knowledgeSchema);
    console.log('✅ ConvoAI: Created new Knowledge model');
}

module.exports = Knowledge;