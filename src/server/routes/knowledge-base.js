const express = require('express');
const multer = require('multer');
const router = express.Router();
const KnowledgeBaseController = require('../controllers/KnowledgeBaseController');

// Configure multer for file uploads
const upload = multer({
    dest: 'uploads/',
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        // Prioritize Excel template files, allow other formats as fallback
        const allowedTypes = [
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx files (preferred)
            'application/vnd.ms-excel', // .xls files
            'text/plain',
            'text/csv',
            'application/json',
            'text/markdown'
        ];
        
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Please use the Knowledge Base Excel template (.xlsx) or text files (.txt, .json, .csv, .md).'));
        }
    }
});

// Get knowledge base statistics
router.get('/stats', KnowledgeBaseController.getStats);

// Search knowledge base
router.get('/search', KnowledgeBaseController.search);

// Get all categories
router.get('/categories', KnowledgeBaseController.getCategories);

// Get items by category
router.get('/category/:category', KnowledgeBaseController.getItemsByCategory);

// Add new knowledge item
router.post('/add', KnowledgeBaseController.addKnowledge);

// Delete knowledge item
router.delete('/delete/:id', KnowledgeBaseController.deleteKnowledge);

// Initialize/reload knowledge base
router.post('/initialize', KnowledgeBaseController.initialize);

// Upload files to knowledge base
router.post('/upload', upload.fields([
  { name: 'files', maxCount: 10 },
  { name: 'file', maxCount: 1 }
]), KnowledgeBaseController.uploadFiles);

// Download knowledge base template
router.get('/template', KnowledgeBaseController.downloadTemplate);

// Export category as JSON
router.get('/export/:category', KnowledgeBaseController.exportCategory);

// Rename category
router.post('/category/rename', KnowledgeBaseController.renameCategory);

module.exports = router;