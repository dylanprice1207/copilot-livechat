const express = require('express');
const AuthController = require('../controllers/AuthController');
const AuthService = require('../services/AuthService');

const router = express.Router();

// Public routes
router.post('/register', AuthController.register);
router.post('/login', AuthController.login);

// Protected routes
router.post('/logout', AuthService.authenticateToken.bind(AuthService), AuthController.logout);
router.get('/profile', AuthService.authenticateToken.bind(AuthService), AuthController.getProfile);

// Test endpoint
router.get('/test', (req, res) => {
  res.json({ message: 'API is working!' });
});

module.exports = router;