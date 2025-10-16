const mongoose = require('mongoose');

const organizationSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  slug: { type: String, required: true, unique: true }, // URL-friendly identifier
  description: { type: String, default: '' },
  
  // Organization settings
  settings: {
    allowSelfRegistration: { type: Boolean, default: false },
    maxAgents: { type: Number, default: 50 },
    maxDepartments: { type: Number, default: 10 },
    timezone: { type: String, default: 'UTC' },
    businessHours: {
      enabled: { type: Boolean, default: false },
      monday: { start: String, end: String },
      tuesday: { start: String, end: String },
      wednesday: { start: String, end: String },
      thursday: { start: String, end: String },
      friday: { start: String, end: String },
      saturday: { start: String, end: String },
      sunday: { start: String, end: String }
    }
  },
  
  // Branding
  branding: {
    logo: { type: String, default: '' },
    primaryColor: { type: String, default: '#4299e1' },
    secondaryColor: { type: String, default: '#63b3ed' },
    welcomeMessage: { type: String, default: 'Welcome! How can we help you today?' }
  },
  
  // Organization admin (optional due to User model registration issues)
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
  
  // Status
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Indexes for better performance
organizationSchema.index({ slug: 1 });
organizationSchema.index({ adminId: 1 });

module.exports = mongoose.model('Organization', organizationSchema);