const express = require('express');
const OrganizationService = require('../services/OrganizationService');
const DepartmentService = require('../services/DepartmentService');
const AuthService = require('../services/AuthService');
const Organization = require('../models/Organization');
const router = express.Router();

// Note: Authentication middleware is applied in server.js before mounting these routes

// Middleware to validate global admin access
const requireGlobalAdmin = async (req, res, next) => {
  try {
    console.log('🔍 Global admin check - User:', req.user?.username, 'Role:', req.user?.role);
    
    if (!req.user || req.user.role !== 'global_admin') {
      console.log('❌ Access denied - not global admin');
      return res.status(403).json({ 
        success: false, 
        message: 'Global admin access required' 
      });
    }
    
    console.log('✅ Global admin access granted');
    next();
  } catch (error) {
    console.error('❌ Global admin middleware error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Middleware to validate admin access (global admin or org admin)
const requireAdminAccess = async (req, res, next) => {
  try {
    if (!req.user || !['global_admin', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        message: 'Admin access required' 
      });
    }
    next();
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============================
// ORGANIZATION ROUTES
// ============================

// Get all organizations (Global Admin only)
router.get('/organizations', requireGlobalAdmin, async (req, res) => {
  try {
    const { isActive } = req.query;
    const filters = {};
    
    if (isActive !== undefined) {
      filters.isActive = isActive === 'true';
    }

    const organizations = await OrganizationService.getAllOrganizations(filters);
    res.json({ success: true, data: organizations });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Get organization by ID
router.get('/organizations/:id', requireAdminAccess, async (req, res) => {
  try {
    const organization = await OrganizationService.getOrganizationById(req.params.id);
    res.json({ success: true, data: organization });
  } catch (error) {
    res.status(404).json({ success: false, message: error.message });
  }
});

// Create new organization (Global Admin only)
router.post('/organizations', requireGlobalAdmin, async (req, res) => {
  try {
    // Hash admin password if creating new admin
    if (req.body.createAdmin && req.body.adminPassword) {
      req.body.adminPassword = await AuthService.hashPassword(req.body.adminPassword);
    }

    const organization = await OrganizationService.createOrganization(
      req.body, 
      req.user._id || req.user.id
    );
    
    res.status(201).json({ 
      success: true, 
      message: 'Organization created successfully',
      data: organization 
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Update organization
router.put('/organizations/:id', requireAdminAccess, async (req, res) => {
  try {
    const organization = await OrganizationService.updateOrganization(
      req.params.id, 
      req.body, 
      req.user.userId
    );
    
    res.json({ 
      success: true, 
      message: 'Organization updated successfully',
      data: organization 
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Delete organization (Global Admin only)
router.delete('/organizations/:id', requireGlobalAdmin, async (req, res) => {
  try {
    const result = await OrganizationService.deleteOrganization(
      req.params.id, 
      req.user._id
    );
    
    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Get organization analytics
router.get('/organizations/:id/analytics', requireAdminAccess, async (req, res) => {
  try {
    const analytics = await OrganizationService.getOrganizationAnalytics(req.params.id);
    res.json({ success: true, data: analytics });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Magic Login - Generate temporary access token for organization admin portals
router.post('/magic-login', requireGlobalAdmin, async (req, res) => {
  try {
    const { organizationId, organizationSlug, targetRole = 'admin' } = req.body;
    
    if (!organizationId || !organizationSlug) {
      return res.status(400).json({
        success: false,
        message: 'Organization ID and slug are required'
      });
    }
    
    // Verify organization exists and is active
    const organization = await Organization.findById(organizationId);
    if (!organization || !organization.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Organization not found or inactive'
      });
    }
    
    // Generate magic login token
    const jwt = require('jsonwebtoken');
    const crypto = require('crypto');
    
    const magicToken = jwt.sign(
      {
        globalAdminId: req.user._id,
        globalAdminUsername: req.user.username,
        organizationId: organizationId,
        organizationSlug: organizationSlug,
        targetRole: targetRole,
        magicLogin: true,
        exp: Math.floor(Date.now() / 1000) + (5 * 60) // 5 minutes expiry
      },
      process.env.JWT_SECRET || 'your-secret-key-change-in-production'
    );
    
    console.log(`🪄 Magic login generated for ${req.user.username} → ${organization.name} (${targetRole})`);
    
    res.json({
      success: true,
      magicToken: magicToken,
      organization: {
        id: organization._id,
        name: organization.name,
        slug: organization.slug
      },
      expiresIn: '5 minutes'
    });
    
  } catch (error) {
    console.error('Magic login error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ============================
// DEPARTMENT ROUTES
// ============================

// Get all departments (Global Admin) or departments by organization (Org Admin)
router.get('/departments', requireAdminAccess, async (req, res) => {
  try {
    const { organizationId } = req.query;
    let departments;

    if (req.user.role === 'global_admin') {
      // Global admin can see all departments
      departments = await DepartmentService.getAllDepartments(req.user.userId, { organizationId });
    } else {
      // Org admin can only see their organization's departments
      const userOrgId = organizationId || req.user.organizationId;
      if (!userOrgId) {
        return res.status(400).json({ 
          success: false, 
          message: 'Organization ID required' 
        });
      }
      departments = await DepartmentService.getDepartmentsByOrganization(userOrgId, req.user.userId);
    }

    res.json({ success: true, data: departments });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Get department by ID
router.get('/departments/:id', requireAdminAccess, async (req, res) => {
  try {
    const department = await DepartmentService.getDepartmentById(req.params.id, req.user.userId);
    res.json({ success: true, data: department });
  } catch (error) {
    res.status(404).json({ success: false, message: error.message });
  }
});

// Create new department
router.post('/departments', requireAdminAccess, async (req, res) => {
  try {
    // If org admin, ensure they're creating for their organization
    if (req.user.role === 'admin' && !req.body.organizationId) {
      req.body.organizationId = req.user.organizationId;
    }

    const department = await DepartmentService.createDepartment(req.body, req.user.userId);
    
    res.status(201).json({ 
      success: true, 
      message: 'Department created successfully',
      data: department 
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Update department
router.put('/departments/:id', requireAdminAccess, async (req, res) => {
  try {
    const department = await DepartmentService.updateDepartment(
      req.params.id, 
      req.body, 
      req.user.userId
    );
    
    res.json({ 
      success: true, 
      message: 'Department updated successfully',
      data: department 
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Delete department
router.delete('/departments/:id', requireAdminAccess, async (req, res) => {
  try {
    const result = await DepartmentService.deleteDepartment(req.params.id, req.user.userId);
    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Get department analytics
router.get('/departments/:id/analytics', requireAdminAccess, async (req, res) => {
  try {
    const analytics = await DepartmentService.getDepartmentAnalytics(
      req.params.id, 
      req.user.userId
    );
    res.json({ success: true, data: analytics });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ============================
// PLAN MANAGEMENT ROUTES (Service Agents)
// ============================

// Get current organization details for org-admin
router.get('/organizations/current', requireAdminAccess, async (req, res) => {
  try {
    let organizationId;
    
    // For magic login users, use their organization
    if (req.user.magicLogin && req.user.organizationId) {
      organizationId = req.user.organizationId;
    } else if (req.user.organizationId) {
      organizationId = req.user.organizationId;
    } else {
      return res.status(400).json({ 
        success: false, 
        message: 'No organization context available' 
      });
    }

    const organization = await Organization.findById(organizationId).select('-__v');
    
    if (!organization) {
      return res.status(404).json({ 
        success: false, 
        message: 'Organization not found' 
      });
    }

    res.json({
      success: true,
      organization: organization.toObject()
    });
  } catch (error) {
    console.error('❌ Error getting current organization:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get organization usage data
router.get('/organizations/current/usage', requireAdminAccess, async (req, res) => {
  try {
    let organizationId;
    
    if (req.user.magicLogin && req.user.organizationId) {
      organizationId = req.user.organizationId;
    } else if (req.user.organizationId) {
      organizationId = req.user.organizationId;
    } else {
      return res.status(400).json({ 
        success: false, 
        message: 'No organization context available' 
      });
    }

    const organization = await Organization.findById(organizationId);
    if (!organization) {
      return res.status(404).json({ 
        success: false, 
        message: 'Organization not found' 
      });
    }

    // Get current usage data
    const User = require('../models/User');
    const Knowledge = require('../models/Knowledge');

    const [agentCount, knowledgeStats] = await Promise.all([
      User.countDocuments({ 
        organizationId: organizationId, 
        role: { $in: ['agent', 'admin'] },
        isActive: true 
      }),
      Knowledge.aggregate([
        { $match: { organizationId: organizationId } },
        { $group: { 
          _id: null, 
          totalSize: { $sum: '$size' },
          count: { $sum: 1 }
        }}
      ])
    ]);

    const kbData = knowledgeStats[0] || { totalSize: 0, count: 0 };
    
    // Get plan limits
    const planLimits = {
      free: { agents: 1, knowledgeBase: 50 * 1024 * 1024, conversations: 100 }, // 50MB
      professional: { agents: 10, knowledgeBase: 1024 * 1024 * 1024, conversations: 2500 }, // 1GB
      business: { agents: 25, knowledgeBase: 5 * 1024 * 1024 * 1024, conversations: 10000 } // 5GB
    };

    const currentPlan = organization.subscription?.plan || 'free';
    const limits = planLimits[currentPlan] || planLimits.free;

    const usage = {
      agents: agentCount,
      agentLimit: limits.agents,
      knowledgeBase: kbData.totalSize,
      knowledgeBaseLimit: limits.knowledgeBase,
      conversations: organization.usage?.conversations || 0,
      conversationLimit: limits.conversations,
      plan: currentPlan
    };

    res.json({
      success: true,
      usage
    });
  } catch (error) {
    console.error('❌ Error getting organization usage:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Change organization plan
router.post('/organizations/current/change-plan', requireAdminAccess, async (req, res) => {
  try {
    const { plan } = req.body;
    
    if (!['free', 'professional', 'business'].includes(plan)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid plan selected' 
      });
    }

    let organizationId;
    
    if (req.user.magicLogin && req.user.organizationId) {
      organizationId = req.user.organizationId;
    } else if (req.user.organizationId) {
      organizationId = req.user.organizationId;
    } else {
      return res.status(400).json({ 
        success: false, 
        message: 'No organization context available' 
      });
    }

    const organization = await Organization.findById(organizationId);
    if (!organization) {
      return res.status(404).json({ 
        success: false, 
        message: 'Organization not found' 
      });
    }

    // Update subscription
    organization.subscription = {
      ...organization.subscription,
      plan: plan,
      status: 'active',
      lastUpdated: new Date(),
      updatedBy: req.user.username || req.user.email
    };

    await organization.save();

    console.log(`📋 Plan changed to ${plan} for organization ${organization.name} by ${req.user.username}`);

    res.json({
      success: true,
      message: `Plan successfully changed to ${plan}`,
      subscription: organization.subscription
    });
  } catch (error) {
    console.error('❌ Error changing plan:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Extend trial
router.post('/organizations/current/extend-trial', requireAdminAccess, async (req, res) => {
  try {
    const { days } = req.body;
    
    if (!days || isNaN(days) || days < 1 || days > 90) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid trial extension period (1-90 days)' 
      });
    }

    let organizationId;
    
    if (req.user.magicLogin && req.user.organizationId) {
      organizationId = req.user.organizationId;
    } else if (req.user.organizationId) {
      organizationId = req.user.organizationId;
    } else {
      return res.status(400).json({ 
        success: false, 
        message: 'No organization context available' 
      });
    }

    const organization = await Organization.findById(organizationId);
    if (!organization) {
      return res.status(404).json({ 
        success: false, 
        message: 'Organization not found' 
      });
    }

    // Extend trial
    const currentTrialEnd = organization.subscription?.trialEnd ? 
      new Date(organization.subscription.trialEnd) : new Date();
    
    const newTrialEnd = new Date(currentTrialEnd.getTime() + (days * 24 * 60 * 60 * 1000));

    organization.subscription = {
      ...organization.subscription,
      trialEnd: newTrialEnd,
      status: 'trial',
      lastUpdated: new Date(),
      updatedBy: req.user.username || req.user.email
    };

    await organization.save();

    console.log(`⏰ Trial extended by ${days} days for organization ${organization.name} by ${req.user.username}`);

    res.json({
      success: true,
      message: `Trial extended by ${days} days`,
      newTrialEnd: newTrialEnd
    });
  } catch (error) {
    console.error('❌ Error extending trial:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Reset usage counters
router.post('/organizations/current/reset-usage', requireAdminAccess, async (req, res) => {
  try {
    let organizationId;
    
    if (req.user.magicLogin && req.user.organizationId) {
      organizationId = req.user.organizationId;
    } else if (req.user.organizationId) {
      organizationId = req.user.organizationId;
    } else {
      return res.status(400).json({ 
        success: false, 
        message: 'No organization context available' 
      });
    }

    const organization = await Organization.findById(organizationId);
    if (!organization) {
      return res.status(404).json({ 
        success: false, 
        message: 'Organization not found' 
      });
    }

    // Reset usage counters
    organization.usage = {
      conversations: 0,
      messagesThisMonth: 0,
      lastReset: new Date(),
      resetBy: req.user.username || req.user.email
    };

    await organization.save();

    console.log(`🔄 Usage reset for organization ${organization.name} by ${req.user.username}`);

    res.json({
      success: true,
      message: 'Usage counters reset successfully'
    });
  } catch (error) {
    console.error('❌ Error resetting usage:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get plan activity log (placeholder - would integrate with audit system)
router.get('/organizations/current/plan-activity', requireAdminAccess, async (req, res) => {
  try {
    // This is a placeholder - in a real system you'd have an audit log
    const mockActivity = [
      {
        type: 'upgrade',
        description: 'Plan upgraded to Professional',
        date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        user: req.user.username || 'Service Agent'
      },
      {
        type: 'billing',
        description: 'Monthly billing successful',
        date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
        amount: '$79.00'
      }
    ];

    res.json({
      success: true,
      activity: mockActivity
    });
  } catch (error) {
    console.error('❌ Error getting plan activity:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;