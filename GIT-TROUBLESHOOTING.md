# Git Pull Troubleshooting Guide

## Common Issues and Solutions

### 1. **Authentication Issues**
**Symptoms:** Permission denied, authentication failed
**Solutions:**
```bash
# Check if SSH key is configured
ssh -T git@github.com

# Or switch to HTTPS with token
git remote set-url origin https://github.com/dylanprice1207/copilot-livechat.git
```

### 2. **Divergent Branches**
**Symptoms:** "Your branch and 'origin/main' have diverged"
**Solutions:**
```bash
# Option A: Merge (preserves history)
git pull --no-rebase origin main

# Option B: Rebase (clean history)
git pull --rebase origin main

# Option C: Force sync (destructive)
git fetch origin
git reset --hard origin/main
```

### 3. **File Conflicts**
**Symptoms:** Merge conflicts, cannot pull
**Solutions:**
```bash
# Stash local changes
git stash

# Pull changes
git pull origin main

# Apply stashed changes
git stash pop
```

### 4. **Permission/Lock Issues**
**Symptoms:** Permission denied, file locked
**Solutions:**
```bash
# Linux/Mac
sudo chown -R $(whoami):$(whoami) .git/
chmod -R 755 .git/

# Windows (PowerShell as Admin)
takeown /f .git /r /d y
icacls .git /grant "$env:USERNAME:(OI)(CI)F" /t
```

### 5. **Network/Firewall Issues**
**Symptoms:** Connection timeout, SSL errors
**Solutions:**
```bash
# Try different protocol
git config --global url."https://".insteadOf git://

# Skip SSL verification (temporary)
git config --global http.sslVerify false

# Use different port
git config --global url."ssh://git@ssh.github.com:443/".insteadOf "ssh://git@github.com:22/"
```

### 6. **Repository Corruption**
**Symptoms:** Object not found, corrupt repository
**Solutions:**
```bash
# Re-clone repository
cd ..
mv copilot-chat copilot-chat-backup
git clone https://github.com/dylanprice1207/copilot-livechat.git copilot-chat
```

## Emergency Commands

### Quick Status Check
```bash
git status
git remote -v
git branch -v
```

### Force Sync (Nuclear Option)
```bash
git fetch origin
git reset --hard origin/main
git clean -fd
```

### Safe Recovery
```bash
git stash push -m "Backup $(date)"
git fetch origin
git reset --hard origin/main
```

## Server-Specific Issues

### PM2/Process Issues
```bash
# Stop processes before git operations
pm2 stop all
git pull
pm2 start ecosystem.config.js
```

### File Permissions (Linux)
```bash
sudo chown -R $USER:$USER /path/to/copilot-chat
```

### Windows Service Issues
```powershell
# Stop services, pull, restart
Stop-Service "YourServiceName" -ErrorAction SilentlyContinue
git pull
Start-Service "YourServiceName"
```

## Post-Pull Checklist

1. ✅ Check `package.json` for new dependencies
2. ✅ Run `npm install` if needed
3. ✅ Check for new environment variables
4. ✅ Restart application services
5. ✅ Verify application functionality

## Contact Commands for Support

Run these and share output:
```bash
# System info
uname -a
git --version
node --version
npm --version

# Repository state
git status
git log --oneline -5
git remote -v
```