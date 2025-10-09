const Department = require('../models/Department');
const User = require('../models/User');
const Organization = require('../models/Organization');

class DepartmentService {
  
  // Create new department
  async createDepartment(data, userId) {
    try {
      // Validate user permissions
      const user = await User.findById(userId);
      if (!user || !user.permissions.canManageDepartments) {
        throw new Error('Unauthorized: Insufficient permissions to create departments');
      }

      // If user is org admin, ensure they're creating dept for their org
      if (user.role === 'admin' && user.organizationId?.toString() !== data.organizationId) {
        throw new Error('Unauthorized: Can only create departments for your organization');
      }

      // Validate organization exists
      const organization = await Organization.findById(data.organizationId);
      if (!organization) {
        throw new Error('Organization not found');
      }

      // Create slug from name
      const slug = data.name.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

      // Check if department already exists in this organization
      const existingDept = await Department.findOne({ 
        organizationId: data.organizationId,
        $or: [{ name: data.name }, { slug: slug }]
      });
      
      if (existingDept) {
        throw new Error('Department with this name already exists in this organization');
      }

      // Create department
      const department = new Department({
        name: data.name,
        slug: slug,
        organizationId: data.organizationId,
        description: data.description || '',
        color: data.color || '#4299e1',
        icon: data.icon || 'fas fa-comments',
        autoAssignment: {
          enabled: data.autoAssignmentEnabled !== false,
          strategy: data.autoAssignmentStrategy || 'round-robin',
          maxQueueSize: data.maxQueueSize || 50
        },
        settings: {
          priority: data.priority || 1,
          requiresSkill: data.requiresSkill || [],
          escalationRules: {
            enabled: data.escalationEnabled || false,
            timeoutMinutes: data.escalationTimeout || 10,
            escalateTo: data.escalateTo || ''
          }
        }
      });

      const savedDept = await department.save();
      return await Department.findById(savedDept._id).populate('organizationId', 'name slug');
    } catch (error) {
      throw new Error(`Failed to create department: ${error.message}`);
    }
  }

  // Get departments by organization
  async getDepartmentsByOrganization(organizationId, userId) {
    try {
      // Validate user permissions
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Check access permissions
      const canAccess = user.role === 'global_admin' || 
                       user.organizationId?.toString() === organizationId ||
                       user.departments.includes('*');

      if (!canAccess) {
        throw new Error('Unauthorized: Cannot access departments for this organization');
      }

      return await Department.find({ 
        organizationId, 
        isActive: true 
      })
      .populate('organizationId', 'name slug')
      .sort({ name: 1 });
    } catch (error) {
      throw new Error(`Failed to get departments: ${error.message}`);
    }
  }

  // Get all departments (global admin only)
  async getAllDepartments(userId, filters = {}) {
    try {
      // Validate global admin permissions
      const user = await User.findById(userId);
      if (!user || user.role !== 'global_admin') {
        throw new Error('Unauthorized: Only global admins can view all departments');
      }

      const query = {};
      
      if (filters.organizationId) {
        query.organizationId = filters.organizationId;
      }
      
      if (filters.isActive !== undefined) {
        query.isActive = filters.isActive;
      }

      return await Department.find(query)
        .populate('organizationId', 'name slug')
        .sort({ 'organizationId': 1, name: 1 });
    } catch (error) {
      throw new Error(`Failed to get departments: ${error.message}`);
    }
  }

  // Get department by ID
  async getDepartmentById(id, userId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const department = await Department.findById(id)
        .populate('organizationId', 'name slug');
      
      if (!department) {
        throw new Error('Department not found');
      }

      // Check access permissions
      const canAccess = user.role === 'global_admin' || 
                       user.organizationId?.toString() === department.organizationId._id.toString() ||
                       user.departments.includes('*');

      if (!canAccess) {
        throw new Error('Unauthorized: Cannot access this department');
      }

      // Get additional stats
      const agentCount = await User.countDocuments({
        organizationId: department.organizationId._id,
        role: 'agent',
        departments: department.slug
      });

      return {
        ...department.toObject(),
        stats: {
          agentCount
        }
      };
    } catch (error) {
      throw new Error(`Failed to get department: ${error.message}`);
    }
  }

  // Update department
  async updateDepartment(id, data, userId) {
    try {
      const user = await User.findById(userId);
      const department = await Department.findById(id);
      
      if (!user) {
        throw new Error('User not found');
      }
      
      if (!department) {
        throw new Error('Department not found');
      }

      // Check permissions
      const canUpdate = user.role === 'global_admin' || 
                       (user.permissions.canManageDepartments && 
                        user.organizationId?.toString() === department.organizationId.toString());
      
      if (!canUpdate) {
        throw new Error('Unauthorized: Cannot update this department');
      }

      // Update department
      const updatedDept = await Department.findByIdAndUpdate(
        id,
        { 
          ...data, 
          updatedAt: new Date() 
        },
        { new: true }
      ).populate('organizationId', 'name slug');

      return updatedDept;
    } catch (error) {
      throw new Error(`Failed to update department: ${error.message}`);
    }
  }

  // Delete department
  async deleteDepartment(id, userId) {
    try {
      const user = await User.findById(userId);
      const department = await Department.findById(id);
      
      if (!user) {
        throw new Error('User not found');
      }
      
      if (!department) {
        throw new Error('Department not found');
      }

      // Check permissions
      const canDelete = user.role === 'global_admin' || 
                       (user.permissions.canManageDepartments && 
                        user.organizationId?.toString() === department.organizationId.toString());
      
      if (!canDelete) {
        throw new Error('Unauthorized: Cannot delete this department');
      }

      // Remove department from agents
      await User.updateMany(
        { organizationId: department.organizationId, departments: department.slug },
        { $pull: { departments: department.slug } }
      );

      // Delete department
      await Department.findByIdAndDelete(id);

      return { success: true, message: 'Department deleted successfully' };
    } catch (error) {
      throw new Error(`Failed to delete department: ${error.message}`);
    }
  }

  // Get department analytics
  async getDepartmentAnalytics(departmentId, userId) {
    try {
      const user = await User.findById(userId);
      const department = await Department.findById(departmentId);
      
      if (!user || !department) {
        throw new Error('User or department not found');
      }

      // Check permissions
      const canAccess = user.role === 'global_admin' || 
                       user.organizationId?.toString() === department.organizationId.toString();
      
      if (!canAccess) {
        throw new Error('Unauthorized: Cannot access department analytics');
      }

      const [
        totalAgents,
        activeAgents,
        totalChats,
        avgResponseTime
      ] = await Promise.all([
        User.countDocuments({
          organizationId: department.organizationId,
          role: 'agent',
          departments: department.slug
        }),
        User.countDocuments({
          organizationId: department.organizationId,
          role: 'agent',
          departments: department.slug,
          isOnline: true
        }),
        // This would need integration with your chat/message model
        0, // Placeholder for total chats
        0  // Placeholder for avg response time
      ]);

      return {
        totalAgents,
        activeAgents,
        totalChats,
        avgResponseTime,
        metrics: department.metrics
      };
    } catch (error) {
      throw new Error(`Failed to get department analytics: ${error.message}`);
    }
  }

  // Update department metrics
  async updateDepartmentMetrics(departmentId, metrics) {
    return await Department.findByIdAndUpdate(
      departmentId,
      { 
        metrics: {
          ...metrics,
          lastUpdated: new Date()
        }
      },
      { new: true }
    );
  }
}

module.exports = new DepartmentService();