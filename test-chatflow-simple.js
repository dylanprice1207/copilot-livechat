// Simple test to check chatflow functionality
const express = require('express');
const app = express();
const port = 3001;

app.use(express.json());
app.use(express.static('public'));

// Simple chatflow test endpoint
app.get('/test-chatflow', (req, res) => {
    res.json({
        enabled: true,
        welcomeFlow: 'Hi there! 👋 Welcome to Lightwave AI support. How can I help you today?',
        quickActions: [
            { text: 'Technical Support', response: 'I\'ll connect you with our technical support team.' },
            { text: 'Sales Inquiry', response: 'Let me help you with sales information.' },
            { text: 'General Question', response: 'I\'m here to help with your general questions.' }
        ]
    });
});

app.get('/test-welcome', (req, res) => {
    res.json({
        message: 'Hi there! 👋 Welcome to Lightwave AI support. How can I help you today?'
    });
});

app.listen(port, () => {
    console.log(`Test server running at http://localhost:${port}`);
    console.log('Test chatflow at: http://localhost:' + port + '/test-chatflow');
    console.log('Test welcome at: http://localhost:' + port + '/test-welcome');
});