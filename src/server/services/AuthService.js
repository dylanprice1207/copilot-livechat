const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

class AuthService {
  constructor() {
    this.JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
  }

  // Hash password
  async hashPassword(password) {
    return await bcrypt.hash(password, 10);
  }

  // Compare password
  async comparePassword(password, hashedPassword) {
    return await bcrypt.compare(password, hashedPassword);
  }

  // Generate JWT token
  generateToken(userId) {
    return jwt.sign({ userId }, this.JWT_SECRET, { expiresIn: '24h' });
  }

  // Verify JWT token
  verifyToken(token) {
    return jwt.verify(token, this.JWT_SECRET);
  }

  // Register new user
  async register(userData) {
    const { username, email, password, role } = userData;

    // Validation
    if (!username || !email || !password) {
      throw new Error('All fields are required');
    }

    // Check if user exists
    const existingUser = await User.findOne({ 
      $or: [{ email }, { username }] 
    });
    
    if (existingUser) {
      throw new Error('User already exists');
    }

    // Hash password
    const hashedPassword = await this.hashPassword(password);

    // Create user
    const user = new User({
      username,
      email,
      password: hashedPassword,
      role: role || 'customer'
    });

    await user.save();

    return { 
      id: user._id, 
      username: user.username, 
      email: user.email,
      role: user.role 
    };
  }

  // Login user
  async login(credentials) {
    const { username, password } = credentials;

    // Find user
    const user = await User.findOne({ 
      $or: [{ email: username }, { username }] 
    });

    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Check password
    const isValidPassword = await this.comparePassword(password, user.password);
    if (!isValidPassword) {
      throw new Error('Invalid credentials');
    }

    // Update user online status
    user.isOnline = true;
    await user.save();

    // Generate token
    const token = this.generateToken(user._id);

    return {
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    };
  }

  // Middleware for token authentication
  async authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    try {
      const decoded = this.verifyToken(token);
      const user = await User.findById(decoded.userId);
      if (!user) {
        return res.status(401).json({ error: 'User not found' });
      }
      req.user = user;
      next();
    } catch (error) {
      res.status(403).json({ error: 'Invalid token' });
    }
  }
}

module.exports = new AuthService();