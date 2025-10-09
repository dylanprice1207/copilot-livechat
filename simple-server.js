// Simple HTTP server to test customer chat
const express = require('express');
const path = require('path');
const app = express();

app.use(express.static('.'));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'customer.html'));
});

app.listen(8000, () => {
    console.log('Test server running at http://localhost:8000');
    console.log('Customer chat at: http://localhost:8000/customer.html');
});