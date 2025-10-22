const express = require('express');
const Organization = require('../models/Organization');
const User = require('../models/User');
const Knowledge = require('../models/Knowledge');
const router = express.Router();

// Note: Authentication middleware is applied in server.js before mounting these routes

// Middleware to validate service agent access
const requireServiceAgent = async (req, res, next) => {
  try {
    console.log('🔍 Service agent check - User:', req.user?.username, 'Role:', req.user?.role);
    
    // Allow global_admin, super_admin, and service_agent roles
    const allowedRoles = ['global_admin', 'super_admin', 'service_agent'];
    
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      console.log('❌ Access denied - not service agent');
      return res.status(403).json({ 
        success: false, 
        message: 'Service agent access required' 
      });
    }
    
    console.log('✅ Service agent access granted');
    next();
  } catch (error) {
    console.error('❌ Service agent middleware error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============================
// AUTHENTICATION ROUTES
// ============================

// Verify service portal token
router.get('/auth/verify', requireServiceAgent, async (req, res) => {
  try {
    res.json({
      success: true,
      user: {
        id: req.user.userId,
        username: req.user.username,
        email: req.user.email,
        role: req.user.role
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================
// DASHBOARD ROUTES
// ============================

// Get dashboard statistics
router.get('/dashboard', requireServiceAgent, async (req, res) => {
  try {
    console.log('📊 Loading service portal dashboard...');

    const [
      totalOrganizations,
      activeSubscriptions,
      trialOrganizations,
      totalUsers
    ] = await Promise.all([
      Organization.countDocuments(),
      Organization.countDocuments({ 'subscription.status': 'active' }),
      Organization.countDocuments({ 'subscription.status': 'trial' }),
      User.countDocuments({ role: { $in: ['agent', 'admin'] } })
    ]);

    // Calculate monthly revenue (mock calculation based on active subscriptions)
    const organizations = await Organization.find({ 'subscription.status': 'active' });
    const monthlyRevenue = organizations.reduce((total, org) => {
      const planPrices = { free: 0, professional: 79, business: 149 };
      return total + (planPrices[org.subscription?.plan] || 0);
    }, 0);

    const stats = {
      totalOrganizations,
      activeSubscriptions,
      trialOrganizations,
      totalUsers,
      monthlyRevenue,
      supportTickets: Math.floor(Math.random() * 25) + 5 // Mock data
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('❌ Dashboard error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get recent activities
router.get('/dashboard/activities', requireServiceAgent, async (req, res) => {
  try {
    // In a real system, this would come from an audit log
    // For now, we'll generate mock recent activities
    const mockActivities = [
      {
        description: 'Organization created',
        organization: 'Acme Corp',
        user: 'Service Agent',
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
      },
      {
        description: 'Plan upgraded to Professional',
        organization: 'TechStart Inc',
        user: 'Service Agent',
        createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000) // 4 hours ago
      },
      {
        description: 'Trial extended',
        organization: 'Beta Solutions',
        user: 'Service Agent',
        createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000) // 6 hours ago
      }
    ];

    res.json({
      success: true,
      data: mockActivities
    });
  } catch (error) {
    console.error('❌ Activities error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================
// ORGANIZATION ROUTES
// ============================

// Get all organizations
router.get('/organizations', requireServiceAgent, async (req, res) => {
  try {
    console.log('🏢 Getting all organizations...');

    const organizations = await Organization.find()
      .select('-__v')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: organizations
    });
  } catch (error) {
    console.error('❌ Get organizations error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Create organization
router.post('/organizations', requireServiceAgent, async (req, res) => {
  try {
    console.log('➕ Creating organization...');

    const {
      name,
      slug,
      contactEmail,
      contactPhone,
      description,
      subscription
    } = req.body;

    // Validation
    if (!name || !slug || !contactEmail) {
      return res.status(400).json({
        success: false,
        message: 'Name, slug, and contact email are required'
      });
    }

    // Check if slug already exists
    const existingOrg = await Organization.findOne({ slug });
    if (existingOrg) {
      return res.status(400).json({
        success: false,
        message: 'Organization slug already exists'
      });
    }

    // Create organization
    const organization = new Organization({
      name,
      slug,
      contactEmail,
      contactPhone,
      description,
      subscription: {
        plan: subscription?.plan || 'free',
        status: subscription?.status || 'active',
        billingCycle: 'monthly',
        createdAt: new Date()
      },
      settings: {
        allowGuestChat: true,
        enableAnalytics: true
      },
      usage: {
        conversations: 0,
        messagesThisMonth: 0
      },
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await organization.save();

    console.log(`✅ Organization created: ${name} (${slug})`);

    res.status(201).json({
      success: true,
      message: 'Organization created successfully',
      data: organization
    });
  } catch (error) {
    console.error('❌ Create organization error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update organization
router.put('/organizations/:id', requireServiceAgent, async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`✏️ Updating organization: ${id}`);

    const {
      name,
      slug,
      contactEmail,
      contactPhone,
      description,
      subscription
    } = req.body;

    // Find organization
    const organization = await Organization.findById(id);
    if (!organization) {
      return res.status(404).json({
        success: false,
        message: 'Organization not found'
      });
    }

    // Check if slug is being changed and if it conflicts
    if (slug !== organization.slug) {
      const existingOrg = await Organization.findOne({ slug, _id: { $ne: id } });
      if (existingOrg) {
        return res.status(400).json({
          success: false,
          message: 'Organization slug already exists'
        });
      }
    }

    // Update organization
    organization.name = name;
    organization.slug = slug;
    organization.contactEmail = contactEmail;
    organization.contactPhone = contactPhone;
    organization.description = description;
    organization.subscription = {
      ...organization.subscription,
      plan: subscription?.plan || organization.subscription?.plan || 'free',
      status: subscription?.status || organization.subscription?.status || 'active',
      lastUpdated: new Date(),
      updatedBy: req.user.username || req.user.email
    };
    organization.updatedAt = new Date();

    await organization.save();

    console.log(`✅ Organization updated: ${name}`);

    res.json({
      success: true,
      message: 'Organization updated successfully',
      data: organization
    });
  } catch (error) {
    console.error('❌ Update organization error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Delete organization
router.delete('/organizations/:id', requireServiceAgent, async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🗑️ Deleting organization: ${id}`);

    // Find organization
    const organization = await Organization.findById(id);
    if (!organization) {
      return res.status(404).json({
        success: false,
        message: 'Organization not found'
      });
    }

    // Delete related data
    await Promise.all([
      User.deleteMany({ organizationId: id }),
      Knowledge.deleteMany({ organizationId: id })
    ]);

    // Delete organization
    await Organization.findByIdAndDelete(id);

    console.log(`✅ Organization deleted: ${organization.name}`);

    res.json({
      success: true,
      message: 'Organization and all related data deleted successfully'
    });
  } catch (error) {
    console.error('❌ Delete organization error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Export organizations
router.get('/organizations/export', requireServiceAgent, async (req, res) => {
  try {
    console.log('📥 Exporting organizations...');

    const organizations = await Organization.find().select('-__v');

    // Generate CSV
    const headers = ['Name', 'Slug', 'Plan', 'Status', 'Contact Email', 'Created Date'];
    const rows = organizations.map(org => [
      org.name,
      org.slug,
      org.subscription?.plan || 'free',
      org.subscription?.status || 'active',
      org.contactEmail || '',
      org.createdAt?.toISOString().split('T')[0] || ''
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=organizations.csv');
    res.json({
      success: true,
      data: csv
    });
  } catch (error) {
    console.error('❌ Export organizations error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================
// PLAN MANAGEMENT ROUTES
// ============================

// Plan model placeholder (would be in models/Plan.js in a real system)
const planSchema = {
  name: String,
  displayName: String,
  price: Number,
  billingCycle: String,
  maxAgents: Number,
  knowledgeBaseSize: Number,
  monthlyConversations: Number,
  features: [String],
  description: String,
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
};

// For demo purposes, we'll use static plans with in-memory storage
let plans = [
  {
    _id: 'free-plan',
    name: 'free',
    displayName: 'Free',
    price: 0,
    billingCycle: 'monthly',
    maxAgents: 1,
    knowledgeBaseSize: 50,
    monthlyConversations: 100,
    features: ['Basic Analytics', 'Email Support'],
    description: 'Perfect for getting started',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    _id: 'professional-plan',
    name: 'professional',
    displayName: 'Professional',
    price: 79,
    billingCycle: 'monthly',
    maxAgents: 10,
    knowledgeBaseSize: 1024,
    monthlyConversations: 2500,
    features: ['Custom Branding', 'Priority Support', 'Advanced Analytics', 'API Access'],
    description: 'Ideal for growing businesses',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    _id: 'business-plan',
    name: 'business',
    displayName: 'Business',
    price: 149,
    billingCycle: 'monthly',
    maxAgents: 25,
    knowledgeBaseSize: 5120,
    monthlyConversations: 10000,
    features: ['24/7 Phone Support', 'Data Export', 'Advanced AI Features', 'Role-based Permissions', 'White-label Solution'],
    description: 'Enterprise-grade solution',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

// Get all plans
router.get('/plans', requireServiceAgent, async (req, res) => {
  try {
    console.log('📋 Getting all plans...');

    res.json({
      success: true,
      data: plans
    });
  } catch (error) {
    console.error('❌ Get plans error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Create plan
router.post('/plans', requireServiceAgent, async (req, res) => {
  try {
    console.log('➕ Creating plan...');

    const {
      name,
      displayName,
      price,
      billingCycle,
      maxAgents,
      knowledgeBaseSize,
      monthlyConversations,
      features,
      description,
      isActive
    } = req.body;

    // Validation
    if (!name || !displayName || price < 0) {
      return res.status(400).json({
        success: false,
        message: 'Name, display name, and valid price are required'
      });
    }

    // Check if plan name already exists
    const existingPlan = plans.find(p => p.name === name);
    if (existingPlan) {
      return res.status(400).json({
        success: false,
        message: 'Plan name already exists'
      });
    }

    // Create plan
    const newPlan = {
      _id: `${name}-plan-${Date.now()}`,
      name,
      displayName,
      price: parseFloat(price),
      billingCycle: billingCycle || 'monthly',
      maxAgents: parseInt(maxAgents) || 1,
      knowledgeBaseSize: parseInt(knowledgeBaseSize) || 50,
      monthlyConversations: parseInt(monthlyConversations) || 100,
      features: features || [],
      description: description || '',
      isActive: isActive !== false,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    plans.push(newPlan);

    console.log(`✅ Plan created: ${displayName}`);

    res.status(201).json({
      success: true,
      message: 'Plan created successfully',
      data: newPlan
    });
  } catch (error) {
    console.error('❌ Create plan error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update plan
router.put('/plans/:id', requireServiceAgent, async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`✏️ Updating plan: ${id}`);

    const {
      name,
      displayName,
      price,
      billingCycle,
      maxAgents,
      knowledgeBaseSize,
      monthlyConversations,
      features,
      description,
      isActive
    } = req.body;

    // Find plan
    const planIndex = plans.findIndex(p => p._id === id);
    if (planIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Plan not found'
      });
    }

    // Check if name is being changed and if it conflicts
    if (name !== plans[planIndex].name) {
      const existingPlan = plans.find(p => p.name === name && p._id !== id);
      if (existingPlan) {
        return res.status(400).json({
          success: false,
          message: 'Plan name already exists'
        });
      }
    }

    // Update plan
    plans[planIndex] = {
      ...plans[planIndex],
      name,
      displayName,
      price: parseFloat(price),
      billingCycle: billingCycle || 'monthly',
      maxAgents: parseInt(maxAgents) || 1,
      knowledgeBaseSize: parseInt(knowledgeBaseSize) || 50,
      monthlyConversations: parseInt(monthlyConversations) || 100,
      features: features || [],
      description: description || '',
      isActive: isActive !== false,
      updatedAt: new Date()
    };

    console.log(`✅ Plan updated: ${displayName}`);

    res.json({
      success: true,
      message: 'Plan updated successfully',
      data: plans[planIndex]
    });
  } catch (error) {
    console.error('❌ Update plan error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Delete plan
router.delete('/plans/:id', requireServiceAgent, async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🗑️ Deleting plan: ${id}`);

    // Find plan
    const planIndex = plans.findIndex(p => p._id === id);
    if (planIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Plan not found'
      });
    }

    const plan = plans[planIndex];

    // Check if plan is being used by any organizations
    const organizationsUsingPlan = await Organization.countDocuments({ 'subscription.plan': plan.name });
    if (organizationsUsingPlan > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete plan. ${organizationsUsingPlan} organization(s) are currently using this plan.`
      });
    }

    // Remove plan
    plans.splice(planIndex, 1);

    console.log(`✅ Plan deleted: ${plan.displayName}`);

    res.json({
      success: true,
      message: 'Plan deleted successfully'
    });
  } catch (error) {
    console.error('❌ Delete plan error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================
// ANALYTICS ROUTES
// ============================

// Get analytics data
router.get('/analytics', requireServiceAgent, async (req, res) => {
  try {
    console.log('📈 Getting analytics data...');

    // Get plan distribution
    const organizations = await Organization.find();
    const planDistribution = organizations.reduce((acc, org) => {
      const plan = org.subscription?.plan || 'free';
      acc[plan] = (acc[plan] || 0) + 1;
      return acc;
    }, {});

    const analytics = {
      planDistribution,
      totalOrganizations: organizations.length,
      // Additional analytics would go here
    };

    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    console.error('❌ Analytics error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Export analytics
router.get('/analytics/export', requireServiceAgent, async (req, res) => {
  try {
    console.log('📥 Exporting analytics...');

    const organizations = await Organization.find();
    
    // Generate analytics CSV
    const headers = ['Metric', 'Value'];
    const rows = [
      ['Total Organizations', organizations.length],
      ['Free Plans', organizations.filter(o => (o.subscription?.plan || 'free') === 'free').length],
      ['Professional Plans', organizations.filter(o => o.subscription?.plan === 'professional').length],
      ['Business Plans', organizations.filter(o => o.subscription?.plan === 'business').length],
      ['Active Subscriptions', organizations.filter(o => o.subscription?.status === 'active').length],
      ['Trial Subscriptions', organizations.filter(o => o.subscription?.status === 'trial').length]
    ];

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=analytics.csv');
    res.json({
      success: true,
      data: csv
    });
  } catch (error) {
    console.error('❌ Export analytics error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;