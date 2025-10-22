#!/usr/bin/env node

/**
 * ConvoAI Service User Creation Script
 * Creates service agents, administrators, and other system users
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const readline = require('readline');

// Load environment variables
require('dotenv').config();

// MongoDB connection
const mongoUri = process.env.MONGODB_URI || 'mongodb+srv://DylanP:JWebSA3L8o8M1EIo@cluster0.afz799a.mongodb.net/livechat?retryWrites=true&w=majority&ssl=true&serverSelectionTimeoutMS=30000&socketTimeoutMS=45000';

// User model (simplified for this script)
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { 
        type: String, 
        enum: ['customer', 'agent', 'admin', 'global_admin', 'service_agent', 'guest'], 
        default: 'customer' 
    },
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', default: null },
    departments: {
        type: [String],
        enum: ['general', 'sales', 'technical', 'support', 'billing'],
        default: []
    },
    permissions: {
        canManageOrganizations: { type: Boolean, default: false },
        canManageDepartments: { type: Boolean, default: false },
        canManageUsers: { type: Boolean, default: false },
        canViewAnalytics: { type: Boolean, default: false }
    },
    agentProfile: {
        organization: { type: String, default: 'lightwave' },
        isActive: { type: Boolean, default: true },
        maxConcurrentChats: { type: Number, default: 5 },
        autoAssign: { type: Boolean, default: true },
        skillLevel: { 
            type: String, 
            enum: ['junior', 'senior', 'specialist', 'supervisor'],
            default: 'junior'
        },
        departments: [String]
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

// Role configurations
const ROLE_CONFIGS = {
    service_agent: {
        displayName: 'Service Agent',
        description: 'Full access to service portal, organization and plan management',
        permissions: {
            canManageOrganizations: true,
            canManageDepartments: true,
            canManageUsers: true,
            canViewAnalytics: true
        },
        departments: ['general', 'sales', 'technical', 'support', 'billing']
    },
    global_admin: {
        displayName: 'Global Administrator',
        description: 'Complete system access, all organizations and features',
        permissions: {
            canManageOrganizations: true,
            canManageDepartments: true,
            canManageUsers: true,
            canViewAnalytics: true
        },
        departments: ['*']
    },
    admin: {
        displayName: 'Organization Administrator',
        description: 'Organization-level admin access',
        permissions: {
            canManageOrganizations: false,
            canManageDepartments: true,
            canManageUsers: true,
            canViewAnalytics: true
        },
        departments: ['general', 'sales', 'technical', 'support', 'billing']
    },
    agent: {
        displayName: 'Support Agent',
        description: 'Customer support and chat handling',
        permissions: {
            canManageOrganizations: false,
            canManageDepartments: false,
            canManageUsers: false,
            canViewAnalytics: false
        },
        departments: ['support']
    }
};

class ServiceUserManager {
    constructor() {
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
    }

    async connect() {
        try {
            console.log('🔌 Connecting to MongoDB...');
            await mongoose.connect(mongoUri, {
                useNewUrlParser: true,
                useUnifiedTopology: true,
                serverSelectionTimeoutMS: 30000,
                socketTimeoutMS: 45000
            });
            console.log('✅ Connected to database');
        } catch (error) {
            console.error('❌ Database connection failed:', error.message);
            throw error;
        }
    }

    async disconnect() {
        await mongoose.disconnect();
        this.rl.close();
    }

    async question(prompt) {
        return new Promise((resolve) => {
            this.rl.question(prompt, resolve);
        });
    }

    async createUser(userData) {
        try {
            // Check if user already exists
            const existingUser = await User.findOne({
                $or: [
                    { email: userData.email },
                    { username: userData.username }
                ]
            });

            if (existingUser) {
                throw new Error(`User already exists: ${existingUser.email}`);
            }

            // Hash password
            const hashedPassword = await bcrypt.hash(userData.password, 10);

            // Get role configuration
            const roleConfig = ROLE_CONFIGS[userData.role] || {};

            // Create user with role-based permissions
            const user = new User({
                username: userData.username,
                email: userData.email,
                password: hashedPassword,
                role: userData.role,
                permissions: roleConfig.permissions || {},
                departments: roleConfig.departments || [],
                agentProfile: {
                    organization: userData.organization || 'lightwave',
                    isActive: true,
                    maxConcurrentChats: userData.maxConcurrentChats || 5,
                    autoAssign: userData.autoAssign !== false,
                    skillLevel: userData.skillLevel || 'junior',
                    departments: roleConfig.departments || []
                }
            });

            await user.save();
            return user;
        } catch (error) {
            throw error;
        }
    }

    async listUsers(role = null) {
        try {
            const query = role ? { role } : {};
            const users = await User.find(query).select('-password').lean();
            
            console.log(`\n📋 Found ${users.length} user(s):`);
            users.forEach(user => {
                console.log(`   • ${user.email} (${user.username}) - Role: ${user.role}`);
                console.log(`     Created: ${new Date(user.createdAt).toLocaleDateString()}`);
            });
            
            return users;
        } catch (error) {
            throw error;
        }
    }

    async deleteUser(email) {
        try {
            const user = await User.findOneAndDelete({ email });
            if (!user) {
                throw new Error('User not found');
            }
            console.log(`✅ Deleted user: ${email}`);
            return true;
        } catch (error) {
            throw error;
        }
    }

    async interactiveMode() {
        console.log('\n🎯 ConvoAI Service User Manager');
        console.log('=====================================\n');

        while (true) {
            console.log('Available actions:');
            console.log('1. Create Service Agent');
            console.log('2. Create Global Admin');
            console.log('3. Create Organization Admin');
            console.log('4. Create Support Agent');
            console.log('5. List all users');
            console.log('6. List users by role');
            console.log('7. Delete user');
            console.log('8. Exit');

            const choice = await this.question('\nSelect an action (1-8): ');

            try {
                switch (choice) {
                    case '1':
                        await this.createServiceAgent();
                        break;
                    case '2':
                        await this.createGlobalAdmin();
                        break;
                    case '3':
                        await this.createOrgAdmin();
                        break;
                    case '4':
                        await this.createSupportAgent();
                        break;
                    case '5':
                        await this.listUsers();
                        break;
                    case '6':
                        await this.listUsersByRole();
                        break;
                    case '7':
                        await this.deleteUserInteractive();
                        break;
                    case '8':
                        console.log('👋 Goodbye!');
                        return;
                    default:
                        console.log('❌ Invalid choice. Please select 1-8.');
                }
            } catch (error) {
                console.error('❌ Error:', error.message);
            }

            console.log('\n' + '='.repeat(50) + '\n');
        }
    }

    async createServiceAgent() {
        console.log('\n🔧 Creating Service Agent...');
        
        const email = await this.question('Email: ');
        const username = await this.question('Username: ');
        const password = await this.question('Password: ');
        const organization = await this.question('Organization (default: lightwave): ') || 'lightwave';

        const user = await this.createUser({
            email,
            username,
            password,
            role: 'service_agent',
            organization
        });

        console.log('✅ Service Agent created successfully!');
        console.log(`   Email: ${user.email}`);
        console.log(`   Username: ${user.username}`);
        console.log(`   Role: ${user.role}`);
        console.log(`   Access: Service Portal (/service-portal)`);
    }

    async createGlobalAdmin() {
        console.log('\n👑 Creating Global Administrator...');
        
        const email = await this.question('Email: ');
        const username = await this.question('Username: ');
        const password = await this.question('Password: ');

        const user = await this.createUser({
            email,
            username,
            password,
            role: 'global_admin'
        });

        console.log('✅ Global Administrator created successfully!');
        console.log(`   Email: ${user.email}`);
        console.log(`   Username: ${user.username}`);
        console.log(`   Role: ${user.role}`);
        console.log(`   Access: All admin portals and service portal`);
    }

    async createOrgAdmin() {
        console.log('\n🏢 Creating Organization Administrator...');
        
        const email = await this.question('Email: ');
        const username = await this.question('Username: ');
        const password = await this.question('Password: ');
        const organization = await this.question('Organization: ');

        const user = await this.createUser({
            email,
            username,
            password,
            role: 'admin',
            organization
        });

        console.log('✅ Organization Administrator created successfully!');
        console.log(`   Email: ${user.email}`);
        console.log(`   Username: ${user.username}`);
        console.log(`   Role: ${user.role}`);
        console.log(`   Organization: ${organization}`);
    }

    async createSupportAgent() {
        console.log('\n💬 Creating Support Agent...');
        
        const email = await this.question('Email: ');
        const username = await this.question('Username: ');
        const password = await this.question('Password: ');
        const organization = await this.question('Organization: ');
        const skillLevel = await this.question('Skill Level (junior/senior/specialist/supervisor): ') || 'junior';

        const user = await this.createUser({
            email,
            username,
            password,
            role: 'agent',
            organization,
            skillLevel
        });

        console.log('✅ Support Agent created successfully!');
        console.log(`   Email: ${user.email}`);
        console.log(`   Username: ${user.username}`);
        console.log(`   Role: ${user.role}`);
        console.log(`   Skill Level: ${skillLevel}`);
    }

    async listUsersByRole() {
        const role = await this.question('Enter role (service_agent/global_admin/admin/agent): ');
        await this.listUsers(role);
    }

    async deleteUserInteractive() {
        const email = await this.question('Enter email of user to delete: ');
        const confirm = await this.question(`Are you sure you want to delete ${email}? (yes/no): `);
        
        if (confirm.toLowerCase() === 'yes') {
            await this.deleteUser(email);
        } else {
            console.log('❌ Deletion cancelled');
        }
    }

    async quickCreate(role, email, username, password, options = {}) {
        try {
            const user = await this.createUser({
                email,
                username,
                password,
                role,
                ...options
            });

            console.log(`✅ ${ROLE_CONFIGS[role]?.displayName || role} created successfully!`);
            console.log(`   Email: ${user.email}`);
            console.log(`   Username: ${user.username}`);
            console.log(`   Role: ${user.role}`);
            
            return user;
        } catch (error) {
            console.error('❌ Creation failed:', error.message);
            throw error;
        }
    }
}

// CLI Mode handling
async function main() {
    const manager = new ServiceUserManager();
    
    try {
        await manager.connect();

        // Check command line arguments
        const args = process.argv.slice(2);
        
        if (args.length === 0) {
            // Interactive mode
            await manager.interactiveMode();
        } else {
            // CLI mode
            const [action, role, email, username, password] = args;
            
            if (action === 'create' && role && email && username && password) {
                await manager.quickCreate(role, email, username, password);
            } else if (action === 'list') {
                await manager.listUsers(role);
            } else if (action === 'delete' && email) {
                await manager.deleteUser(email);
            } else {
                console.log('Usage:');
                console.log('  Interactive mode: node create-service-users.js');
                console.log('  Create user: node create-service-users.js create <role> <email> <username> <password>');
                console.log('  List users: node create-service-users.js list [role]');
                console.log('  Delete user: node create-service-users.js delete <email>');
                console.log('');
                console.log('Available roles: service_agent, global_admin, admin, agent');
            }
        }
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    } finally {
        await manager.disconnect();
    }
}

// Handle script execution
if (require.main === module) {
    main();
}

module.exports = ServiceUserManager;