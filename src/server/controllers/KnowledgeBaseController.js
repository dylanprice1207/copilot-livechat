const KnowledgeBaseService = require('../services/KnowledgeBaseService');

class KnowledgeBaseController {
    /**
     * Get organization ID from request (user's organization)
     */
    getOrganizationId(req) {
        // Extract organization ID from authenticated user
        return req.user?.organizationId || req.user?.organization || null;
    }

    /**
     * Get knowledge base statistics
     */
    async getStats(req, res) {
        try {
            const organizationId = this.getOrganizationId(req);
            
            if (!organizationId) {
                return res.status(400).json({
                    success: false,
                    message: 'Organization context required'
                });
            }

            const stats = await KnowledgeBaseService.getStats(organizationId);
            
            // Also get storage usage for subscription monitoring
            const storageUsage = await KnowledgeBaseService.getStorageUsage(organizationId);
            
            res.json({
                success: true,
                stats: stats,
                storage: storageUsage
            });
        } catch (error) {
            console.error('❌ Error getting KB stats:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get knowledge base statistics',
                error: error.message
            });
        }
    }

    /**
     * Search knowledge base
     */
    async search(req, res) {
        try {
            const { query, category, limit } = req.query;
            const organizationId = this.getOrganizationId(req);
            
            if (!query) {
                return res.status(400).json({
                    success: false,
                    message: 'Search query is required'
                });
            }

            if (!organizationId) {
                return res.status(400).json({
                    success: false,
                    message: 'Organization context required'
                });
            }

            const results = await KnowledgeBaseService.searchKnowledge(
                query,
                organizationId,
                category || null, 
                parseInt(limit) || 5
            );

            res.json({
                success: true,
                query: query,
                category: category,
                organizationId: organizationId,
                results: results
            });
        } catch (error) {
            console.error('❌ Error searching KB:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to search knowledge base',
                error: error.message
            });
        }
    }

    /**
     * Get all categories
     */
    async getCategories(req, res) {
        try {
            const organizationId = this.getOrganizationId(req);
            
            if (!organizationId) {
                return res.status(400).json({
                    success: false,
                    message: 'Organization context required'
                });
            }

            const categories = await KnowledgeBaseService.getCategories(organizationId);
            res.json({
                success: true,
                organizationId: organizationId,
                categories: categories
            });
        } catch (error) {
            console.error('❌ Error getting categories:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get categories',
                error: error.message
            });
        }
    }

    /**
     * Get items by category
     */
    async getItemsByCategory(req, res) {
        try {
            const { category } = req.params;
            const organizationId = this.getOrganizationId(req);
            
            if (!category) {
                return res.status(400).json({
                    success: false,
                    message: 'Category is required'
                });
            }

            if (!organizationId) {
                return res.status(400).json({
                    success: false,
                    message: 'Organization context required'
                });
            }

            const items = await KnowledgeBaseService.getItemsByCategory(category, organizationId);
            res.json({
                success: true,
                category: category,
                organizationId: organizationId,
                items: items
            });
        } catch (error) {
            console.error('❌ Error getting items by category:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get items by category',
                error: error.message
            });
        }
    }

    /**
     * Add new knowledge item
     */
    async addKnowledge(req, res) {
        try {
            const { category, item } = req.body;
            const organizationId = this.getOrganizationId(req);
            const createdBy = req.user?.id || req.user?._id;
            
            if (!category || !item) {
                return res.status(400).json({
                    success: false,
                    message: 'Category and item are required'
                });
            }

            if (!organizationId) {
                return res.status(400).json({
                    success: false,
                    message: 'Organization context required'
                });
            }

            // Validate required item fields
            if (!item.id || !item.title || !item.content) {
                return res.status(400).json({
                    success: false,
                    message: 'Item must have id, title, and content fields'
                });
            }

            const result = await KnowledgeBaseService.addKnowledge(category, item, organizationId, createdBy);
            
            if (result.success) {
                res.json({
                    success: true,
                    message: result.message,
                    item: result.item,
                    storage: result.quotaInfo
                });
            } else {
                // Handle quota/limit errors with appropriate status codes
                const statusCode = result.reason?.includes('limit') || result.reason?.includes('quota') ? 402 : 500;
                res.status(statusCode).json({
                    success: false,
                    reason: result.reason,
                    message: result.message,
                    storage: result.quotaInfo
                });
            }
        } catch (error) {
            console.error('❌ Error adding knowledge:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to add knowledge item',
                error: error.message
            });
        }
    }

    /**
     * Initialize/reload knowledge base
     */
    async initialize(req, res) {
        try {
            const organizationId = this.getOrganizationId(req);
            
            await KnowledgeBaseService.initialize();
            
            // Get organization-specific stats if organizationId available
            let stats = null;
            if (organizationId) {
                stats = await KnowledgeBaseService.getStats(organizationId);
            }
            
            res.json({
                success: true,
                message: 'Knowledge base initialized successfully',
                organizationId: organizationId,
                stats: stats
            });
        } catch (error) {
            console.error('❌ Error initializing KB:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to initialize knowledge base',
                error: error.message
            });
        }
    }

    /**
     * Upload files to knowledge base
     */
    async uploadFiles(req, res) {
        try {
            const { category } = req.body;
            
            // Handle both single file and multiple files uploads
            let files = [];
            if (req.files) {
                if (req.files.files) {
                    files = files.concat(req.files.files);
                }
                if (req.files.file) {
                    files = files.concat(req.files.file);
                }
            }

            if (!files || files.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'No files uploaded'
                });
            }

            if (!category) {
                return res.status(400).json({
                    success: false,
                    message: 'Category is required'
                });
            }

            const results = await KnowledgeBaseService.processUploadedFiles(files, category);
            
            res.json({
                success: true,
                message: `Successfully processed ${results.successCount} files`,
                results: results
            });
        } catch (error) {
            console.error('❌ Error uploading files:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to upload files',
                error: error.message
            });
        }
    }

    /**
     * Delete knowledge item
     */
    async deleteKnowledge(req, res) {
        try {
            const { id } = req.params;

            if (!id) {
                return res.status(400).json({
                    success: false,
                    message: 'Knowledge item ID is required'
                });
            }

            const result = await KnowledgeBaseService.deleteKnowledge(id);
            
            if (result.success) {
                res.json({
                    success: true,
                    message: 'Knowledge item deleted successfully'
                });
            } else {
                res.status(404).json({
                    success: false,
                    message: result.message || 'Knowledge item not found'
                });
            }
        } catch (error) {
            console.error('❌ Error deleting knowledge item:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to delete knowledge item',
                error: error.message
            });
        }
    }

    /**
     * Download knowledge base Excel template
     */
    async downloadTemplate(req, res) {
        try {
            const ExcelTemplateService = require('../services/ExcelTemplateService');
            
            // Create template if it doesn't exist
            await ExcelTemplateService.createTemplate();
            
            const templatePath = ExcelTemplateService.getTemplatePath();
            
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', 'attachment; filename="knowledge-base-template.xlsx"');
            
            res.sendFile(templatePath);
        } catch (error) {
            console.error('❌ Error downloading template:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to download template',
                error: error.message
            });
        }
    }

    /**
     * Export category as JSON file
     */
    async exportCategory(req, res) {
        try {
            const { category } = req.params;
            
            if (!category) {
                return res.status(400).json({
                    success: false,
                    message: 'Category parameter is required'
                });
            }

            const items = KnowledgeBaseService.getItemsByCategory(category);
            
            const exportData = {
                category: category,
                exported: new Date().toISOString(),
                count: items.length,
                items: items
            };
            
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Content-Disposition', `attachment; filename="${category}-knowledge-export.json"`);
            
            res.json(exportData);
        } catch (error) {
            console.error('❌ Error exporting category:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to export category',
                error: error.message
            });
        }
    }

    /**
     * Rename category
     */
    async renameCategory(req, res) {
        try {
            const { oldName, newName } = req.body;
            
            if (!oldName || !newName) {
                return res.status(400).json({
                    success: false,
                    message: 'Both oldName and newName are required'
                });
            }

            const result = await KnowledgeBaseService.renameCategory(oldName, newName);
            
            if (result.success) {
                res.json({
                    success: true,
                    message: `Category renamed from "${oldName}" to "${newName}"`,
                    movedItems: result.movedItems
                });
            } else {
                res.status(400).json({
                    success: false,
                    message: result.message || 'Failed to rename category'
                });
            }
        } catch (error) {
            console.error('❌ Error renaming category:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to rename category',
                error: error.message
            });
        }
    }
}

module.exports = new KnowledgeBaseController();