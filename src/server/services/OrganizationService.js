const Organization = require('../models/Organization');
const User = require('../models/User');
const Department = require('../models/Department');

class OrganizationService {
  
  // Create new organization
  async createOrganization(data, globalAdminId) {
    try {
      // Validate global admin permissions
      const globalAdmin = await User.findById(globalAdminId);
      if (!globalAdmin || globalAdmin.role !== 'global_admin') {
        throw new Error('Unauthorized: Only global admins can create organizations');
      }

      // Create slug from name
      const slug = data.name.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

      // Check if organization already exists
      const existingOrg = await Organization.findOne({ 
        $or: [{ name: data.name }, { slug: slug }] 
      });
      
      if (existingOrg) {
        throw new Error('Organization with this name already exists');
      }

      // Create organization admin if provided
      let adminId = data.adminId;
      if (data.createAdmin) {
        const adminUser = new User({
          username: data.adminUsername,
          email: data.adminEmail,
          password: data.adminPassword, // This should be hashed by AuthService
          role: 'admin',
          departments: ['general', 'sales', 'technical', 'support', 'billing'],
          permissions: {
            canManageOrganizations: false,
            canManageDepartments: true,
            canManageUsers: true,
            canViewAnalytics: true
          }
        });
        
        const savedAdmin = await adminUser.save();
        adminId = savedAdmin._id;
      }

      // Create organization
      const organization = new Organization({
        name: data.name,
        slug: slug,
        description: data.description || '',
        adminId: adminId,
        settings: {
          allowSelfRegistration: data.allowSelfRegistration || false,
          maxAgents: data.maxAgents || 50,
          maxDepartments: data.maxDepartments || 10,
          timezone: data.timezone || 'UTC'
        },
        branding: {
          primaryColor: data.primaryColor || '#4299e1',
          welcomeMessage: data.welcomeMessage || 'Welcome! How can we help you today?'
        }
      });

      const savedOrg = await organization.save();

      // Update admin user with organization ID
      if (adminId) {
        await User.findByIdAndUpdate(adminId, { organizationId: savedOrg._id });
      }

      // Create default departments
      await this.createDefaultDepartments(savedOrg._id);

      return await Organization.findById(savedOrg._id).populate('adminId', 'username email');
    } catch (error) {
      throw new Error(`Failed to create organization: ${error.message}`);
    }
  }

  // Create default departments for new organization
  async createDefaultDepartments(organizationId) {
    const defaultDepartments = [
      {
        name: 'General Support',
        slug: 'general',
        description: 'General customer inquiries and support',
        color: '#4299e1',
        icon: 'fas fa-comments'
      },
      {
        name: 'Sales',
        slug: 'sales',
        description: 'Sales inquiries and product information',
        color: '#48bb78',
        icon: 'fas fa-shopping-cart'
      },
      {
        name: 'Technical Support',
        slug: 'technical',
        description: 'Technical issues and troubleshooting',
        color: '#ed8936',
        icon: 'fas fa-tools'
      },
      {
        name: 'Billing',
        slug: 'billing',
        description: 'Billing and payment related questions',
        color: '#9f7aea',
        icon: 'fas fa-credit-card'
      }
    ];

    const departments = defaultDepartments.map(dept => ({
      ...dept,
      organizationId: organizationId
    }));

    return await Department.insertMany(departments);
  }

  // Get all organizations
  async getAllOrganizations(filters = {}) {
    const query = {};
    
    if (filters.isActive !== undefined) {
      query.isActive = filters.isActive;
    }

    return await Organization.find(query)
      .populate('adminId', 'username email role')
      .sort({ createdAt: -1 });
  }

  // Get organization by ID
  async getOrganizationById(id) {
    const org = await Organization.findById(id)
      .populate('adminId', 'username email role');
    
    if (!org) {
      throw new Error('Organization not found');
    }

    // Get departments count
    const departmentCount = await Department.countDocuments({ organizationId: id, isActive: true });
    
    // Get users count
    const userCount = await User.countDocuments({ organizationId: id });

    return {
      ...org.toObject(),
      stats: {
        departmentCount,
        userCount
      }
    };
  }

  // Update organization
  async updateOrganization(id, data, updaterId) {
    try {
      // Validate permissions
      const updater = await User.findById(updaterId);
      const organization = await Organization.findById(id);
      
      if (!organization) {
        throw new Error('Organization not found');
      }

      // Check if user has permission to update this organization
      const canUpdate = updater.role === 'global_admin' || 
                       (updater.role === 'admin' && updater.organizationId?.toString() === id);
      
      if (!canUpdate) {
        throw new Error('Unauthorized to update this organization');
      }

      // Update organization
      const updatedOrg = await Organization.findByIdAndUpdate(
        id,
        { ...data, updatedAt: new Date() },
        { new: true }
      ).populate('adminId', 'username email');

      return updatedOrg;
    } catch (error) {
      throw new Error(`Failed to update organization: ${error.message}`);
    }
  }

  // Delete organization
  async deleteOrganization(id, globalAdminId) {
    try {
      // Validate global admin permissions
      const globalAdmin = await User.findById(globalAdminId);
      if (!globalAdmin || globalAdmin.role !== 'global_admin') {
        throw new Error('Unauthorized: Only global admins can delete organizations');
      }

      const organization = await Organization.findById(id);
      if (!organization) {
        throw new Error('Organization not found');
      }

      // Delete all departments in this organization
      await Department.deleteMany({ organizationId: id });

      // Remove organization reference from users
      await User.updateMany(
        { organizationId: id },
        { $unset: { organizationId: 1 } }
      );

      // Delete organization
      await Organization.findByIdAndDelete(id);

      return { success: true, message: 'Organization deleted successfully' };
    } catch (error) {
      throw new Error(`Failed to delete organization: ${error.message}`);
    }
  }

  // Get organization analytics
  async getOrganizationAnalytics(organizationId) {
    const [
      totalUsers,
      totalDepartments,
      totalChats,
      activeAgents
    ] = await Promise.all([
      User.countDocuments({ organizationId }),
      Department.countDocuments({ organizationId, isActive: true }),
      // This would need to be updated based on your chat/message model
      0, // Placeholder for total chats
      User.countDocuments({ organizationId, role: 'agent', isOnline: true })
    ]);

    return {
      totalUsers,
      totalDepartments,
      totalChats,
      activeAgents
    };
  }
}

module.exports = new OrganizationService();