const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['customer', 'agent', 'admin', 'global_admin', 'service_agent', 'guest'], default: 'customer' },
  
  // Organization and department management
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', default: null },
  departments: {
    type: [String],
    enum: ['general', 'sales', 'technical', 'support', 'billing'],
    default: function() {
      // Global admins get all access, regular admins get org departments, others get none
      if (this.role === 'global_admin') return ['*']; // Wildcard for all organizations
      if (this.role === 'admin') return ['general', 'sales', 'technical', 'support', 'billing'];
      return [];
    }
  },
  
  // Permission system
  permissions: {
    canManageOrganizations: { 
      type: Boolean, 
      default: function() { return this.role === 'global_admin'; }
    },
    canManageDepartments: { 
      type: Boolean, 
      default: function() { return this.role === 'global_admin' || this.role === 'admin'; }
    },
    canManageUsers: { 
      type: Boolean, 
      default: function() { return this.role === 'global_admin' || this.role === 'admin'; }
    },
    canViewAnalytics: { 
      type: Boolean, 
      default: function() { return this.role === 'global_admin' || this.role === 'admin'; }
    }
  },
  
  // Multi-department agent access control
  agentProfile: {
    organization: { type: String, default: 'lightwave' },
    isActive: { type: Boolean, default: true },
    maxConcurrentChats: { type: Number, default: 5 },
    autoAssign: { type: Boolean, default: true },
    skillLevel: { 
      type: String, 
      enum: ['junior', 'senior', 'specialist', 'supervisor'],
      default: 'junior'
    }
  },
  
  isOnline: { type: Boolean, default: false },
  socketId: String,
  createdAt: { type: Date, default: Date.now },
  lastActive: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);