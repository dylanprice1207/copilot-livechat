# ConvoAI Admin Reset Scripts

Complete toolkit for resetting the global admin login system for your ConvoAI live chat platform.

## 🚀 Quick Start

### Option 1: Quick Reset (Recommended)
```bash
# Fast reset - creates global admin only
node quick-admin-reset.js

# Or use npm script
npm run quick-reset
```

### Option 2: Windows Batch File
```bash
# Double-click or run from command line
reset-admin.bat
```

### Option 3: Comprehensive Reset
```bash
# Full reset with multiple admin accounts
node reset-global-admin.js

# Or use npm script  
npm run reset-admin
```

## 🔑 Default Credentials

After running any reset script, use these credentials:

| Role | Email | Password | Access Level |
|------|-------|----------|--------------|
| **Global Admin** | `global@convoai.com` | `ConvoAI2025!` | Full system access |
| Backup Admin | `admin@convoai.com` | `admin123` | System admin |
| Test Agent | `agent@convoai.com` | `agent123` | Agent dashboard |

## 🌐 Admin Portal URLs

After reset, access your admin portals:

- **Login Page**: http://localhost:3000/admin-login
- **Agent Portal**: http://localhost:3000/agent
- **Admin Portal**: http://localhost:3000/admin  
- **Org Admin Portal**: http://localhost:3000/org-admin

## 📋 What Each Script Does

### `quick-admin-reset.js`
- ✅ **Fast execution** (< 5 seconds)
- ✅ Creates single global admin account
- ✅ Cleans up existing duplicates
- ✅ Perfect for development

### `reset-global-admin.js`
- ✅ **Comprehensive reset**
- ✅ Creates multiple admin accounts
- ✅ Full permission system setup
- ✅ Detailed logging and verification
- ✅ Production-ready accounts

### `reset-admin.bat`
- ✅ **Windows-friendly**
- ✅ Stops running servers
- ✅ Runs complete reset
- ✅ Shows credentials and URLs

## 🔧 Usage Examples

### Development Workflow
```bash
# 1. Reset admin accounts
npm run quick-reset

# 2. Start server
npm start

# 3. Login at http://localhost:3000/admin-login
# Email: global@convoai.com
# Password: ConvoAI2025!
```

### Production Setup
```bash
# 1. Run comprehensive reset
npm run reset-admin

# 2. Change default passwords immediately
# 3. Configure proper permissions
# 4. Set up backup procedures
```

## 🛡️ Security Notes

### ⚠️ **IMPORTANT SECURITY REMINDERS**

1. **Change Default Passwords**: Always change default passwords after first login
2. **Production Safety**: Scripts check NODE_ENV and warn about production use
3. **Backup Data**: Scripts will remove existing admin users - backup first if needed
4. **Secure Storage**: Store admin credentials securely
5. **Regular Updates**: Update passwords regularly

### Default Password Policy
- **Development**: Simple passwords for quick testing
- **Production**: Use strong, unique passwords
- **Multi-Factor**: Enable MFA where possible

## 🔍 Troubleshooting

### Common Issues

**"User validation failed: departments"**
```bash
# Fixed in latest version - departments now use valid enum values
```

**"E11000 duplicate key error"**
```bash
# Scripts now clean up duplicates automatically
# Run the script again if this occurs
```

**"Connection failed"**
```bash
# Check your MONGODB_URI in .env file
# Verify MongoDB Atlas connection
```

### Verification Steps

1. **Check Database Connection**:
   ```bash
   npm run test:db
   ```

2. **Verify Server Health**:
   ```bash
   npm run health
   ```

3. **Test Login API**:
   ```bash
   curl -X POST http://localhost:3000/api/admin-login \
     -H "Content-Type: application/json" \
     -d '{"email":"global@convoai.com","password":"ConvoAI2025!","role":"admin"}'
   ```

## 📊 Role Permissions

### Global Admin (`global_admin`)
- ✅ Manage all organizations
- ✅ Manage all departments  
- ✅ Manage all users
- ✅ Access all analytics
- ✅ System configuration
- ✅ Knowledge base management

### Admin (`admin`)
- ✅ Manage organization users
- ✅ Manage departments
- ✅ View analytics
- ✅ Configure settings
- ❌ Cross-organization access

### Agent (`agent`)
- ✅ Handle customer chats
- ✅ Access assigned departments
- ✅ Basic reporting
- ❌ User management
- ❌ System configuration

## 🔄 Regular Maintenance

### Weekly Tasks
- [ ] Review admin access logs
- [ ] Check for unused accounts
- [ ] Verify backup procedures

### Monthly Tasks  
- [ ] Update admin passwords
- [ ] Review permission levels
- [ ] Clean up test accounts

### Quarterly Tasks
- [ ] Full security audit
- [ ] Update security policies
- [ ] Review role assignments

## 📞 Support

If you encounter issues with the reset scripts:

1. Check the ConvoAI server logs
2. Verify MongoDB connection
3. Review the troubleshooting section above
4. Check GitHub issues for similar problems

---

**ConvoAI Admin Reset Scripts v1.0**  
Last Updated: October 15, 2025