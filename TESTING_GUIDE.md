# 🧪 Live Chat System - Testing Guide

## 📋 Demo Accounts

### Admin Account
- **Username:** `admin`
- **Password:** `admin123`
- **Access URL:** http://localhost:5173/#/admin
- **Features:** Full system access, analytics dashboard, user management

### Agent Accounts
- **Sales Agent**
  - Username: `SalesAgent`
  - Password: `agent123`
  - Departments: Sales, General
  
- **Technical Agent**
  - Username: `TechAgent`
  - Password: `agent123`
  - Departments: Technical, Support

## 🚀 How to Test the System

### 1. Start the Servers
```bash
# Terminal 1: Start backend server (port 3000)
cd C:\Users\user\Documents\projects\copilot-chat
npm start

# Terminal 2: Start frontend server (port 5173)
cd C:\Users\user\Documents\projects\copilot-chat\frontend
npm run dev
```

### 2. Test Customer Experience
1. Open: http://localhost:5173
2. Chat as a customer (no login required)
3. Try different department requests:
   - "I need sales help"
   - "Technical support please"
   - "Billing question"

### 3. Test Admin Dashboard
1. Open: http://localhost:5173/#/admin
2. Login with admin credentials
3. **Dashboard Features to Test:**
   - ✅ Real-time metrics (users, chats, response times)
   - ✅ Department performance statistics
   - ✅ Agent performance rankings
   - ✅ 24-hour activity patterns
   - ✅ User management (create, edit, delete agents)

### 4. Test Agent Portal
1. Open: http://localhost:5173 in a new tab/window
2. Login as an agent (SalesAgent or TechAgent)
3. **Agent Features to Test:**
   - ✅ Join agent chat room
   - ✅ Respond to customer inquiries
   - ✅ Department-based chat routing
   - ✅ Real-time customer status
   - ✅ Chat history access

### 5. Test Real Analytics Features

#### Dashboard Analytics
- **Total Users:** Shows actual registered user count
- **Active Agents:** Displays currently online agents
- **Total Chats:** Real chat session count from database
- **Average Response Time:** Calculated from actual message timestamps
- **Department Stats:** Real chat distribution across departments

#### Top Agents Performance
- **Ranking System:** Sorted by total chats completed
- **Performance Metrics:** Average chat duration, total chats
- **Department Badges:** Shows agent specializations
- **Real-time Updates:** Refreshes with actual activity

#### Hourly Activity Patterns
- **24-Hour Chart:** Shows message distribution throughout the day
- **Hover Tooltips:** Display exact message counts per hour
- **Real Database Data:** Pulled from actual message timestamps
- **Peak Time Identification:** Visual representation of busy periods

## 🔧 API Endpoints for Testing

### Authentication
```bash
# Login
POST http://localhost:3000/api/login
Body: {"username": "admin", "password": "admin123"}

# Register new user
POST http://localhost:3000/api/register
Body: {"username": "newuser", "email": "user@test.com", "password": "password", "role": "agent"}
```

### Admin Analytics (Requires Bearer Token)
```bash
# Dashboard stats
GET http://localhost:3000/api/admin/dashboard
Headers: Authorization: Bearer <token>

# Full analytics
GET http://localhost:3000/api/admin/analytics
Headers: Authorization: Bearer <token>

# Top performing agents
GET http://localhost:3000/api/admin/analytics/top-agents
Headers: Authorization: Bearer <token>

# Hourly activity data
GET http://localhost:3000/api/admin/analytics/hourly
Headers: Authorization: Bearer <token>
```

### User Management
```bash
# Get all users
GET http://localhost:3000/api/admin/users
Headers: Authorization: Bearer <token>

# Create new agent
POST http://localhost:3000/api/admin/users
Headers: Authorization: Bearer <token>
Body: {
  "username": "NewAgent",
  "email": "newagent@test.com",
  "password": "password123",
  "role": "agent",
  "departments": ["sales", "technical"]
}
```

## 🎯 Key Testing Scenarios

### Scenario 1: Multi-Department Chat Flow
1. Customer starts chat requesting "sales help"
2. Alex (AI hub) routes to general queue first
3. Sales agent joins and takes over
4. Verify analytics show proper department attribution

### Scenario 2: Agent Performance Tracking
1. Have different agents handle multiple chats
2. Vary response times and chat durations
3. Check admin dashboard for accurate performance metrics
4. Verify top agents ranking updates correctly

### Scenario 3: Real-Time Analytics Updates
1. Generate chat activity (messages, new chats, completions)
2. Refresh admin dashboard
3. Verify all metrics update with real data:
   - Chat counts increase
   - Hourly patterns update
   - Department stats reflect activity
   - Response times calculate correctly

### Scenario 4: Role-Based Access Control
1. Try accessing admin routes as regular agent
2. Verify proper authentication required
3. Test department restrictions work correctly
4. Confirm agents only see authorized chats

## 🐛 Troubleshooting

### Common Issues
- **Port conflicts:** Ensure ports 3000 and 5173 are free
- **MongoDB connection:** Check .env file has correct MONGODB_URI
- **Authentication errors:** Verify tokens are being stored correctly
- **Analytics not loading:** Check backend server logs for database errors

### Development Commands
```bash
# Check server logs
npm start  # Watch for database connections and errors

# Test API directly
curl -H "Authorization: Bearer <token>" http://localhost:3000/api/admin/dashboard

# Reset demo data (if needed)
node seed-demo.js
```

## 📊 Expected Analytics Data

After testing, you should see:
- **Non-zero chat counts** reflecting actual activity
- **Real response times** based on message delays
- **Department distribution** matching chat routing
- **Hourly patterns** showing when tests were conducted
- **Agent rankings** based on actual participation

The system now provides **100% real analytics** instead of mock data! 🎉