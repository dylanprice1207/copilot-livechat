// Load environment variables
require('dotenv').config();

// Enhanced production logging for ConvoAI
const startTime = new Date().toISOString();
console.log('🚀 ConvoAI Live Chat System Starting...');
console.log('� Start Time:', startTime);
console.log('�🔍 Environment Configuration:');
console.log('  NODE_ENV:', process.env.NODE_ENV || 'development');
console.log('  PORT:', process.env.PORT || '3000');
console.log('  DOMAIN:', process.env.DOMAIN || 'localhost');
console.log('  MONGODB_URI:', process.env.MONGODB_URI ? '✅ Configured' : '❌ Missing');
console.log('  OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? `✅ ${process.env.OPENAI_API_KEY.substring(0, 7)}...${process.env.OPENAI_API_KEY.slice(-4)}` : '❌ NOT SET');

// Enhanced error handling for production
process.on('uncaughtException', (error) => {
    console.error('💥 FATAL: Uncaught Exception in ConvoAI:', error);
    console.error('Stack:', error.stack);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('💥 FATAL: Unhandled Promise Rejection in ConvoAI:', reason);
    console.error('Promise:', promise);
    process.exit(1);
});

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

// Import enhanced database connection
const database = require('./src/config/database');

// Safe import of knowledge base service with error handling
let knowledgeBase;
try {
    knowledgeBase = require('./src/server/services/KnowledgeBaseService');
    console.log('✅ ConvoAI: KnowledgeBaseService loaded safely');
} catch (error) {
    console.error('❌ ConvoAI: KnowledgeBaseService import error:', error.message);
    // Create a fallback service
    knowledgeBase = {
        initialize: async () => {
            console.log('⚠️ ConvoAI: Using fallback knowledge base');
            return Promise.resolve(true);
        },
        searchKnowledge: () => [{
            question: "ConvoAI System",
            answer: "ConvoAI is running in safe mode. Knowledge base service will be restored shortly.",
            category: "system"
        }],
        isInitialized: false
    };
}

// AI Services
const OpenAIService = require('./src/server/services/OpenAIService');
const DepartmentRouter = require('./src/server/services/DepartmentRouter');
const AIBotService = require('./src/server/services/AIBotService');
const AnalyticsService = require('./src/server/services/AnalyticsService');
const ChatFlowService = require('./src/server/services/ChatFlowService');
const aiRoutes = require('./src/server/routes/ai');

// Safe model imports to prevent Mongoose overwrite errors
let User, Organization, Department, Message, ChatRoom;

try {
    // Clear any existing model cache
    if (mongoose.models) {
        delete mongoose.models.User;
        delete mongoose.models.Organization;
        delete mongoose.models.Department;
        delete mongoose.models.Message;
        delete mongoose.models.ChatRoom;
        delete mongoose.models.Knowledge;
    }
    
    User = require('./src/server/models/User');
    Organization = require('./src/server/models/Organization');
    Department = require('./src/server/models/Department');
    Message = require('./src/server/models/Message');
    ChatRoom = require('./src/server/models/ChatRoom');
    
    console.log('✅ ConvoAI: All models loaded successfully');
} catch (error) {
    console.error('❌ ConvoAI: Model loading error:', error.message);
    console.log('⚠️ ConvoAI: Continuing with limited functionality...');
}

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: [
      'https://convoai.space',
      'https://www.convoai.space',
      'http://localhost:3000', 
      'http://localhost:5173',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5173'
    ],
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000
});

// Configuration
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const SESSION_SECRET = process.env.SESSION_SECRET || 'your-session-secret-change-in-production';

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      scriptSrcAttr: ["'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
      styleSrcElem: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "ws:", "wss:"],
      fontSrc: ["'self'", "https://cdnjs.cloudflare.com"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    },
  }
}));

// Enhanced CORS configuration for HTTPS
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      'https://convoai.space',
      'https://www.convoai.space', 
      'http://localhost:3000',
      'http://localhost:5173',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5173'
    ];
    
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('Blocked by CORS:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-Total-Count']
};

app.use(cors(corsOptions));

// Trust proxy for HTTPS
app.set('trust proxy', 1);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Set correct MIME types for static files
app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders: (res, path) => {
    if (path.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript');
    }
    if (path.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css');
    }
  }
}));

// Serve Vue.js frontend build files
app.use('/assets', express.static(path.join(__dirname, 'frontend', 'dist', 'assets'), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript');
    }
    if (filePath.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css');
    }
  }
}));

app.use('/app', express.static(path.join(__dirname, 'frontend', 'dist'), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript');
    }
    if (filePath.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css');
    }
  }
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api', limiter);

// Session configuration with safe MongoDB URI handling
const mongoUri = process.env.MONGODB_URI;
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: mongoUri ? MongoStore.create({ mongoUrl: mongoUri }) : null,
  cookie: { 
    secure: process.env.NODE_ENV === 'production', // Dynamic based on environment
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Enhanced Authentication middleware (supports both regular JWT and magic tokens)
const authenticateToken = async (req, res, next) => {
  console.log('🔍 Auth middleware hit:', req.method, req.path);
  
  // Try to get token from different sources
  const authHeader = req.headers['authorization'];
  const bearerToken = authHeader && authHeader.split(' ')[1];
  const magicToken = req.headers['x-magic-token'] || req.query.magic_token;
  const token = bearerToken || magicToken;

  if (!token) {
    console.log('❌ No token provided');
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Handle magic token authentication (for organization admin)
    if (decoded.magicLogin && decoded.globalAdminId) {
      console.log('✅ Magic token authenticated for org:', decoded.organizationSlug);
      req.user = {
        _id: decoded.globalAdminId,
        username: decoded.globalAdminUsername || 'globaladmin',
        role: 'admin',
        organizationId: decoded.organizationId,
        organizationSlug: decoded.organizationSlug,
        magicLogin: true
      };
      return next();
    }
    
    // Handle regular JWT token authentication
    const user = await User.findById(decoded.userId);
    if (!user) {
      console.log('❌ User not found');
      return res.status(401).json({ error: 'User not found' });
    }
    console.log('✅ User authenticated:', user.username, 'Role:', user.role);
    req.user = user;
    next();
  } catch (error) {
    console.log('❌ Token error:', error.message);
    res.status(403).json({ error: 'Invalid token' });
  }
};

// Routes
// Enhanced Health check
app.get('/api/health', (req, res) => {
    const health = {
        status: 'OK',
        timestamp: new Date().toISOString(),
        database: database.isHealthy() ? 'connected' : 'disconnected',
        knowledgeBase: knowledgeBase.isInitialized ? 'initialized' : 'initializing',
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        environment: process.env.NODE_ENV || 'development'
    };
    
    const httpStatus = database.isHealthy() ? 200 : 503;
    res.status(httpStatus).json(health);
});

// Enhanced health check for ConvoAI production monitoring
app.get('/health', (req, res) => {
    const isHealthy = database.isHealthy();
    const health = {
        status: isHealthy ? 'healthy' : 'unhealthy',
        service: 'ConvoAI Live Chat System',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        database: {
            status: isHealthy ? 'connected' : 'disconnected',
            readyState: mongoose.connection.readyState
        },
        knowledgeBase: {
            status: knowledgeBase.isInitialized ? 'initialized' : 'initializing'
        },
        memory: process.memoryUsage(),
        environment: process.env.NODE_ENV || 'development',
        pid: process.pid,
        platform: process.platform,
        nodeVersion: process.version
    };
    
    const httpStatus = isHealthy ? 200 : 503;
    res.status(httpStatus).json(health);
});

// Basic API status endpoint
app.get('/api/status', (req, res) => {
    res.json({ 
        message: 'ConvoAI API is running',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

// Root endpoint for basic connectivity test
app.get('/', (req, res) => {
    res.json({
        message: 'ConvoAI Live Chat System',
        status: 'running',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        endpoints: {
            health: '/health',
            api: '/api',
            chatDemo: '/chatkit-enhanced-demo.html',
            agentDashboard: '/agent.html'
        }
    });
});

// Waitlist API endpoint
app.post('/api/waitlist', async (req, res) => {
    try {
        const { name, email, company, useCase, timestamp } = req.body;
        
        // Validation
        if (!name || !email) {
            return res.status(400).json({ 
                error: 'Name and email are required',
                success: false 
            });
        }
        
        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ 
                error: 'Please enter a valid email address',
                success: false 
            });
        }
        
        // Create waitlist entry (you can expand this to save to database)
        const waitlistEntry = {
            name: name.trim(),
            email: email.toLowerCase().trim(),
            company: company ? company.trim() : '',
            useCase: useCase || 'not-specified',
            timestamp: timestamp || new Date().toISOString(),
            ip: req.ip || req.connection.remoteAddress,
            userAgent: req.get('User-Agent')
        };
        
        // For now, just log it (you can later save to MongoDB)
        console.log('📝 New Waitlist Entry:', {
            name: waitlistEntry.name,
            email: waitlistEntry.email,
            company: waitlistEntry.company,
            useCase: waitlistEntry.useCase,
            timestamp: waitlistEntry.timestamp
        });
        
        // TODO: Save to database
        // const Waitlist = require('./src/server/models/Waitlist');
        // await Waitlist.create(waitlistEntry);
        
        res.status(200).json({
            success: true,
            message: 'Successfully added to waitlist!',
            data: {
                name: waitlistEntry.name,
                email: waitlistEntry.email
            }
        });
        
    } catch (error) {
        console.error('❌ Waitlist API Error:', error);
        res.status(500).json({
            error: 'Internal server error',
            success: false
        });
    }
});

// Register
app.post('/api/register', async (req, res) => {
  try {
    const { username, email, password, role } = req.body;

    // Validation
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Check if user exists
    const existingUser = await User.findOne({ 
      $or: [{ email }, { username }] 
    });
    
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = new User({
      username,
      email,
      password: hashedPassword,
      role: role || 'customer'
    });

    await user.save();

    res.status(201).json({ 
      message: 'User created successfully',
      user: { id: user._id, username: user.username, role: user.role }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Login
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Find user
    const user = await User.findOne({ 
      $or: [{ email: username }, { username }] 
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Generate token
    const token = jwt.sign({ 
      userId: user._id,
      id: user._id,
      username: user.username,
      role: user.role,
      email: user.email
    }, JWT_SECRET, { expiresIn: '24h' });

    // Update user online status
    user.isOnline = true;
    await user.save();

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin Authentication Routes
app.post('/api/admin-login', async (req, res) => {
  try {
    const { email, password, role } = req.body;

    // Validation
    if (!email || !password || !role) {
      return res.status(400).json({ 
        success: false,
        message: 'Email, password, and role are required' 
      });
    }

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid credentials' 
      });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid credentials' 
      });
    }

    // Check if user has required role
    const allowedRoles = {
      'agent': ['agent', 'admin', 'super_admin', 'global_admin'],
      'admin': ['admin', 'super_admin', 'global_admin'],
      'org-admin': ['admin', 'super_admin', 'global_admin']
    };

    if (!allowedRoles[role] || !allowedRoles[role].includes(user.role)) {
      return res.status(403).json({ 
        success: false,
        message: 'Insufficient permissions for this admin portal' 
      });
    }

    // Generate JWT token with admin claim
    const token = jwt.sign(
      { 
        userId: user._id,
        email: user.email,
        role: user.role,
        adminPortal: role
      },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    console.log(`Admin login successful: ${user.email} -> ${role} portal`);

    res.json({
      success: true,
      message: 'Login successful',
      token,
      role: role,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error' 
    });
  }
});

// Verify admin token
app.get('/api/verify-admin-token', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    
    if (!user) {
      return res.status(401).json({ 
        success: false,
        message: 'User not found' 
      });
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        adminPortal: req.user.adminPortal
      }
    });

  } catch (error) {
    console.error('Token verification error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error' 
    });
  }
});

// Verify magic token for organization admin access
app.post('/api/verify-magic-token', async (req, res) => {
  try {
    const { magicToken } = req.body;
    
    if (!magicToken) {
      return res.status(400).json({
        success: false,
        message: 'Magic token is required'
      });
    }
    
    console.log('🪄 Verifying magic token...');
    
    // Verify the magic token
    const decoded = jwt.verify(magicToken, JWT_SECRET);
    
    // Check if it's a valid magic login token
    if (!decoded.magicLogin) {
      return res.status(401).json({
        success: false,
        message: 'Invalid magic token format'
      });
    }
    
    // Check if token is expired (magic tokens have short expiry)
    const now = Math.floor(Date.now() / 1000);
    if (decoded.exp && decoded.exp < now) {
      return res.status(401).json({
        success: false,
        message: 'Magic token has expired'
      });
    }
    
    // Verify the global admin still exists and has permissions
    try {
      const globalAdmin = await User.findById(decoded.globalAdminId);
      if (!globalAdmin || globalAdmin.role !== 'global_admin') {
        return res.status(401).json({
          success: false,
          message: 'Global admin access revoked'
        });
      }
    } catch (userError) {
      // Skip user validation if there are User model issues
      console.log('⚠️ Skipping global admin validation due to User model issues');
    }
    
    // Verify organization still exists and is active
    const organization = await Organization.findById(decoded.organizationId);
    if (!organization || !organization.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Organization not found or inactive'
      });
    }
    
    console.log(`✅ Magic token verified for ${decoded.globalAdminUsername} → ${organization.name}`);
    
    res.json({
      success: true,
      message: 'Magic token verified successfully',
      token: magicToken, // Return the same token for session use
      organization: {
        id: organization._id,
        name: organization.name,
        slug: organization.slug
      },
      globalAdmin: {
        id: decoded.globalAdminId,
        username: decoded.globalAdminUsername
      }
    });
    
  } catch (error) {
    console.error('❌ Magic token verification error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid magic token'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Magic token has expired'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error during magic token verification'
    });
  }
});

// Admin middleware for protected routes
const requireAdminAuth = (allowedRoles = []) => {
  return async (req, res, next) => {
    try {
      const token = req.headers.authorization?.split(' ')[1] || 
                   req.query.token || 
                   req.cookies?.adminToken;
      
      if (!token) {
        return res.redirect('/admin-login');
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId);
      
      if (!user) {
        return res.redirect('/admin-login');
      }

      // Check if user has required role for this portal
      if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
        return res.status(403).send(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Access Denied</title>
            <style>
              body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
              .error { color: #d73502; }
            </style>
          </head>
          <body>
            <h1 class="error">Access Denied</h1>
            <p>You don't have permission to access this admin portal.</p>
            <a href="/admin-login">Login with different account</a>
          </body>
          </html>
        `);
      }

      req.user = decoded;
      req.currentUser = user;
      next();
    } catch (error) {
      console.error('Admin auth error:', error);
      return res.redirect('/admin-login');
    }
  };
};

// Get chat history
app.get('/api/chat/:roomId', authenticateToken, async (req, res) => {
  try {
    const { roomId } = req.params;
    const messages = await Message.find({ chatRoom: roomId })
      .populate('sender', 'username role')
      .sort({ timestamp: 1 });
    
    res.json(messages);
  } catch (error) {
    console.error('Error fetching chat history:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// AI Routes
app.use('/api/ai', aiRoutes);

// ChatKit Routes (Custom Backend Integration)
const chatkitRoutes = require('./src/server/routes/chatkit');
app.use('/api/chatkit', chatkitRoutes);

// Knowledge Base Routes
const knowledgeBaseRoutes = require('./src/server/routes/knowledge-base');
app.use('/api/knowledge', authenticateToken, knowledgeBaseRoutes);

// Agent Management Routes
const agentRoutes = require('./src/server/routes/agents');
app.use('/api/agents', agentRoutes);

// Admin Routes
const adminRoutes = require('./src/server/routes/admin');
app.use('/api/admin', authenticateToken, adminRoutes);

// Global Admin Routes (Organizations & Departments)
const globalAdminRoutes = require('./src/server/routes/global-admin');
app.use('/api/global-admin', authenticateToken, globalAdminRoutes);

// Organization Routes
const organizationRoutes = require('./src/server/routes/organization');
app.use('/api/organization', organizationRoutes);

// Handle magic login for organization admin portal
async function handleOrgAdminMagicLogin(req, res, organization) {
    const magicToken = req.query.magic_token;
    let authStatus = 'unauthenticated';
    let authData = null;
    let errorMessage = null;
    
    if (magicToken) {
        console.log('🪄 Processing magic token for organization admin portal...');
        
        try {
            // Verify the magic token
            const decoded = jwt.verify(magicToken, process.env.JWT_SECRET || 'your-secret-key-change-in-production');
            
            // Check if it's a valid magic login token
            if (!decoded.magicLogin) {
                throw new Error('Invalid magic token format');
            }
            
            // Check if token is expired
            const now = Math.floor(Date.now() / 1000);
            if (decoded.exp && decoded.exp < now) {
                throw new Error('Magic token has expired');
            }
            
            // Verify organization matches
            if (decoded.organizationId !== organization._id.toString()) {
                throw new Error('Magic token is for a different organization');
            }
            
            // Skip global admin validation due to User model issues, but log it
            console.log(`✅ Magic token verified for ${decoded.globalAdminUsername} → ${organization.name}`);
            
            authStatus = 'authenticated';
            authData = {
                organizationId: decoded.organizationId,
                organizationName: organization.name,
                organizationSlug: organization.slug,
                globalAdminId: decoded.globalAdminId,
                globalAdminUsername: decoded.globalAdminUsername,
                targetRole: decoded.targetRole
            };
            
        } catch (error) {
            console.error('❌ Magic token verification failed:', error.message);
            authStatus = 'error';
            errorMessage = error.message;
        }
    }
    
    // Read the HTML file and inject authentication data
    const fs = require('fs');
    const htmlPath = path.join(__dirname, 'public', 'org-admin.html');
    let htmlContent = fs.readFileSync(htmlPath, 'utf8');
    
    // Inject authentication data as a script tag before the existing scripts
    const authDataScript = `
    <script>
        // Magic Login Authentication Data (injected server-side)
        window.magicLoginAuth = {
            status: '${authStatus}',
            data: ${authData ? JSON.stringify(authData) : 'null'},
            error: ${errorMessage ? `'${errorMessage}'` : 'null'}
        };
        console.log('🔍 Magic Login Auth Data:', window.magicLoginAuth);
        
        // Show authentication status immediately
        if (window.magicLoginAuth.status === 'authenticated') {
            console.log('✅ Magic login successful for:', window.magicLoginAuth.data.organizationName);
            
            // Update page title
            document.title = window.magicLoginAuth.data.organizationName + ' - Admin Portal';
            
            // Show success banner
            const banner = document.createElement('div');
            banner.innerHTML = \`
                <div style="position: fixed; top: 0; left: 0; right: 0; background: linear-gradient(90deg, #10b981, #059669); color: white; padding: 12px; text-align: center; z-index: 10000; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <i class="fas fa-shield-alt"></i>
                    <strong>Magic Login Successful</strong> - Welcome to \${window.magicLoginAuth.data.organizationName} Admin Portal
                    <small style="opacity: 0.8; margin-left: 10px;">Authenticated as Global Admin</small>
                </div>
            \`;
            document.body.appendChild(banner);
            
            // Add margin to body to account for banner
            document.body.style.marginTop = '50px';
            
            // Auto-hide banner after 8 seconds
            setTimeout(() => {
                banner.style.transform = 'translateY(-100%)';
                banner.style.transition = 'transform 0.3s ease';
                setTimeout(() => {
                    if (banner.parentNode) {
                        banner.parentNode.removeChild(banner);
                        document.body.style.marginTop = '';
                    }
                }, 300);
            }, 8000);
            
        } else if (window.magicLoginAuth.status === 'error') {
            console.error('❌ Magic login failed:', window.magicLoginAuth.error);
            
            // Show error banner
            const banner = document.createElement('div');
            banner.innerHTML = \`
                <div style="position: fixed; top: 0; left: 0; right: 0; background: #ef4444; color: white; padding: 12px; text-align: center; z-index: 10000; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <i class="fas fa-exclamation-triangle"></i>
                    <strong>Magic Login Failed</strong> - \${window.magicLoginAuth.error}
                </div>
            \`;
            document.body.appendChild(banner);
            document.body.style.marginTop = '50px';
            
        } else {
            console.log('🔍 No magic token provided - manual authentication required');
            
            // Show authentication required message
            const authRequired = document.createElement('div');
            authRequired.innerHTML = \`
                <div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; padding: 30px; border-radius: 15px; box-shadow: 0 8px 32px rgba(0,0,0,0.1); text-align: center; max-width: 500px; z-index: 10000;">
                    <h2 style="margin-bottom: 20px; color: #4a5568;"><i class="fas fa-lock"></i> Authentication Required</h2>
                    <p style="margin-bottom: 15px; color: #718096; line-height: 1.6;">You need to be authenticated to access this organization's admin portal.</p>
                    <p style="margin-bottom: 20px; color: #718096; line-height: 1.6;">Please use a magic login link from the global admin panel.</p>
                    <button onclick="window.close()" style="background: #6b7280; color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; font-size: 16px;">Close</button>
                </div>
                <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 9999;"></div>
            \`;
            document.body.appendChild(authRequired);
        }
    </script>`;
    
    // Insert the auth data script before the existing scripts
    htmlContent = htmlContent.replace(
        '<script src="/socket.io/socket.io.js"></script>',
        authDataScript + '\n    <script src="/socket.io/socket.io.js"></script>'
    );
    
    // Send the modified HTML
    res.send(htmlContent);
}

// Organization-specific URL routing middleware
app.use('/:orgSlug/:route', async (req, res, next) => {
    const { orgSlug, route } = req.params;
    
    // Skip static file paths
    const staticPaths = ['js', 'css', 'images', 'assets', 'fonts', 'uploads'];
    if (staticPaths.includes(route)) {
        return next();
    }
    
    // Valid organization routes
    const validRoutes = ['admin', 'chat', 'agent', 'dashboard'];
    
    if (!validRoutes.includes(route)) {
        return next();
    }
    
    try {
        // Check if organization exists
        const organization = await Organization.findOne({ slug: orgSlug, isActive: true });
        
        if (!organization) {
            return res.status(404).json({ 
                error: 'Organization not found or inactive',
                orgSlug: orgSlug 
            });
        }
        
        // Store organization info in request for use by frontend
        req.organization = organization;
        
        // Serve the appropriate page based on route
        switch (route) {
            case 'admin':
                // Handle magic login for organization admin portal
                await handleOrgAdminMagicLogin(req, res, organization);
                break;
                
            case 'chat':
                // Serve organization customer chat
                res.sendFile(path.join(__dirname, 'public', 'customer.html'));
                break;
                
            case 'agent':
                // Serve organization agent dashboard
                res.sendFile(path.join(__dirname, 'public', 'agent.html'));
                break;
                
            case 'dashboard':
                // Serve Vue.js app for organization dashboard
                res.sendFile(path.join(__dirname, 'frontend', 'dist', 'index.html'));
                break;
                
            default:
                next();
        }
        
    } catch (error) {
        console.error('Error in organization routing:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// API endpoint to get organization info for frontend
app.get('/api/:orgSlug/info', async (req, res) => {
    try {
        const { orgSlug } = req.params;
        const organization = await Organization.findOne({ slug: orgSlug, isActive: true });
        
        if (!organization) {
            return res.status(404).json({ error: 'Organization not found' });
        }
        
        res.json({
            id: organization._id,
            name: organization.name,
            slug: organization.slug,
            description: organization.description,
            settings: organization.settings || {},
            branding: organization.branding || {}
        });
        
    } catch (error) {
        console.error('Error getting organization info:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// ChatFlow Routes (public - no auth required for customer chat)
// Debug endpoint to check database directly
app.get('/api/chatflow/debug', async (req, res) => {
  try {
    console.log('🐛 DEBUG: Checking all settings documents...');
    const allSettings = await Settings.find({});
    console.log('🐛 DEBUG: Found', allSettings.length, 'settings documents');
    
    allSettings.forEach((doc, index) => {
      console.log(`🐛 DEBUG: Document ${index + 1}:`, {
        id: doc._id,
        organization: doc.organization,
        type: doc.type,
        hasData: !!doc.data,
        hasChatFlow: !!(doc.data && doc.data.chatFlow)
      });
      
      if (doc.data && doc.data.chatFlow) {
        console.log(`🐛 DEBUG: ChatFlow in doc ${index + 1}:`, {
          welcomeFlow: doc.data.chatFlow.welcomeFlow,
          quickActionsCount: doc.data.chatFlow.quickActions ? doc.data.chatFlow.quickActions.length : 0
        });
      }
    });
    
    res.json({ 
      totalDocuments: allSettings.length,
      documents: allSettings.map(doc => ({
        id: doc._id,
        organization: doc.organization,
        type: doc.type,
        hasChatFlow: !!(doc.data && doc.data.chatFlow)
      }))
    });
  } catch (error) {
    console.error('🐛 DEBUG: Error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/chatflow/config', async (req, res) => {
  try {
    console.log('🔄 Loading chatflow config from database...');
    const settings = await Settings.findOne({});
    console.log('📋 Database query result:', settings ? 'Found settings document' : 'No settings document found');
    
    if (settings) {
      console.log('📄 Settings document has chatFlow?', !!settings.chatFlow);
      if (settings.chatFlow) {
        console.log('✅ Found chatFlow in settings');
        console.log('🎯 ChatFlow config:', JSON.stringify(settings.chatFlow, null, 2));
      } else {
        console.log('❌ No chatFlow found in settings');
      }
    }
    
    if (settings && settings.chatFlow) {
      console.log('✅ Chatflow config loaded from database:', settings.chatFlow);
      
      // Check if Flow Builder is enabled - prioritize it over simple chatflow
      if (settings.chatFlow.flowBuilder && settings.chatFlow.flowBuilder.enabled) {
        console.log('🏗️ Flow Builder is enabled - using Flow Builder system');
        const flowBuilderConfig = {
          enabled: true,
          useFlowBuilder: true,
          welcomeFlow: settings.chatFlow.flowBuilder.steps[0]?.content || settings.chatFlow.welcomeFlow,
          flowSteps: settings.chatFlow.flowBuilder.steps,
          quickActions: [] // Flow Builder doesn't use simple quick actions
        };
        res.json(flowBuilderConfig);
      } else if (settings.chatFlow.showQuickActions) {
        console.log('🎯 Simple chatflow is enabled - using quick actions system');
        const chatFlowConfig = {
          enabled: true,
          useFlowBuilder: false,
          welcomeFlow: settings.chatFlow.welcomeFlow,
          quickActions: settings.chatFlow.quickActions || []
        };
        res.json(chatFlowConfig);
      } else {
        console.log('❌ Both Flow Builder and Quick Actions are disabled');
        res.json({ enabled: false });
      }
    } else {
      console.log('⚠️ No chatflow config found in database, using fallback');
      // Fallback config if none found
      const fallbackConfig = {
        enabled: true,
        welcomeFlow: 'Hi there! 👋 Welcome to Lightwave AI support. How can I help you today?',
        quickActions: [
          { text: 'Technical Support', response: 'I\'ll connect you with our technical support team.' },
          { text: 'Sales Inquiry', response: 'Let me help you with sales information.' },
          { text: 'General Question', response: 'I\'m here to help with your general questions.' }
        ]
      };
      res.json(fallbackConfig);
    }
  } catch (error) {
    console.error('❌ Error loading chatflow config:', error);
    res.status(500).json({ error: 'Failed to load chatflow config' });
  }
});

app.get('/api/chatflow/welcome', async (req, res) => {
  try {
    const settings = await Settings.findOne({ organization: 'lightwave' });
    
    if (settings && settings.data && settings.data.chatFlow && settings.data.chatFlow.welcomeFlow) {
      res.json({ message: settings.data.chatFlow.welcomeFlow });
    } else {
      // Fallback welcome message
      res.json({
        message: 'Hi there! 👋 Welcome to Lightwave AI support. How can I help you today?'
      });
    }
  } catch (error) {
    console.error('❌ Error loading welcome message:', error);
    res.json({
      message: 'Hi there! 👋 Welcome to Lightwave AI support. How can I help you today?'
    });
  }
});

app.post('/api/chatflow/session', (req, res) => {
  const sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  res.json({ sessionId });
});

app.post('/api/chatflow/process', async (req, res) => {
  try {
    console.log('💬 Processing chatflow message:', req.body);
    const { message, sessionId, customerId, customerName } = req.body;
    
    // Get chatflow configuration from database
    const settings = await Settings.findOne({});
    let result = {};
    
    if (settings && settings.chatFlow) {
      // Check if Flow Builder is enabled
      if (settings.chatFlow.flowBuilder && settings.chatFlow.flowBuilder.enabled) {
        console.log('🏗️ Processing message through Flow Builder system');
        
        // For Flow Builder, we don't auto-respond to regular messages
        // The Flow Builder handles the conversation flow through choices
        // Regular messages during Flow Builder are just acknowledged
        result.autoResponse = 'I understand. Please use the options below to continue.';
        
      } else if (settings.chatFlow.showQuickActions) {
        console.log('🎯 Processing message through simple chatflow system');
        
        // Use the configured auto-responses from database
        const autoResponses = settings.chatFlow.autoResponses || [];
        const lowerMessage = message.toLowerCase();
        
        // Find matching auto-response
        for (const autoResponse of autoResponses) {
          if (autoResponse.enabled && autoResponse.keywords) {
            const keywordMatch = autoResponse.keywords.some(keyword => 
              lowerMessage.includes(keyword.toLowerCase())
            );
            if (keywordMatch) {
              result.autoResponse = autoResponse.response;
              break;
            }
          }
        }
        
        // Check routing rules
        const routingRules = settings.chatFlow.smartRouting?.rules || [];
        for (const rule of routingRules) {
          if (rule.enabled && rule.keywords) {
            const keywordMatch = rule.keywords.some(keyword => 
              lowerMessage.includes(keyword.toLowerCase())
            );
            if (keywordMatch) {
              result.routeToDepartment = rule.department;
              break;
            }
          }
        }
        
        // Show quick actions if configured
        if (settings.chatFlow.quickActions && settings.chatFlow.quickActions.length > 0) {
          result.quickActions = settings.chatFlow.quickActions.filter(qa => qa.enabled);
        }
        
      } else {
        console.log('⚠️ No chatflow system enabled, using fallback');
        // Fallback to simple keyword matching
        const lowerMessage = message.toLowerCase();
        
        if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
          result.autoResponse = 'Hello! Thanks for reaching out. How can I help you today?';
        } else if (lowerMessage.includes('help') || lowerMessage.includes('support')) {
          result.autoResponse = 'I\'d be happy to help! What specific issue are you experiencing?';
        }
      }
    }
    
    console.log('📤 Chatflow process result:', result);
    res.json(result);
    
  } catch (error) {
    console.error('❌ Error processing chatflow message:', error);
    res.status(500).json({ error: 'Failed to process message' });
  }
});

app.post('/api/chatflow/quick-action', (req, res) => {
  const { action } = req.body;
  
  if (!action) {
    return res.status(400).json({ error: 'Action is required' });
  }
  
  let result = {
    response: action.response || `I'll help you with ${action.text.toLowerCase()}.`
  };
  
  // Add department routing based on action
  if (action.text.toLowerCase().includes('technical')) {
    result.routeToDepartment = 'Technical';
  } else if (action.text.toLowerCase().includes('sales')) {
    result.routeToDepartment = 'Sales';
  } else {
    result.routeToDepartment = 'General';
  }
  
  res.json(result);
});

// Get active chats (for agents)
app.get('/api/chats', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'agent' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const chatRooms = await ChatRoom.find({ status: { $in: ['waiting', 'active'] } })
      .populate('customer', 'username email')
      .populate('agent', 'username email')
      .sort({ createdAt: -1 });

    res.json(chatRooms);
  } catch (error) {
    console.error('Error fetching chats:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get chats for admin interface with filtering
app.get('/api/admin/chats', authenticateToken, async (req, res) => {
  try {
    const { status, department, search, page = 1, limit = 20 } = req.query;
    
    // Build query filters
    let query = { organization: 'lightwave' };
    
    // Status filtering
    if (status) {
      if (status.includes(',')) {
        // Multiple statuses (e.g., "active,waiting")
        query.status = { $in: status.split(',') };
      } else {
        // Single status
        query.status = status;
      }
    }
    
    // Department filtering
    if (department && department !== '') {
      query.department = department;
    }
    
    // Search filtering
    if (search && search !== '') {
      query.$or = [
        { 'guestInfo.username': { $regex: search, $options: 'i' } },
        { 'guestInfo.email': { $regex: search, $options: 'i' } },
        { agentName: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    console.log('📊 Chat query:', JSON.stringify(query, null, 2));
    
    const chatRooms = await ChatRoom.find(query)
      .populate('customer', 'username email')
      .populate('agent', 'username email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    console.log('💬 Found chat rooms:', chatRooms.length);
    
    // Get total count for pagination
    const total = await ChatRoom.countDocuments(query);
    
    // Calculate stats
    const stats = {
      total: await ChatRoom.countDocuments({ organization: 'lightwave' }),
      active: await ChatRoom.countDocuments({ organization: 'lightwave', status: 'active' }),
      waiting: await ChatRoom.countDocuments({ organization: 'lightwave', status: 'waiting' }),
      closed: await ChatRoom.countDocuments({ organization: 'lightwave', status: 'closed' })
    };

    console.log('📈 Chat stats:', stats);

    res.json({
      chats: chatRooms,
      stats: stats,
      currentPage: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
      total: total
    });
  } catch (error) {
    console.error('Error fetching chats:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get messages for a specific chat
app.get('/api/admin/chats/:roomId/messages', authenticateToken, async (req, res) => {
  try {
    const { roomId } = req.params;
    
    const messages = await Message.find({ chatRoom: roomId })
      .sort({ timestamp: 1 })
      .limit(100); // Limit to last 100 messages
    
    res.json({ messages });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Assign agent to chat
app.patch('/api/admin/chats/:chatId/assign', authenticateToken, async (req, res) => {
  try {
    const { chatId } = req.params;
    const { agentId, agentName } = req.body;
    
    const chatRoom = await ChatRoom.findByIdAndUpdate(
      chatId,
      { 
        agent: agentId,
        agentName: agentName,
        status: 'active',
        assignedAt: new Date()
      },
      { new: true }
    );
    
    if (!chatRoom) {
      return res.status(404).json({ error: 'Chat not found' });
    }
    
    res.json({ success: true, chat: chatRoom });
  } catch (error) {
    console.error('Error assigning agent:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Close a chat
app.patch('/api/admin/chats/:chatId/close', authenticateToken, async (req, res) => {
  try {
    const { chatId } = req.params;
    
    const chatRoom = await ChatRoom.findByIdAndUpdate(
      chatId,
      { 
        status: 'closed',
        closedAt: new Date(),
        closedBy: req.user.id
      },
      { new: true }
    );
    
    if (!chatRoom) {
      return res.status(404).json({ error: 'Chat not found' });
    }
    
    // Notify room about chat closure
    console.log(`📢 Broadcasting chat_closed to room: ${chatRoom.roomId}`);
    io.to(chatRoom.roomId).emit('chat_closed', {
      message: 'Chat has been closed by an agent',
      timestamp: new Date().toISOString()
    });
    
    // Notify all admin interfaces about status change
    io.emit('chat_status_changed', {
      chatId: chatRoom._id,
      roomId: chatRoom.roomId,
      status: 'closed'
    });
    
    console.log(`Chat ${chatId} closed by user ${req.user.username}`);
    
    res.json({ success: true, chat: chatRoom });
  } catch (error) {
    console.error('Error closing chat:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Handle user joining
  socket.on('join', async (userData) => {
    try {
      console.log('🔗 Join event received:', userData);
      const { userId, role, username, requestedDepartment } = userData;
      console.log(`👤 Processing join for: ${username} with role: ${role}`);
      
      // Log requested department for centralized hub context
      if (requestedDepartment) {
        console.log(`🏢 Customer requested department: ${requestedDepartment} (will start in general chat first)`);
      }
      
      // Handle different user types
      if (role === 'guest') {
        // For guests, we don't need to update the database
        // Just store the socket information including requested department
        socket.userId = socket.id; // Use socket ID as identifier for guests
        socket.userRole = role;
        socket.username = username;
        socket.requestedDepartment = requestedDepartment || 'general'; // Store department context
        
        console.log(`Guest joined: ${username} (${socket.id})`);
        
        // Check if this guest has an existing active chat room (for reconnection)
        const existingRoom = await ChatRoom.findOne({
          'guestInfo.username': username,
          status: { $in: ['waiting', 'active'] }
        });
        
        if (existingRoom) {
          console.log('🔄 Guest reconnecting to existing room:', existingRoom.roomId);
          // Update the socket ID in the existing room
          existingRoom.guestInfo.socketId = socket.id;
          await existingRoom.save();
          
          // Join the existing room
          socket.join(existingRoom.roomId);
          socket.currentRoom = existingRoom.roomId;
          
          // Notify the guest about the reconnection
          socket.emit('chat_room_assigned', { roomId: existingRoom.roomId });
          
          if (existingRoom.status === 'active' && existingRoom.agent) {
            // If there's already an agent, notify the guest
            const agent = await User.findById(existingRoom.agent);
            if (agent) {
              socket.emit('agent_joined', {
                agentName: agent.username,
                roomId: existingRoom.roomId
              });
            }
          }
        } else {
          // No existing room found - create new room for guest
          console.log('🆕 Creating new chat room for guest:', username);
          
          const roomId = `guest_${Date.now()}_${socket.id}`;
          const chatRoom = new ChatRoom({
            roomId,
            customer: null, // No customer ID for guests
            guestInfo: {    // Store guest info directly in chat room
              username: username,
              socketId: socket.id
            },
            customerName: username,
            organization: 'lightwave',
            department: requestedDepartment || 'general',
            status: 'waiting'
          });
          
          await chatRoom.save();
          console.log('✨ Created new guest chat room:', roomId);
          
          // Join the new room
          socket.join(roomId);
          socket.currentRoom = roomId;
          
          // Notify the guest about the new room
          socket.emit('room_created', { roomId: roomId });
          
          // Initialize chatflow for new guest room
          console.log('🔍 Checking if chatflow is enabled for new guest...');
          const settings = await Settings.findOne({});
          
          const chatflowEnabled = settings && settings.chatFlow && (
            settings.chatFlow.showQuickActions || 
            (settings.chatFlow.flowBuilder && settings.chatFlow.flowBuilder.enabled)
          );
          
          if (chatflowEnabled) {
            console.log('🎯 Chatflow is enabled - initializing Flow Builder for guest');
            
            // Send Flow Builder welcome message
            if (settings.chatFlow.flowBuilder && settings.chatFlow.flowBuilder.enabled) {
              console.log('🏗️ Initializing Flow Builder for new guest');
              
              // Find the welcome step
              const welcomeStep = settings.chatFlow.flowBuilder.steps.find(step => step.id === 'welcome');
              if (welcomeStep) {
                console.log('📨 Sending Flow Builder welcome message:', welcomeStep.content);
                
                // Send welcome message to guest
                socket.emit('receive_message', {
                  id: Date.now(),
                  roomId: roomId,
                  content: welcomeStep.content,
                  sender: 'system',
                  senderName: 'Assistant',
                  timestamp: new Date(),
                  isSystemMessage: true
                });
                
                // After a short delay, proceed to next step if specified
                if (welcomeStep.nextStep) {
                  setTimeout(() => {
                    const nextStep = settings.chatFlow.flowBuilder.steps.find(step => step.id === welcomeStep.nextStep);
                    if (nextStep && nextStep.type === 'choice') {
                      console.log('🔄 Proceeding to next Flow Builder step:', nextStep.id);
                      
                      // Send the choice options (this will handle both message and choices)
                      const choiceData = {
                        stepId: nextStep.id,
                        content: nextStep.content,
                        options: nextStep.options || []
                      };
                      console.log('📤 Emitting flow_builder_choices:', choiceData);
                      socket.emit('flow_builder_choices', choiceData);
                      console.log('✅ flow_builder_choices event sent successfully');
                    }
                  }, 1000);
                }
              } else {
                console.log('❌ No welcome step found in Flow Builder configuration');
                // Fallback to simple welcome
                socket.emit('receive_message', {
                  id: Date.now(),
                  roomId: roomId,
                  content: settings.chatFlow.welcomeFlow || 'Hello! How can I help you today?',
                  sender: 'system',
                  senderName: 'Assistant',
                  timestamp: new Date(),
                  isSystemMessage: true
                });
              }
            }
          } else {
            console.log('⚠️ No chatflow enabled - guest will wait for agent');
          }
          
          // Broadcast new chat request to agents
          console.log('📢 Broadcasting new chat request to agents:', {
            roomId: roomId,
            customer: username,
            customerId: socket.id,
            isGuest: true,
            timestamp: new Date(),
            department: requestedDepartment || 'general',
            requestedDepartment: requestedDepartment || 'general'
          });
          
          io.to('agents').emit('new_chat_request', {
            roomId: roomId,
            customer: username,
            customerId: socket.id,
            isGuest: true,
            timestamp: new Date(),
            department: requestedDepartment || 'general',
            requestedDepartment: requestedDepartment || 'general'
          });
          
          console.log('👥 Broadcasting to agents in \'agents\' room');
        }
      } else {
        // For agents and registered users, update database
        await User.findByIdAndUpdate(userId, { 
          socketId: socket.id, 
          isOnline: true 
        });

        socket.userId = userId;
        socket.userRole = role;
        socket.username = username;
        
        console.log(`User joined: ${username} (${userId})`);
      }

      console.log(`🔍 Role check: role='${role}', is agent? ${role === 'agent'}, is admin? ${role === 'admin'}`);

      if (role === 'agent' || role === 'admin') {
        console.log(`🚀 Agent ${username} attempting to join 'agents' room...`);
        socket.join('agents');
        console.log(`👤 Agent ${username} joined 'agents' room`);
        console.log(`📊 Total agents in room: ${io.sockets.adapter.rooms.get('agents')?.size || 0}`);
        
        // Log all members of agents room for debugging
        const agentsRoom = io.sockets.adapter.rooms.get('agents');
        if (agentsRoom) {
          console.log('👥 Current agents in room:', Array.from(agentsRoom));
        }
        
        // Send a test event immediately to verify socket connection
        setTimeout(() => {
          console.log('🧪 Sending test event to agent...');
          socket.emit('test_agent_connection', { 
            message: 'If you see this alert, your socket connection is working!',
            timestamp: new Date()
          });
        }, 2000);
        
        // Send existing waiting chats to the agent
        const waitingChatRooms = await ChatRoom.find({ status: 'waiting' });
        const waitingChatsData = waitingChatRooms.map(room => ({
          roomId: room.roomId,
          customer: room.guestInfo?.username || room.customerName || 'Unknown Customer',
          customerId: room.customerId,
          isGuest: room.guestInfo ? true : (room.isGuest || false),
          timestamp: room.createdAt
        }));
        
        // Send existing active chats for this agent
        const activeChatRooms = await ChatRoom.find({ 
          status: 'active', 
          agent: userId 
        });
        const activeChatsData = activeChatRooms.map(room => ({
          roomId: room.roomId,
          customer: room.guestInfo?.username || room.customerName || 'Unknown Customer',
          customerId: room.customerId,
          isGuest: room.guestInfo ? true : (room.isGuest || false),
          timestamp: room.createdAt
        }));
        
        socket.emit('existing_waiting_chats', waitingChatsData);
        socket.emit('existing_active_chats', activeChatsData);
        socket.emit('waiting_chats', waitingChatsData.length);
      }

      console.log(`${username} (${role}) joined`);
    } catch (error) {
      console.error('Error handling join:', error);
    }
  });

  // Test ping-pong for connectivity
  socket.on('ping', (data) => {
    console.log('🏓 Ping received from:', socket.username || socket.id);
    socket.emit('pong', { message: 'Server is responsive!', timestamp: new Date() });
  });

  // Handle manual refresh of chat lists
  socket.on('refresh_chat_lists', async () => {
    try {
      console.log(`🔄 Manual refresh requested by: ${socket.username || socket.id}`);
      if (socket.userRole === 'agent' || socket.userRole === 'admin') {
        console.log('🔄 Refreshing chat lists for agent:', socket.username);
        console.log('🔍 Agent user ID:', socket.userId);
        
        // Clear existing lists and resend data
        socket.emit('clear_chat_lists');
        
        // Send fresh waiting chats
        const waitingChatRooms = await ChatRoom.find({ status: 'waiting' });
        console.log(`📊 Found ${waitingChatRooms.length} waiting chats`);
        const waitingChatsData = waitingChatRooms.map(room => ({
          roomId: room.roomId,
          customer: room.customerName,
          customerId: room.customerId,
          isGuest: room.isGuest || false,
          timestamp: room.createdAt
        }));
        
        // Send fresh active chats for this agent
        const activeChatRooms = await ChatRoom.find({ 
          status: 'active', 
          agent: socket.userId 
        });
        console.log(`📊 Found ${activeChatRooms.length} active chats for agent`);
        const activeChatsData = activeChatRooms.map(room => ({
          roomId: room.roomId,
          customer: room.guestInfo?.username || room.customerName || 'Unknown Customer',
          customerId: room.customerId,
          isGuest: room.guestInfo ? true : (room.isGuest || false),
          timestamp: room.createdAt
        }));
        
        socket.emit('existing_waiting_chats', waitingChatsData);
        socket.emit('existing_active_chats', activeChatsData);
        socket.emit('waiting_chats', waitingChatsData.length);
      }
    } catch (error) {
      console.error('Error refreshing chat lists:', error);
    }
  });

  // Handle chat request from customer (guest or registered)
  socket.on('request_chat', async (customerData) => {
    try {
      const { customerId, customerName, isGuest } = customerData;
      
      // Create or find existing chat room
      let chatRoom;
      let isNewRoom = false;
      
      if (isGuest) {
        // For guests, check if they already have a waiting/active room (prevent duplicates)
        chatRoom = await ChatRoom.findOne({
          'guestInfo.username': socket.username,
          status: { $in: ['waiting', 'active'] }
        });
        
        if (!chatRoom) {
          // Only create new room if none exists
          const roomId = `guest_${Date.now()}_${socket.id}`;
          
          chatRoom = new ChatRoom({
            roomId,
            customer: null, // No customer ID for guests
            guestInfo: {    // Store guest info directly in chat room
              username: socket.username,
              socketId: socket.id
            },
            customerName: socket.username,
            organization: 'lightwave',
            department: 'general',
            status: 'waiting'
          });
          await chatRoom.save();
          isNewRoom = true;
          console.log('✨ Created new guest chat room:', roomId);
        } else {
          // Update socket ID for existing room
          chatRoom.guestInfo.socketId = socket.id;
          await chatRoom.save();
          console.log('🔄 Using existing guest chat room:', chatRoom.roomId);
        }
      } else {
        // For registered users, check for existing room
        chatRoom = await ChatRoom.findOne({ 
          customer: customerId, 
          status: { $in: ['waiting', 'active'] }
        });

        if (!chatRoom) {
          const roomId = `chat_${Date.now()}_${customerId}`;
          chatRoom = new ChatRoom({
            roomId,
            customer: customerId,
            customerName: customerName,
            organization: 'lightwave',
            department: 'general',
            status: 'waiting'
          });
          await chatRoom.save();
          isNewRoom = true;
        }
      }

      // Join the chat room
      socket.join(chatRoom.roomId);
      socket.chatRoom = chatRoom.roomId;

      // Initialize AI bot for new rooms (only if chatflow is not enabled)
      if (isNewRoom && OpenAIService.isReady()) {
        try {
          // Check if chatflow is enabled first
          console.log('🔍 Checking if chatflow is enabled before initializing AI bot...');
          const settings = await Settings.findOne({});
          console.log('🐛 DEBUG: Settings found?', !!settings);
          console.log('🐛 DEBUG: Has chatFlow?', !!(settings && settings.chatFlow));
          console.log('🐛 DEBUG: showQuickActions value:', settings?.chatFlow?.showQuickActions);
          console.log('🐛 DEBUG: flowBuilder enabled:', settings?.chatFlow?.flowBuilder?.enabled);
          
          // Chatflow is enabled if either quick actions OR flow builder is enabled
          const chatflowEnabled = settings && settings.chatFlow && (
            settings.chatFlow.showQuickActions || 
            (settings.chatFlow.flowBuilder && settings.chatFlow.flowBuilder.enabled)
          );
          
          if (chatflowEnabled) {
            console.log('🎯 Chatflow is enabled - skipping AI bot initialization');
            console.log('💬 Sending chatflow welcome message to customer');
            
            // Send Flow Builder welcome message
            if (settings.chatFlow.flowBuilder && settings.chatFlow.flowBuilder.enabled) {
              console.log('🏗️ Initializing Flow Builder for new customer');
              
              // Find the welcome step
              const welcomeStep = settings.chatFlow.flowBuilder.steps.find(step => step.id === 'welcome');
              if (welcomeStep) {
                console.log('📨 Sending Flow Builder welcome message:', welcomeStep.content);
                
                // Send welcome message to customer
                socket.emit('message', {
                  id: Date.now(),
                  roomId: chatRoom.roomId,
                  content: welcomeStep.content,
                  sender: 'system',
                  senderName: 'Assistant',
                  timestamp: new Date(),
                  isSystemMessage: true
                });
                
                // After a short delay, proceed to next step if specified
                if (welcomeStep.nextStep) {
                  setTimeout(() => {
                    const nextStep = settings.chatFlow.flowBuilder.steps.find(step => step.id === welcomeStep.nextStep);
                    if (nextStep && nextStep.type === 'choice') {
                      console.log('🔄 Proceeding to next Flow Builder step:', nextStep.id);
                      
                      // Send the choice message
                      socket.emit('message', {
                        id: Date.now() + 1,
                        roomId: chatRoom.roomId,
                        content: nextStep.content,
                        sender: 'system',
                        senderName: 'Assistant',
                        timestamp: new Date(),
                        isSystemMessage: true
                      });
                      
                      // Send the choice options
                      socket.emit('flow_builder_choices', {
                        stepId: nextStep.id,
                        content: nextStep.content,
                        options: nextStep.options || []
                      });
                    }
                  }, 1000);
                }
              } else {
                console.log('❌ No welcome step found in Flow Builder configuration');
                // Fallback to simple welcome
                socket.emit('message', {
                  id: Date.now(),
                  roomId: chatRoom.roomId,
                  content: settings.chatFlow.welcomeFlow || 'Hello! How can I help you today?',
                  sender: 'system',
                  senderName: 'Assistant',
                  timestamp: new Date(),
                  isSystemMessage: true
                });
              }
            } else if (settings.chatFlow.showQuickActions) {
              console.log('🎯 Sending simple chatflow welcome message');
              
              // Send welcome message for simple chatflow
              socket.emit('message', {
                id: Date.now(),
                roomId: chatRoom.roomId,
                content: settings.chatFlow.welcomeFlow || 'Hello! How can I help you today?',
                sender: 'system',
                senderName: 'Assistant',
                timestamp: new Date(),
                isSystemMessage: true
              });
              
              // Send quick actions after a delay
              setTimeout(() => {
                socket.emit('quick_actions', {
                  actions: settings.chatFlow.quickActions?.filter(qa => qa.enabled) || []
                });
              }, 1000);
            }
          } else {
            console.log(`🤖 Chatflow not enabled - initializing AI bot for new room: ${chatRoom.roomId}`);
            const requestedDept = socket.requestedDepartment || 'general';
            console.log(`🏢 Using requested department context: ${requestedDept}`);
            
            const botInit = await AIBotService.initializeBotForChat(
              chatRoom.roomId, 
              requestedDept, // Pass the requested department (centralized hub will handle it)
              customerName
            );
            
            // Send AI greeting
            const greeting = new Message({
              chatRoom: chatRoom.roomId,
              sender: null,
              senderName: botInit.botName,
              senderRole: 'bot',
              message: botInit.greeting,
              metadata: {
                department: botInit.department,
                centralHub: botInit.centralHub,
                isMainRouter: botInit.isMainRouter
              }
            });
            await greeting.save();

            // Send greeting to customer
            socket.emit('receive_message', {
              id: greeting._id,
              message: botInit.greeting,
              senderName: botInit.botName,
              senderRole: 'bot',
              timestamp: greeting.timestamp,
              roomId: chatRoom.roomId,
              department: botInit.department,
              centralHub: botInit.centralHub
            });

            console.log(`🤖 AI bot ${botInit.botName} initialized for room ${chatRoom.roomId} (Central Hub: ${botInit.centralHub})`);
          }
        } catch (aiError) {
          console.error('❌ AI initialization error:', aiError.message);
          // Continue without AI - don't break chat creation
        }
      }

      // Only broadcast as new chat request if this is a truly new room
      if (isNewRoom) {
        // Get current AI bot department for filtering
        let currentDepartment = 'general'; // Default to general
        if (OpenAIService.isReady()) {
          const flowState = AIBotService.getFlowState(chatRoom.roomId);
          if (flowState && flowState.department) {
            currentDepartment = flowState.department;
          }
        }
        
        // Notify all agents about new chat request with department filtering
        const chatRequestData = {
          roomId: chatRoom.roomId,
          customer: customerName,
          customerId: customerId,
          isGuest: isGuest || false,
          timestamp: new Date(),
          department: currentDepartment, // Add current AI bot department
          requestedDepartment: socket.requestedDepartment || 'general' // Original user request
        };

        // Broadcast to all agents
        const agentsCount = io.sockets.adapter.rooms.get('agents')?.size || 0;
        console.log('📢 Broadcasting new chat request to agents:', chatRequestData);
        console.log(`👥 Broadcasting to ${agentsCount} agents in 'agents' room`);
        io.to('agents').emit('new_chat_request', chatRequestData);
      } else {
        console.log('🔄 Using existing room, skipping broadcast to prevent duplicates');
      }

      socket.emit('chat_room_assigned', { roomId: chatRoom.roomId });
    } catch (error) {
      console.error('Error handling chat request:', error);
      socket.emit('error', { message: 'Failed to create chat room' });
    }
  });

  // Handle agent accepting chat
  socket.on('accept_chat', async (data) => {
    console.log('🎯 Agent accepting chat:', data);
    console.log('👤 Agent socket info:', { id: socket.id, username: socket.username, userRole: socket.userRole });
    
    try {
      const { roomId, agentId } = data;
      
      console.log('🔍 Looking for chat room:', { roomId, status: 'waiting' });
      const chatRoom = await ChatRoom.findOneAndUpdate(
        { roomId, status: 'waiting' },
        { agent: agentId, status: 'active' },
        { new: true }
      ).populate('customer', 'username socketId');

      console.log('📋 Found chat room:', chatRoom);

      if (chatRoom) {
        console.log('✅ Chat room found, agent joining room:', roomId);
        socket.join(roomId);
        socket.chatRoom = roomId;

        // Notify customer that agent joined - handle both registered users and guests
        let customerSocketId = null;
        
        if (chatRoom.customer && chatRoom.customer.socketId) {
          // Regular registered customer
          customerSocketId = chatRoom.customer.socketId;
          console.log('📢 Notifying registered customer that agent joined:', customerSocketId);
        } else if (chatRoom.guestInfo && chatRoom.guestInfo.socketId) {
          // Guest customer
          customerSocketId = chatRoom.guestInfo.socketId;
          console.log('📢 Notifying guest customer that agent joined:', customerSocketId);
        } else {
          console.log('⚠️ No customer socket ID found in chat room');
        }
        
        if (customerSocketId) {
          io.to(customerSocketId).emit('agent_joined', {
            agentName: socket.username,
            roomId
          });
        }

        // Notify other agents that this chat is taken
        console.log('📢 Notifying other agents that chat is taken');
        socket.to('agents').emit('chat_taken', { roomId });

        console.log('✅ Sending chat_accepted confirmation to agent');
        socket.emit('chat_accepted', { roomId });
      } else {
        console.log('❌ Chat room not found or not available');
        socket.emit('error', { message: 'Chat room not available' });
      }
    } catch (error) {
      console.error('❌ Error accepting chat:', error);
      socket.emit('error', { message: 'Failed to accept chat' });
    }
  });

  // Handle closing/deleting chat
  socket.on('close_chat', async (data) => {
    try {
      const { roomId } = data;
      
      // Find and delete the chat room
      const chatRoom = await ChatRoom.findOneAndDelete({ roomId });
      
      if (chatRoom) {
        // Clear AI conversation data
        AIBotService.clearConversationData(roomId);
        
        // Delete all messages in this chat room
        await Message.deleteMany({ chatRoom: roomId });
        
        // Notify customer that chat was closed
        const customerSocket = Array.from(io.sockets.sockets.values())
          .find(s => s.chatRoom === roomId && s.userRole === 'guest');
        
        if (customerSocket) {
          customerSocket.emit('chat_closed');
          customerSocket.leave(roomId);
        }
        
        // Leave the room
        socket.leave(roomId);
        
        // Notify other agents that chat was closed
        socket.to('agents').emit('chat_deleted', { roomId });
        
        console.log(`Chat ${roomId} closed and deleted by ${socket.username}`);
      }
    } catch (error) {
      console.error('Error closing chat:', error);
      socket.emit('error', { message: 'Failed to close chat' });
    }
  });

  // Note: send_message handler is defined later for admin interface

  // Handle typing indicators
  socket.on('typing', (data) => {
    socket.to(data.roomId).emit('user_typing', {
      username: socket.username,
      isTyping: data.isTyping
    });
  });

  // Handle admin/agent joining specific chat rooms
  socket.on('join_room', async (data) => {
    console.log('🚪 Join room request:', data)
    console.log('🔑 Socket auth info:', { userId: socket.userId, username: socket.username, role: socket.userRole })
    try {
      const { roomId, userId, role } = data;
      console.log(`👤 ${role} ${userId} joining room: ${roomId}`);
      
      socket.join(roomId);
      console.log(`✅ Successfully joined room: ${roomId}`);
      
      // Notify room about agent joining
      socket.to(roomId).emit('agent_joined', {
        agentName: socket.username,
        timestamp: new Date().toISOString()
      });
      console.log('📢 Notified room about agent joining');
      
    } catch (error) {
      console.error('Error joining room:', error);
    }
  });

  // Handle leaving specific chat rooms
  socket.on('leave_room', async (data) => {
    try {
      const { roomId } = data;
      console.log(`👤 ${socket.username} leaving room: ${roomId}`);
      
      socket.leave(roomId);
      
    } catch (error) {
      console.error('Error leaving room:', error);
    }
  });

  // Handle agent assignment to chat
  socket.on('agent_assigned', async (data) => {
    try {
      const { chatId, roomId, agent } = data;
      
      // Update chat room in database
      const chatRoom = await ChatRoom.findById(chatId);
      if (chatRoom) {
        chatRoom.agent = agent.id;
        chatRoom.agentName = agent.name;
        chatRoom.status = 'active';
        await chatRoom.save();
        
        // Notify all admin interfaces
        io.emit('chat_updated', {
          _id: chatId,
          roomId: roomId,
          agent: agent,
          status: 'active'
        });
        
        // Notify customer in the room
        io.to(roomId).emit('agent_assigned', {
          agentName: agent.name,
          message: `${agent.name} has joined the chat`
        });
      }
      
    } catch (error) {
      console.error('Error assigning agent:', error);
    }
  });

  // Handle new messages from admin interface
  socket.on('send_message', async (messageData) => {
    console.log('📥 Received send_message from admin:', messageData)
    console.log('🔑 Socket info:', { userId: socket.userId, username: socket.username, role: socket.userRole })
    try {
      const { roomId, content, message, sender, senderName, timestamp } = messageData;
      
      // Use either content or message field (support both formats)
      const messageText = content || message;
      
      if (!messageText) {
        console.error('❌ No message content provided:', messageData);
        socket.emit('error', { message: 'Message content is required' });
        return;
      }
      
      console.log('✅ Processing message for room:', roomId, 'content:', messageText)
      
      // Save message to database
      const newMessage = new Message({
        chatRoom: roomId,
        sender: sender === 'agent' ? socket.userId : null,
        senderName,
        senderRole: sender,
        message: messageText,
        timestamp: timestamp ? new Date(timestamp) : new Date()
      });
      
      await newMessage.save();

      // Broadcast to all clients in the room (including sender for consistency)
      const messageResponse = {
        _id: newMessage._id,
        id: newMessage._id,
        roomId: roomId,
        content: messageText,
        message: messageText,  // Support both formats
        sender,
        senderName,
        senderRole: sender,
        timestamp: newMessage.timestamp,
        roomId
      };

      // Send to all room participants (including sender for admin interface)
      io.to(roomId).emit('receive_message', messageResponse);
      console.log('📤 Broadcasted message to room:', roomId);
      
      // Also emit room-specific event for more reliable delivery
      io.to(roomId).emit(`receive_message_${roomId}`, messageResponse);
      console.log('📤 Sent room-specific message event:', `receive_message_${roomId}`);
      
      // Send confirmation back to sender
      socket.emit('message_sent', {
        _id: newMessage._id,
        success: true,
        timestamp: newMessage.timestamp
      });
      
      // Update last message in chat room
      await ChatRoom.findOneAndUpdate(
        { roomId: roomId },
        { 
          lastMessage: messageText,
          lastMessageTime: new Date(),
          messageCount: { $inc: 1 }
        }
      );
      
      // Notify admin interfaces
      io.emit('message_update', {
        roomId,
        lastMessage: {
          content: messageText,
          timestamp: newMessage.timestamp
        }
      });

      // Check if this is a customer message and trigger AI bot response if appropriate
      if (sender === 'guest' || sender === 'customer') {
        console.log('🔵 Customer message detected:', messageText);
        console.log('  👤 Sender:', sender, senderName);
        console.log('  🏠 Room:', roomId);
        
        // Check if AI bot is active for this room and no human agent is assigned
        const chatRoom = await ChatRoom.findOne({ roomId });
        const hasHumanAgent = chatRoom && chatRoom.agentId;
        
        console.log('🔍 Chat room status:');
        console.log('  👥 Has human agent:', !!hasHumanAgent);
        console.log('  🤖 OpenAI ready:', OpenAIService.isReady());
        
        if (!hasHumanAgent && OpenAIService.isReady()) {
          try {
            console.log('🚀 Generating AI bot response for room:', roomId);
            console.log('  📝 Processing message:', messageText);
            console.log('  👤 Customer name:', senderName);
            
            // Show typing indicator immediately
            io.to(roomId).emit('bot_typing', { 
              isTyping: true, 
              botName: 'Lightwave Assistant' 
            });
            
            // Add thinking delay (1-3 seconds based on message length)
            const thinkingTime = Math.min(3000, Math.max(1000, messageText.length * 30));
            await new Promise(resolve => setTimeout(resolve, thinkingTime));
            
            const aiResponse = await AIBotService.processMessage(roomId, messageText, senderName);
            
            console.log('✅ AI response generated:');
            console.log('  🤖 Bot name:', aiResponse.botName);
            console.log('  📝 Response:', aiResponse.response);
            console.log('  🏢 Department:', aiResponse.department);
            
            if (aiResponse && aiResponse.response) {
              // Hide typing indicator
              io.to(roomId).emit('bot_typing', { 
                isTyping: false 
              });
              
              // Save AI response to database  
              const botName = aiResponse.botName || 'Lightwave Assistant';
              const aiMessage = new Message({
                chatRoom: roomId,
                sender: null,
                senderName: botName,
                senderRole: 'bot',
                message: aiResponse.response,
                metadata: {
                  department: aiResponse.department,
                  isAI: true,
                  botName: botName
                }
              });
              
              await aiMessage.save();

              // Send AI response to the room with a slight delay for natural feel
              setTimeout(() => {
                const aiMessageResponse = {
                  _id: aiMessage._id,
                  id: aiMessage._id,
                  roomId: roomId,
                  content: aiResponse.response,
                  message: aiResponse.response,
                  sender: 'bot',
                  senderName: botName,
                  senderRole: 'bot',
                  timestamp: aiMessage.timestamp,
                  department: aiResponse.department
                };

                io.to(roomId).emit('receive_message', aiMessageResponse);
                io.to(roomId).emit(`receive_message_${roomId}`, aiMessageResponse);
                
                console.log('🤖 AI response sent to room:', roomId);
                
                // Update last message in chat room
                ChatRoom.findOneAndUpdate(
                  { roomId: roomId },
                  { 
                    lastMessage: aiResponse.response,
                    lastMessageTime: new Date()
                  }
                ).catch(err => console.error('Error updating chat room with AI message:', err));
                
              }, 1500); // 1.5 second delay for natural conversation flow
            }
            
          } catch (aiError) {
            console.error('❌ AI response error:', aiError.message);
            // Hide typing indicator on error
            io.to(roomId).emit('bot_typing', { 
              isTyping: false 
            });
            // Don't break the message flow if AI fails
          }
        } else {
          console.log('🤖 Skipping AI response - human agent present or AI not ready');
        }
      }

    } catch (error) {
      console.error('Error sending admin message:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  });

  // Handle Flow Builder choice selection
  socket.on('flow_choice_selected', async (data) => {
    console.log('🎯 Flow choice selected:', JSON.stringify(data, null, 2));
    
    try {
      const { choice, customerId, roomId } = data;
      
      if (!choice || !choice.value || !choice.nextStep) {
        console.log('❌ Invalid choice data:', data);
        return;
      }

      console.log(`🔄 Processing Flow Builder choice: ${choice.text} -> ${choice.nextStep}`);
      
      // Load current settings to get Flow Builder configuration
      const settings = await Settings.findOne({});
      if (!settings || !settings.chatFlow || !settings.chatFlow.flowBuilder || !settings.chatFlow.flowBuilder.enabled) {
        console.log('❌ Flow Builder not configured or disabled');
        return;
      }

      // Find the next step
      const nextStep = settings.chatFlow.flowBuilder.steps.find(step => step.id === choice.nextStep);
      if (!nextStep) {
        console.log(`❌ Next step not found: ${choice.nextStep}`);
        return;
      }

      console.log(`✅ Found next step: ${nextStep.id} (${nextStep.type})`);

      // Process based on step type
      if (nextStep.type === 'choice') {
        // Send new choices
        console.log('📤 Sending new Flow Builder choices for step:', nextStep.id);
        
        const choiceData = {
          stepId: nextStep.id,
          content: nextStep.content,
          options: nextStep.options || []
        };
        
        console.log('📤 Emitting flow_builder_choices:', choiceData);
        socket.emit('flow_builder_choices', choiceData);
        console.log('✅ flow_builder_choices event sent successfully');
        
      } else if (nextStep.type === 'ai_handoff') {
        // Hand off to AI
        console.log('🤖 Handing off to AI chat');
        
        // Send transition message
        socket.emit('receive_message', {
          id: Date.now(),
          roomId: roomId,
          content: nextStep.content || 'Connecting you to our AI assistant...',
          sender: 'system',
          senderName: 'Assistant',
          timestamp: new Date(),
          isSystemMessage: true
        });
        
        try {
          // Initialize AI bot for this room
          const AIBotService = require('./src/server/services/AIBotService');
          const Message = require('./src/server/models/Message');
          
          const customerName = socket.username || 'Customer';
          const requestedDept = 'technical'; // Based on Flow Builder choice
          
          console.log(`🤖 Initializing AI bot for Flow Builder handoff - Room: ${roomId}, Department: ${requestedDept}`);
          
          const botInit = await AIBotService.initializeBotForChat(
            roomId, 
            requestedDept,
            customerName
          );
          
          console.log('🔍 Bot initialization result:', {
            botName: botInit.botName,
            greeting: botInit.greeting,
            department: botInit.department
          });
          
          // Use custom bot name and greeting for Flow Builder
          const botName = 'Lightwave Assistant';
          const greetingMessage = `Hi! I'm your Lightwave AI Assistant. I'm here to help you with technical support and product questions. What can I help you with today?`;
          
          console.log(`📨 Sending AI greeting: "${greetingMessage}"`);
          
          // Send AI greeting
          const greeting = new Message({
            chatRoom: roomId,
            sender: null,
            senderName: botName,
            senderRole: 'bot',
            message: greetingMessage,
            metadata: {
              department: botInit.department,
              centralHub: botInit.centralHub,
              isMainRouter: botInit.isMainRouter,
              isFlowBuilderHandoff: true
            }
          });
          await greeting.save();

          // Send greeting to customer
          socket.emit('receive_message', {
            id: greeting._id,
            message: greetingMessage,
            content: greetingMessage,  // Add content property for frontend compatibility
            senderName: botName,
            senderRole: 'bot',
            timestamp: greeting.timestamp,
            roomId: roomId,
            department: botInit.department,
            centralHub: botInit.centralHub
          });

          console.log(`✅ AI greeting sent successfully from ${botName} in room ${roomId}`);
          
        } catch (aiError) {
          console.error('❌ AI initialization error in Flow Builder:', aiError.message);
          
          // Send fallback message
          socket.emit('receive_message', {
            id: Date.now(),
            roomId: roomId,
            content: 'I\'m here to help! Please type your question and I\'ll do my best to assist you.',
            sender: 'system',
            senderName: 'AI Assistant',
            timestamp: new Date(),
            isSystemMessage: false
          });
        }
        
      } else if (nextStep.type === 'agent_queue') {
        // Hand off to human agent
        console.log('👤 Adding to agent queue');
        socket.emit('receive_message', {
          id: Date.now(),
          roomId: roomId,
          content: nextStep.content || 'Please wait while we connect you to an agent...',
          sender: 'system',
          senderName: 'Assistant',
          timestamp: new Date(),
          isSystemMessage: true
        });
        
        // Broadcast to agents that customer is waiting
        io.to('agents').emit('customer_waiting', {
          roomId: roomId,
          customerId: customerId,
          department: choice.value,
          timestamp: new Date()
        });
        
      } else if (nextStep.type === 'rating') {
        // Show CSAT rating
        console.log('⭐ Showing CSAT rating');
        socket.emit('receive_message', {
          id: Date.now(),
          roomId: roomId,
          content: nextStep.content || 'How was your experience?',
          sender: 'system',
          senderName: 'Assistant',
          timestamp: new Date(),
          isSystemMessage: true
        });
        
        // Send rating options
        socket.emit('csat_rating', {
          stepId: nextStep.id,
          content: nextStep.content,
          scale: settings.chatFlow.csat?.scale || 5,
          question: settings.chatFlow.csat?.question || 'How would you rate your experience?'
        });
        
      } else {
        // Default message step
        console.log('💬 Sending message step');
        socket.emit('receive_message', {
          id: Date.now(),
          roomId: roomId,
          content: nextStep.content,
          sender: 'system',
          senderName: 'Assistant',
          timestamp: new Date(),
          isSystemMessage: true
        });
      }

    } catch (error) {
      console.error('❌ Error processing Flow Builder choice:', error);
      socket.emit('error', { message: 'Failed to process your selection' });
    }
  });

  // Handle disconnect
  socket.on('disconnect', async () => {
    try {
      if (socket.userId && socket.userRole !== 'guest') {
        // Only update database for non-guest users
        await User.findByIdAndUpdate(socket.userId, { 
          isOnline: false,
          socketId: null
        });
      }
      console.log(`User disconnected: ${socket.username || socket.id}`);
    } catch (error) {
      console.error('Error handling disconnect:', error);
    }
  });
});

// Serve static files
app.get('/', (req, res) => {
  // Redirect root to Vue.js login page
  res.redirect('/#/login');
});

app.get('/agent', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'agent.html'));
});

app.get('/customer', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'customer.html'));
});

app.get('/widget', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'widget.html'));
});

app.get('/agent-departments', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'agent-departments.html'));
});

// Serve Vue.js App
app.get('/app/*', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'dist', 'index.html'));
});

app.get('/app', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'dist', 'index.html'));
});

// Admin routes - serve Vue.js app 
// Since Vue uses hash routing (#/), we need to serve the SPA for admin routes
app.get('/admin', (req, res) => {
  // Redirect to Vue app with hash routing
  res.redirect('/#/dashboard');
});

app.get('/dashboard', (req, res) => {
  res.redirect('/#/dashboard');
});

app.get('/analytics', (req, res) => {
  res.redirect('/#/analytics');
});

app.get('/users', (req, res) => {
  res.redirect('/#/users');
});

app.get('/login', (req, res) => {
  res.redirect('/#/login');
});

// Catch-all route for SPA - serve Vue.js index.html
app.get('*', (req, res, next) => {
  // Skip API routes and static files
  if (req.path.startsWith('/api/') || 
      req.path.startsWith('/assets/') || 
      req.path.startsWith('/public/') ||
      req.path.includes('.')) {
    return next();
  }
  
  // Serve Vue.js SPA for all other routes
  res.sendFile(path.join(__dirname, 'frontend', 'dist', 'index.html'));
});

// Lightwave Organization Routes - All lead to customer chat (centralized hub)
app.get('/lightwave', (req, res) => {
  // Main organization page - redirects to customer chat (centralized hub)
  res.sendFile(path.join(__dirname, 'public', 'customer.html'));
});

app.get('/lightwave/general', (req, res) => {
  // General chat - the main entry point (centralized hub)
  res.sendFile(path.join(__dirname, 'public', 'customer.html'));
});

app.get('/lightwave/sales', (req, res) => {
  // Sales department - but customers start in general chat first
  res.sendFile(path.join(__dirname, 'public', 'customer.html'));
});

app.get('/lightwave/technical', (req, res) => {
  // Technical support - but customers start in general chat first
  res.sendFile(path.join(__dirname, 'public', 'customer.html'));
});

app.get('/lightwave/support', (req, res) => {
  // Customer support - but customers start in general chat first
  res.sendFile(path.join(__dirname, 'public', 'customer.html'));
});

app.get('/lightwave/billing', (req, res) => {
  // Billing department - but customers start in general chat first
  res.sendFile(path.join(__dirname, 'public', 'customer.html'));
});

// Initialize OpenAI from environment or settings on startup
async function initializeOpenAIFromSettings() {
  try {
    let apiKey = null;
    let organizationId = null;
    
    // First try to load from environment variables
    if (process.env.OPENAI_API_KEY) {
      console.log('🤖 Loading OpenAI configuration from environment variables...');
      apiKey = process.env.OPENAI_API_KEY;
      organizationId = process.env.OPENAI_ORGANIZATION_ID;
    } else {
      // Fallback to database settings
      try {
        const { organizationSettings } = require('./src/server/routes/settings');
        if (organizationSettings?.ai?.openaiApiKey) {
          console.log('🤖 Loading OpenAI configuration from database settings...');
          apiKey = organizationSettings.ai.openaiApiKey;
          organizationId = organizationSettings.ai.organizationId;
        }
      } catch (settingsError) {
        console.log('ℹ️ Could not load settings, trying environment only');
      }
    }
    
    if (apiKey) {
      const success = OpenAIService.configure(apiKey, organizationId);
      
      if (success) {
        console.log('✅ OpenAI initialized successfully');
        console.log(`🔑 API Key: ${apiKey.substring(0, 7)}...${apiKey.slice(-4)}`);
      } else {
        console.log('❌ Failed to initialize OpenAI - invalid API key format');
      }
    } else {
      console.log('ℹ️ No OpenAI API key found in environment or settings - AI features disabled');
      console.log('💡 Add OPENAI_API_KEY to your .env file or configure in Settings');
    }
  } catch (error) {
    console.error('❌ Error initializing OpenAI:', error);
  }
}

// Initialize application
async function startServer() {
    try {
        console.log('🚀 Starting ConvoAI Live Chat System...');
        
        // Initialize database connection
        console.log('📊 Connecting to MongoDB Atlas...');
        await database.connect();
        
        // Initialize Analytics Service with models
        AnalyticsService.initialize(Message, ChatRoom);

        // Initialize ChatFlow Service with Settings model
        const Settings = require('./src/server/models/Settings');
        ChatFlowService.initialize(Settings);
        
        // Initialize knowledge base (with fallback)
        console.log('📚 Initializing Knowledge Base...');
        await knowledgeBase.initialize();
        
        // Initialize OpenAI configuration
        await initializeOpenAIFromSettings();
        
        // Start server
        server.listen(PORT, () => {
            console.log('🎉 ConvoAI Live Chat System started successfully!');
            console.log(`🌐 Server running on port ${PORT}`);
            console.log(`📊 Database: ${database.isHealthy() ? 'Connected' : 'Disconnected'}`);
            console.log(`📚 Knowledge Base: ${knowledgeBase.isInitialized ? 'Initialized' : 'Initializing'}`);
            console.log(`🔗 Health check: http://localhost:${PORT}/health`);
            console.log(`🎯 Main application: http://localhost:${PORT}`);
        });
        
    } catch (error) {
        console.error('💥 Failed to start server:', error.message);
        console.error('Stack trace:', error.stack);
        
        // Graceful shutdown
        process.exit(1);
    }
}

// Setup default admin user (development only)
app.get('/setup-admin', async (req, res) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ error: 'Not available in production' });
    }

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: 'admin@convoai.com' });
    if (existingAdmin) {
      return res.json({ 
        success: true,
        message: 'Admin user already exists',
        credentials: {
          email: 'admin@convoai.com',
          password: 'admin123',
          role: existingAdmin.role
        }
      });
    }

    // Create admin user
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const adminUser = new User({
      username: 'admin',
      email: 'admin@convoai.com',
      password: hashedPassword,
      role: 'super_admin',
      isActive: true,
      profile: {
        avatar: null,
        bio: 'System Administrator'
      }
    });

    await adminUser.save();
    
    res.json({
      success: true,
      message: 'Admin user created successfully!',
      credentials: {
        email: 'admin@convoai.com',
        password: 'admin123',
        role: 'super_admin'
      }
    });

  } catch (error) {
    console.error('Setup admin error:', error);
    res.status(500).json({ error: 'Failed to create admin user' });
  }
});

// Admin Login Route (no auth required)
app.get('/admin-login', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'admin-login.html'));
});

// Clean Admin Routes with Authentication
app.get('/agent', requireAdminAuth(['agent', 'admin', 'super_admin', 'global_admin']), (req, res) => {
  // Remove emojis and create clean agent dashboard
  let html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Agent Dashboard - ConvoAI</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    <link rel="stylesheet" href="/css/style.css">
    <link rel="stylesheet" href="/css/agent.css">
    <style>
        .admin-header {
            background: linear-gradient(135deg, #4299e1, #667eea);
            color: white;
            padding: 20px;
            margin-bottom: 20px;
            border-radius: 10px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .logout-btn {
            background: rgba(255,255,255,0.2);
            border: 1px solid white;
            color: white;
            padding: 8px 16px;
            border-radius: 5px;
            cursor: pointer;
            text-decoration: none;
        }
        .logout-btn:hover { background: rgba(255,255,255,0.3); }
        body { margin: 0; padding: 20px; background: #f5f5f5; }
    </style>
</head>
<body>
    <div class="admin-header">
        <div>
            <h1><i class="fas fa-headset"></i> Agent Dashboard</h1>
            <p>Welcome, ${req.currentUser.username}</p>
        </div>
        <button class="logout-btn" onclick="logout()">
            <i class="fas fa-sign-out-alt"></i> Logout
        </button>
    </div>
    <div id="agent-content">
        <iframe src="/agent-departments.html" 
                style="width: 100%; height: 80vh; border: none; border-radius: 8px;">
        </iframe>
    </div>
    <script>
        function logout() {
            localStorage.removeItem('adminToken');
            localStorage.removeItem('adminRole');
            window.location.href = '/admin-login';
        }
        // Set token for iframe requests
        window.addEventListener('load', function() {
            const token = localStorage.getItem('adminToken');
            if (!token) {
                window.location.href = '/admin-login';
            }
        });
    </script>
</body>
</html>`;
  res.send(html);
});

app.get('/admin', requireAdminAuth(['admin', 'super_admin', 'global_admin']), (req, res) => {
  let html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin Dashboard - ConvoAI</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    <style>
        body { 
            margin: 0; padding: 20px; background: #f5f5f5; 
            font-family: 'Inter', sans-serif;
        }
        .admin-header {
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
            padding: 25px;
            margin-bottom: 25px;
            border-radius: 12px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
        }
        .admin-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            max-width: 1200px;
        }
        .admin-card {
            background: white;
            padding: 25px;
            border-radius: 12px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
            text-align: center;
            transition: transform 0.3s;
        }
        .admin-card:hover { transform: translateY(-5px); }
        .admin-card i { font-size: 3rem; color: #4299e1; margin-bottom: 15px; }
        .admin-card h3 { margin-bottom: 15px; color: #2d3748; }
        .admin-btn {
            background: linear-gradient(135deg, #4299e1, #667eea);
            color: white;
            padding: 12px 24px;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            text-decoration: none;
            display: inline-block;
            margin-top: 10px;
        }
        .logout-btn {
            background: rgba(255,255,255,0.2);
            border: 1px solid white;
            color: white;
            padding: 10px 20px;
            border-radius: 8px;
            cursor: pointer;
        }
    </style>
</head>
<body>
    <div class="admin-header">
        <div>
            <h1><i class="fas fa-user-shield"></i> System Admin Dashboard</h1>
            <p>Welcome, ${req.currentUser.username} | Role: ${req.currentUser.role}</p>
        </div>
        <button class="logout-btn" onclick="logout()">
            <i class="fas fa-sign-out-alt"></i> Logout
        </button>
    </div>
    
    <div class="admin-grid">
        <div class="admin-card">
            <i class="fas fa-users"></i>
            <h3>User Management</h3>
            <p>Manage agents, admins, and user permissions</p>
            <a href="/agent" class="admin-btn">Manage Users</a>
        </div>
        
        <div class="admin-card">
            <i class="fas fa-cog"></i>
            <h3>AI Configuration</h3>
            <p>Configure AI models and chat settings</p>
            <a href="/ai-config.html" class="admin-btn" target="_blank">Configure AI</a>
        </div>
        
        <div class="admin-card">
            <i class="fas fa-chart-bar"></i>
            <h3>Analytics</h3>
            <p>View system performance and chat analytics</p>
            <a href="/health" class="admin-btn" target="_blank">System Health</a>
        </div>
        
        <div class="admin-card">
            <i class="fas fa-building"></i>
            <h3>Organizations</h3>
            <p>Manage multi-tenant organizations</p>
            <a href="/org-admin" class="admin-btn">Org Management</a>
        </div>
    </div>
    
    <script>
        function logout() {
            localStorage.removeItem('adminToken');
            localStorage.removeItem('adminRole');
            window.location.href = '/admin-login';
        }
    </script>
</body>
</html>`;
  res.send(html);
});

app.get('/org-admin', requireAdminAuth(['admin', 'super_admin', 'global_admin']), (req, res) => {
  let html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Organization Admin - ConvoAI</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    <style>
        body { margin: 0; padding: 20px; background: #f5f5f5; font-family: 'Inter', sans-serif; }
        .admin-header {
            background: linear-gradient(135deg, #1e88e5, #1565c0);
            color: white;
            padding: 25px;
            margin-bottom: 25px;
            border-radius: 12px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
        }
        .logout-btn {
            background: rgba(255,255,255,0.2);
            border: 1px solid white;
            color: white;
            padding: 10px 20px;
            border-radius: 8px;
            cursor: pointer;
        }
        .org-frame {
            background: white;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
        }
    </style>
</head>
<body>
    <div class="admin-header">
        <div>
            <h1><i class="fas fa-building"></i> Organization Admin</h1>
            <p>Welcome, ${req.currentUser.username}</p>
        </div>
        <button class="logout-btn" onclick="logout()">
            <i class="fas fa-sign-out-alt"></i> Logout
        </button>
    </div>
    
    <div class="org-frame">
        <iframe src="/org-admin.html" 
                style="width: 100%; height: 85vh; border: none;">
        </iframe>
    </div>
    
    <script>
        function logout() {
            localStorage.removeItem('adminToken');
            localStorage.removeItem('adminRole');
            window.location.href = '/admin-login';
        }
    </script>
</body>
</html>`;
  res.send(html);
});

// Handle graceful shutdown
process.on('SIGTERM', async () => {
    console.log('🛑 Received SIGTERM, shutting down gracefully...');
    await database.disconnect();
    server.close(() => {
        process.exit(0);
    });
});

process.on('SIGINT', async () => {
    console.log('🛑 Received SIGINT, shutting down gracefully...');
    await database.disconnect();
    server.close(() => {
        process.exit(0);
    });
});

// Start the server
startServer();