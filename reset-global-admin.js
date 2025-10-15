#!/usr/bin/env node

/**
 * ConvoAI Global Admin Reset Script
 * 
 * This script completely resets the global admin login system:
 * - Removes all existing admin users
 * - Creates a fresh global admin account
 * - Clears admin sessions and tokens
 * - Resets permissions and roles
 * 
 * Usage: node reset-global-admin.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Import models
const User = require('./src/server/models/User');

const RESET_CONFIG = {
    // New global admin credentials
    globalAdmin: {
        username: 'globaladmin',
        email: 'global@convoai.com',
        password: 'ConvoAI2025!',
        role: 'global_admin'
    },
    
    // Backup admin credentials  
    backupAdmin: {
        username: 'admin',
        email: 'admin@convoai.com', 
        password: 'admin123',
        role: 'admin'
    },
    
    // Agent test account
    testAgent: {
        username: 'testagent',
        email: 'agent@convoai.com',
        password: 'agent123', 
        role: 'agent'
    }
};

class AdminResetService {
    constructor() {
        this.connectionAttempts = 0;
        this.maxRetries = 3;
    }

    async connectDatabase() {
        try {
            console.log('🔌 Connecting to MongoDB...');
            
            const options = {
                useNewUrlParser: true,
                useUnifiedTopology: true,
                serverSelectionTimeoutMS: 30000,
                socketTimeoutMS: 45000
            };

            await mongoose.connect(process.env.MONGODB_URI, options);
            console.log('✅ Connected to MongoDB Atlas');
            console.log(`📊 Database: ${mongoose.connection.name}`);
            
            return true;
        } catch (error) {
            this.connectionAttempts++;
            console.error(`❌ Connection attempt ${this.connectionAttempts} failed:`, error.message);
            
            if (this.connectionAttempts < this.maxRetries) {
                console.log('🔄 Retrying connection in 3 seconds...');
                await this.sleep(3000);
                return this.connectDatabase();
            }
            
            throw new Error(`Failed to connect after ${this.maxRetries} attempts`);
        }
    }

    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async removeExistingAdmins() {
        console.log('\n🧹 Step 1: Removing existing admin users...');
        
        try {
            // Find all admin users
            const adminUsers = await User.find({
                role: { $in: ['admin', 'super_admin', 'global_admin'] }
            });
            
            console.log(`📋 Found ${adminUsers.length} existing admin users:`);
            adminUsers.forEach(user => {
                console.log(`   • ${user.email} (${user.role})`);
            });
            
            // Remove all admin users
            if (adminUsers.length > 0) {
                const result = await User.deleteMany({
                    role: { $in: ['admin', 'super_admin', 'global_admin'] }
                });
                
                console.log(`✅ Removed ${result.deletedCount} admin users`);
            } else {
                console.log('ℹ️  No existing admin users found');
            }
            
            return true;
        } catch (error) {
            console.error('❌ Error removing admin users:', error.message);
            throw error;
        }
    }

    async createGlobalAdmin() {
        console.log('\n👤 Step 2: Creating new global admin...');
        
        try {
            const config = RESET_CONFIG.globalAdmin;
            
            // Hash password
            const hashedPassword = await bcrypt.hash(config.password, 12);
            
            // Create global admin user
            const globalAdmin = new User({
                username: config.username,
                email: config.email,
                password: hashedPassword,
                role: config.role,
                isActive: true,
                isOnline: false,
                departments: ['general', 'sales', 'technical', 'support', 'billing'], // All departments
                permissions: {
                    canManageOrganizations: true,
                    canManageDepartments: true,
                    canManageUsers: true,
                    canManageSettings: true,
                    canViewAnalytics: true,
                    canManageIntegrations: true,
                    canAccessAllChats: true,
                    canDeleteChats: true,
                    canExportData: true,
                    canManageKnowledgeBase: true
                },
                profile: {
                    firstName: 'Global',
                    lastName: 'Administrator',
                    avatar: null,
                    bio: 'ConvoAI Global Administrator - Full System Access',
                    phone: null,
                    timezone: 'UTC'
                },
                lastLogin: null,
                createdAt: new Date(),
                updatedAt: new Date()
            });
            
            await globalAdmin.save();
            
            console.log('✅ Global admin created successfully!');
            console.log('🔑 Login Credentials:');
            console.log(`   Email: ${config.email}`);
            console.log(`   Password: ${config.password}`);
            console.log(`   Role: ${config.role}`);
            
            return globalAdmin;
        } catch (error) {
            console.error('❌ Error creating global admin:', error.message);
            throw error;
        }
    }

    async createBackupAdmin() {
        console.log('\n🛡️  Step 3: Creating backup admin...');
        
        try {
            const config = RESET_CONFIG.backupAdmin;
            
            // Hash password
            const hashedPassword = await bcrypt.hash(config.password, 12);
            
            // Create backup admin user
            const backupAdmin = new User({
                username: config.username,
                email: config.email,
                password: hashedPassword,
                role: config.role,
                isActive: true,
                isOnline: false,
                departments: ['general', 'sales', 'technical', 'support'],
                permissions: {
                    canManageOrganizations: true,
                    canManageDepartments: true,
                    canManageUsers: true,
                    canManageSettings: true,
                    canViewAnalytics: true,
                    canManageIntegrations: false,
                    canAccessAllChats: true,
                    canDeleteChats: false,
                    canExportData: true,
                    canManageKnowledgeBase: true
                },
                profile: {
                    firstName: 'System',
                    lastName: 'Admin',
                    avatar: null,
                    bio: 'ConvoAI System Administrator',
                    phone: null,
                    timezone: 'UTC'
                },
                lastLogin: null,
                createdAt: new Date(),
                updatedAt: new Date()
            });
            
            await backupAdmin.save();
            
            console.log('✅ Backup admin created successfully!');
            console.log('🔑 Backup Credentials:');
            console.log(`   Email: ${config.email}`);
            console.log(`   Password: ${config.password}`);
            console.log(`   Role: ${config.role}`);
            
            return backupAdmin;
        } catch (error) {
            console.error('❌ Error creating backup admin:', error.message);
            throw error;
        }
    }

    async createTestAgent() {
        console.log('\n🎭 Step 4: Creating test agent...');
        
        try {
            const config = RESET_CONFIG.testAgent;
            
            // Hash password
            const hashedPassword = await bcrypt.hash(config.password, 12);
            
            // Create test agent user
            const testAgent = new User({
                username: config.username,
                email: config.email,
                password: hashedPassword,
                role: config.role,
                isActive: true,
                isOnline: false,
                departments: ['general', 'support'],
                permissions: {
                    canManageOrganizations: false,
                    canManageDepartments: false,
                    canManageUsers: false,
                    canManageSettings: false,
                    canViewAnalytics: false,
                    canManageIntegrations: false,
                    canAccessAllChats: false,
                    canDeleteChats: false,
                    canExportData: false,
                    canManageKnowledgeBase: false
                },
                profile: {
                    firstName: 'Test',
                    lastName: 'Agent',
                    avatar: null,
                    bio: 'ConvoAI Test Agent Account',
                    phone: null,
                    timezone: 'UTC'
                },
                lastLogin: null,
                createdAt: new Date(),
                updatedAt: new Date()
            });
            
            await testAgent.save();
            
            console.log('✅ Test agent created successfully!');
            console.log('🔑 Agent Credentials:');
            console.log(`   Email: ${config.email}`);
            console.log(`   Password: ${config.password}`);
            console.log(`   Role: ${config.role}`);
            
            return testAgent;
        } catch (error) {
            console.error('❌ Error creating test agent:', error.message);
            throw error;
        }
    }

    async verifySetup() {
        console.log('\n✅ Step 5: Verifying setup...');
        
        try {
            // Count users by role
            const userCounts = await User.aggregate([
                {
                    $group: {
                        _id: '$role',
                        count: { $sum: 1 }
                    }
                }
            ]);
            
            console.log('📊 User Summary:');
            userCounts.forEach(item => {
                console.log(`   ${item._id}: ${item.count} users`);
            });
            
            // Verify admin can login
            const globalAdmin = await User.findOne({ 
                email: RESET_CONFIG.globalAdmin.email 
            });
            
            if (!globalAdmin) {
                throw new Error('Global admin not found after creation');
            }
            
            const passwordValid = await bcrypt.compare(
                RESET_CONFIG.globalAdmin.password, 
                globalAdmin.password
            );
            
            if (!passwordValid) {
                throw new Error('Global admin password verification failed');
            }
            
            console.log('✅ Global admin login verification passed');
            
            return true;
        } catch (error) {
            console.error('❌ Setup verification failed:', error.message);
            throw error;
        }
    }

    async generateLoginUrls() {
        console.log('\n🌐 Step 6: Generating login URLs...');
        
        const baseUrl = process.env.DOMAIN ? 
            `https://${process.env.DOMAIN}` : 
            'http://localhost:3000';
        
        console.log('🔗 Admin Portal URLs:');
        console.log(`   Login Page: ${baseUrl}/admin-login`);
        console.log(`   Agent Portal: ${baseUrl}/agent`);
        console.log(`   Admin Portal: ${baseUrl}/admin`);
        console.log(`   Org Admin Portal: ${baseUrl}/org-admin`);
        
        console.log('\n📋 Quick Test Commands:');
        console.log(`   curl -X POST ${baseUrl}/api/admin-login \\`);
        console.log('     -H "Content-Type: application/json" \\');
        console.log('     -d \'{"email":"global@convoai.com","password":"ConvoAI2025!","role":"admin"}\'');
    }

    async cleanup() {
        console.log('\n🧹 Cleaning up...');
        
        try {
            await mongoose.connection.close();
            console.log('👋 Database connection closed');
        } catch (error) {
            console.error('⚠️  Error during cleanup:', error.message);
        }
    }

    async resetComplete() {
        try {
            console.log('🚀 ConvoAI Global Admin Reset Script');
            console.log('=====================================\n');
            
            // Step 1: Connect to database
            await this.connectDatabase();
            
            // Step 2: Remove existing admins
            await this.removeExistingAdmins();
            
            // Step 3: Create new global admin
            await this.createGlobalAdmin();
            
            // Step 4: Create backup admin
            await this.createBackupAdmin();
            
            // Step 5: Create test agent
            await this.createTestAgent();
            
            // Step 6: Verify setup
            await this.verifySetup();
            
            // Step 7: Generate URLs
            await this.generateLoginUrls();
            
            console.log('\n🎉 GLOBAL ADMIN RESET COMPLETED SUCCESSFULLY!');
            console.log('=====================================');
            console.log('⚠️  IMPORTANT: Please save these credentials safely!');
            console.log('🔐 Change default passwords after first login');
            console.log('📝 Update your environment variables if needed');
            
        } catch (error) {
            console.error('\n💥 RESET FAILED:', error.message);
            console.error('Stack:', error.stack);
            process.exit(1);
            
        } finally {
            await this.cleanup();
        }
    }
}

// Run the reset if called directly
if (require.main === module) {
    const resetService = new AdminResetService();
    resetService.resetComplete();
}

module.exports = AdminResetService;