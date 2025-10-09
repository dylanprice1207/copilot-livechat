const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  slug: { type: String, required: true }, // URL-friendly identifier
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
  
  // Department configuration
  description: { type: String, default: '' },
  color: { type: String, default: '#4299e1' },
  icon: { type: String, default: 'fas fa-comments' },
  
  // Auto-assignment settings
  autoAssignment: {
    enabled: { type: Boolean, default: true },
    strategy: { 
      type: String, 
      enum: ['round-robin', 'least-active', 'skill-based'], 
      default: 'round-robin' 
    },
    maxQueueSize: { type: Number, default: 50 }
  },
  
  // Department-specific settings
  settings: {
    requiresSkill: { type: [String], default: [] }, // Required skills for agents
    priority: { type: Number, default: 1 }, // 1 = low, 5 = high
    escalationRules: {
      enabled: { type: Boolean, default: false },
      timeoutMinutes: { type: Number, default: 10 },
      escalateTo: { type: String, default: '' }
    },
    workingHours: {
      enabled: { type: Boolean, default: false },
      timezone: { type: String, default: 'UTC' },
      schedule: {
        monday: { enabled: Boolean, start: String, end: String },
        tuesday: { enabled: Boolean, start: String, end: String },
        wednesday: { enabled: Boolean, start: String, end: String },
        thursday: { enabled: Boolean, start: String, end: String },
        friday: { enabled: Boolean, start: String, end: String },
        saturday: { enabled: Boolean, start: String, end: String },
        sunday: { enabled: Boolean, start: String, end: String }
      }
    }
  },
  
  // Analytics and performance
  metrics: {
    totalChats: { type: Number, default: 0 },
    avgResponseTime: { type: Number, default: 0 }, // in seconds
    avgResolutionTime: { type: Number, default: 0 }, // in minutes
    satisfactionScore: { type: Number, default: 0 }, // 1-5 rating
    lastUpdated: { type: Date, default: Date.now }
  },
  
  // Status
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Compound index for organization + department uniqueness
departmentSchema.index({ organizationId: 1, slug: 1 }, { unique: true });
departmentSchema.index({ organizationId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Department', departmentSchema);