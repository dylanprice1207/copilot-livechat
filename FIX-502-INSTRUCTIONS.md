# ConvoAI 502 Error Fix Instructions

## 🚨 Problem
Your ConvoAI Live Chat System is showing "502 Bad Gateway" errors, which means:
- Nginx is working and can receive requests
- But your Node.js backend server on port 3000 is not responding
- The connection between Nginx and your ConvoAI backend is broken

## 🛠️ Solution Steps

### Step 1: Upload Files to Your Server
Upload these files to your Ubuntu server in the ConvoAI project directory:
- `diagnose-502-error.sh`
- `fix-502-error.sh` 
- `quick-restart.sh`

### Step 2: Run the Diagnosis Script
```bash
cd /path/to/your/convoai/project
chmod +x *.sh
./diagnose-502-error.sh
```

This will tell you exactly what's wrong with your ConvoAI system.

### Step 3: Fix the Issue
```bash
# Run the comprehensive fix
./fix-502-error.sh

# OR if ConvoAI was running but crashed, just restart:
./quick-restart.sh
```

### Step 4: Verify the Fix
Test these URLs in your browser:
- ✅ Backend Health: `https://convoai.space/health`
- ✅ API Status: `https://convoai.space/api/status`
- ✅ Main Site: `https://convoai.space`
- ✅ Chat Demo: `https://convoai.space/chatkit-enhanced-demo.html`

## 🔍 Common Causes & Solutions

### 1. ConvoAI Backend Not Running
**Symptoms:** Port 3000 not responding
**Fix:** `./fix-502-error.sh` will restart the backend

### 2. Environment Variables Missing
**Symptoms:** Backend starts but crashes immediately
**Fix:** Script creates proper `.env` file with production settings

### 3. Database Connection Issues
**Symptoms:** Backend runs but health check fails
**Fix:** Script tests MongoDB connection and provides error details

### 4. PM2 Process Management Issues
**Symptoms:** Backend stops randomly
**Fix:** Script configures PM2 properly with auto-restart

### 5. Nginx Proxy Configuration
**Symptoms:** Backend works locally but 502 externally
**Fix:** Script updates Nginx config for proper proxying

## 📊 Monitoring Commands

After fixing, use these to monitor your ConvoAI system:

```bash
# Check ConvoAI status
pm2 status

# View ConvoAI logs
pm2 logs convoai

# Test backend directly
curl http://localhost:3000/health

# Test external access
curl https://convoai.space/health

# Restart ConvoAI if needed
pm2 restart convoai

# View Nginx status
sudo systemctl status nginx
```

## 🆘 If Problems Persist

1. **Check the logs:**
   ```bash
   pm2 logs convoai --lines 50
   sudo tail -f /var/log/nginx/error.log
   ```

2. **Verify firewall:**
   ```bash
   sudo ufw status
   sudo ufw allow 80
   sudo ufw allow 443
   ```

3. **Check DNS:**
   ```bash
   nslookup convoai.space
   ping convoai.space
   ```

4. **Manual restart:**
   ```bash
   pm2 delete convoai
   cd /path/to/convoai
   pm2 start server.js --name convoai
   ```

## ✅ Success Indicators

When fixed, you should see:
- ✅ `pm2 status` shows ConvoAI as "online"
- ✅ `curl http://localhost:3000/health` returns JSON response
- ✅ `https://convoai.space` loads without 502 error
- ✅ Chat functionality works in browser

Your ConvoAI Live Chat System will be fully operational! 🎉