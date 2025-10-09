# 🔑 ConvoAI API Keys Setup Guide

## Quick Setup Instructions

After running the installation script, you need to add your API keys to make ConvoAI fully functional.

### 1. Edit the `.env` file

Open the `.env` file in your project root and replace the placeholder values:

```bash
# Replace this placeholder with your actual OpenAI API key
OPENAI_API_KEY=your-openai-api-key-here
```

### 2. Get Your OpenAI API Key

1. Visit [OpenAI Platform](https://platform.openai.com/api-keys)
2. Sign in to your account
3. Click "Create new secret key"
4. Copy the key (starts with `sk-proj-...`)
5. Paste it in your `.env` file

### 3. Optional: MongoDB Configuration

The installation scripts use a default MongoDB Atlas connection. If you want to use your own database:

```bash
# Replace with your MongoDB connection string
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/livechat
```

### 4. Security Keys (Production Only)

For production deployments, generate secure random keys:

```bash
# Generate new secure keys (Linux/Mac)
JWT_SECRET=$(openssl rand -hex 32)
SESSION_SECRET=$(openssl rand -hex 32)

# Or use online generators for Windows users
```

### 🚀 Start ConvoAI

After setting up your API keys:

**Windows:**
```bash
# Run the installer
install-convoai.bat

# Then start the application
start-convoai-docker.bat
```

**Linux:**
```bash
# Run the installer
chmod +x install-convoai.sh
sudo ./install-convoai.sh
```

### 🌐 Access Your Application

- **Main Site**: http://localhost:3000
- **Chat Demo**: http://localhost:3000/chatkit-enhanced-demo.html  
- **Admin Portal**: http://localhost:3000/org-admin.html

---

## 🛡️ Security Note

Never commit API keys to Git! The installation scripts use placeholders specifically to prevent accidental exposure of sensitive credentials.

If you accidentally commit API keys:
1. Immediately revoke them from your provider
2. Generate new keys
3. Remove them from Git history using `git filter-branch` or similar tools

---

**Need Help?** Check the main README.md for detailed documentation and troubleshooting.