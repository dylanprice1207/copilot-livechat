const AuthService = require('../services/AuthService');

class AuthController {
  // Register endpoint
  async register(req, res) {
    try {
      const user = await AuthService.register(req.body);
      res.status(201).json({ 
        message: 'User created successfully',
        user 
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(400).json({ error: error.message });
    }
  }

  // Login endpoint
  async login(req, res) {
    try {
      const result = await AuthService.login(req.body);
      res.json({
        message: 'Login successful',
        ...result
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(400).json({ error: error.message });
    }
  }

  // Logout endpoint
  async logout(req, res) {
    try {
      // Update user offline status
      if (req.user) {
        const { User } = require('../models');
        await User.findByIdAndUpdate(req.user._id, { isOnline: false });
      }
      
      res.json({ message: 'Logout successful' });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }

  // Get current user
  async getProfile(req, res) {
    try {
      const user = {
        id: req.user._id,
        username: req.user.username,
        email: req.user.email,
        role: req.user.role,
        isOnline: req.user.isOnline
      };
      
      res.json({ user });
    } catch (error) {
      console.error('Profile error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
}

module.exports = new AuthController();