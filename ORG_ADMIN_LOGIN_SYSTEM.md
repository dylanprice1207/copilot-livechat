# Organization Admin Login System

## Overview
Implemented a secure login system for organization-specific admin portals at `/{orgName}/admin` with proper authentication flow and removed public portal links from the main website.

## 🔐 Authentication Flow

### 1. **Organization Admin URL Access**
- **URL Pattern**: `https://convoai.space/{orgName}/admin`
- **Examples**: 
  - `https://convoai.space/lightwave-ai/admin`
  - `https://convoai.space/acme-corp/admin`
  - `https://convoai.space/tech-support/admin`

### 2. **Authentication States**

#### **Unauthenticated Access**
When accessing `/{orgName}/admin` without valid authentication:
- Serves dedicated login page (`org-admin-login.html`)
- Organization-specific branding and validation
- Secure credential form with username/password
- Magic link information and fallback options

#### **Magic Token Authentication**
When accessing with magic token (`?magic_token=...`):
- Server validates JWT token authenticity
- Verifies organization match and expiration
- Directly serves admin portal with injected auth data
- Shows success banner with organization name

#### **Regular Authentication Token**
When accessing with auth token (`?token=...`):
- Validates JWT token for organization and admin role
- Checks permissions and organization membership
- Serves admin portal if authorized
- Fallback to login page if invalid

## 🏢 Organization-Specific Features

### **Login Page Customization**
- Dynamic organization name loading via API
- Organization-specific branding and styling
- Contextual error messages and help text
- Responsive design for all device types

### **Security Measures**
- Organization validation before serving any content
- JWT token verification with expiration checks
- Role-based access control (admin, super_admin, global_admin)
- Secure token handling and URL cleanup

## 🌐 Implementation Details

### **Server Routing**
```javascript
// Organization-specific admin routing
app.use('/:orgSlug/:route', async (req, res, next) => {
    // Validates organization exists and is active
    // Routes to appropriate handler based on authentication
});

// Magic login handler
async function handleOrgAdminMagicLogin(req, res, organization) {
    // Checks for magic_token or token parameters
    // Validates authentication and serves appropriate response
    // Returns login page if unauthenticated
    // Returns admin portal if authenticated
}
```

### **Authentication Logic**
1. **URL Processing**: Extract organization slug and route
2. **Organization Validation**: Verify org exists and is active
3. **Token Verification**: Check magic tokens and auth tokens
4. **Role Authorization**: Ensure admin-level permissions
5. **Content Serving**: Login page or authenticated admin portal

### **Login Form Handling**
```javascript
// Admin login API endpoint
app.post('/api/admin-login', async (req, res) => {
    // Validates credentials against organization
    // Generates JWT token with org-specific claims
    // Returns token for portal access
});
```

## 🎯 Security Features

### **JWT Token Structure**
```javascript
// Magic Login Token
{
  magicLogin: true,
  organizationId: "org_id",
  organizationSlug: "org-slug",
  globalAdminId: "admin_id", 
  globalAdminUsername: "username",
  targetRole: "admin",
  iat: timestamp,
  exp: expiration
}

// Regular Auth Token  
{
  organizationSlug: "org-slug",
  userId: "user_id",
  username: "username",
  role: "admin",
  iat: timestamp,
  exp: expiration
}
```

### **Access Control**
- Organization membership validation
- Role hierarchy enforcement (admin/super_admin/global_admin)
- Token expiration and refresh handling
- Secure session management

## 🔧 Login Page Features

### **User Interface**
- Professional, branded design with organization context
- Responsive layout for desktop and mobile
- Clear error messaging and success indicators
- Loading states and form validation

### **Functionality**
- Real-time organization info loading
- Secure credential submission
- Magic link explanation and fallback
- Password reset assistance links

### **Error Handling**
- Invalid organization detection
- Authentication failure messages
- Network error graceful handling
- Session timeout notifications

## 🚫 Removed Public Access

### **Homepage Changes**
- Removed "Organization Admin Portal" demo card
- Removed "Agent Dashboard" demo card  
- Maintained core demo functionality (ChatKit, Widget, Pricing, Flow Builder)
- Updated demo section description

### **Access Control**
- No direct public links to admin portals
- Organization-specific URLs required for access
- Authentication mandatory for all admin functions
- Magic tokens required for global admin access

## 🔗 URL Examples

### **Login Access**
```
https://convoai.space/lightwave-ai/admin
https://convoai.space/acme-corp/admin
https://convoai.space/tech-startup/admin
```

### **Magic Login**
```
https://convoai.space/lightwave-ai/admin?magic_token=eyJhbGc...
```

### **Token Access**
```
https://convoai.space/lightwave-ai/admin?token=eyJhbGc...
```

## 🛡️ Security Benefits

1. **Organization Isolation**: Each org has separate admin access
2. **Role-Based Access**: Only authorized roles can access admin functions
3. **Token Security**: JWT tokens with expiration and validation
4. **Audit Trail**: All access attempts logged and tracked
5. **No Public Exposure**: Admin portals not discoverable from main site

## 🎯 User Experience

### **For Organization Admins**
- Clean, professional login experience
- Organization-specific branding and context
- Clear authentication flow and error handling
- Seamless transition to admin portal after login

### **For Global Admins**
- Magic link access maintains existing workflow
- Token-based access for programmatic authentication
- Role verification and organization validation
- Secure session management and timeout handling

## 📋 Testing

### **Login Flow Testing**
1. Access `http://localhost:3000/lightwave-ai/admin` - Shows login page
2. Use invalid credentials - Shows error message
3. Use magic token URL - Direct access to admin portal
4. Test organization validation - 404 for invalid orgs

### **Security Testing**
1. Token expiration handling
2. Cross-organization access prevention  
3. Role permission validation
4. Session management and cleanup

The system now provides secure, organization-specific admin access while maintaining the existing magic login functionality for global administrators and removing public portal exposure.