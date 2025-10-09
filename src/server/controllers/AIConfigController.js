const OpenAIService = require('../services/OpenAIService');
const DepartmentRouter = require('../services/DepartmentRouter');

class AIConfigController {
    /**
     * Configure OpenAI API settings
     */
    async configureOpenAI(req, res) {
        try {
            const { apiKey, organizationId } = req.body;
            
            if (!apiKey) {
                return res.status(400).json({
                    success: false,
                    message: 'API key is required'
                });
            }

            const success = OpenAIService.configure(apiKey, organizationId);
            
            if (success) {
                res.json({
                    success: true,
                    message: 'OpenAI configured successfully',
                    status: OpenAIService.getStatus()
                });
            } else {
                res.status(400).json({
                    success: false,
                    message: 'Failed to configure OpenAI'
                });
            }
        } catch (error) {
            console.error('Error configuring OpenAI:', error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    /**
     * Get current OpenAI configuration status
     */
    async getOpenAIStatus(req, res) {
        try {
            const status = OpenAIService.getStatus();
            res.json({
                success: true,
                status: status
            });
        } catch (error) {
            console.error('Error getting OpenAI status:', error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    /**
     * Test OpenAI connection
     */
    async testOpenAI(req, res) {
        try {
            if (!OpenAIService.isReady()) {
                return res.status(400).json({
                    success: false,
                    message: 'OpenAI not configured'
                });
            }

            const testResponse = await OpenAIService.getChatResponse(
                "Say hello and confirm you're working properly.",
                'general',
                [],
                { maxTokens: 50, temperature: 0.3 }
            );

            res.json({
                success: true,
                message: 'OpenAI connection successful',
                testResponse: testResponse.message,
                usage: testResponse.usage
            });
        } catch (error) {
            console.error('Error testing OpenAI:', error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    /**
     * Clear OpenAI configuration
     */
    async clearOpenAI(req, res) {
        try {
            OpenAIService.clearConfiguration();
            res.json({
                success: true,
                message: 'OpenAI configuration cleared'
            });
        } catch (error) {
            console.error('Error clearing OpenAI:', error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    /**
     * Get department configuration
     */
    async getDepartments(req, res) {
        try {
            const departments = DepartmentRouter.getAllDepartments();
            const overview = DepartmentRouter.getOrganizationOverview();
            
            res.json({
                success: true,
                departments: departments,
                overview: overview
            });
        } catch (error) {
            console.error('Error getting departments:', error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    /**
     * Update department configuration
     */
    async updateDepartment(req, res) {
        try {
            const { departmentId } = req.params;
            const config = req.body;
            
            DepartmentRouter.addDepartment(departmentId, config);
            
            res.json({
                success: true,
                message: `Department ${departmentId} updated successfully`,
                department: DepartmentRouter.getDepartment(departmentId)
            });
        } catch (error) {
            console.error('Error updating department:', error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    /**
     * Get department statistics
     */
    async getDepartmentStats(req, res) {
        try {
            const { departmentId } = req.params;
            
            if (departmentId === 'all') {
                const overview = DepartmentRouter.getOrganizationOverview();
                res.json({
                    success: true,
                    overview: overview
                });
            } else {
                const stats = DepartmentRouter.getDepartmentStats(departmentId);
                if (!stats) {
                    return res.status(404).json({
                        success: false,
                        message: 'Department not found'
                    });
                }
                
                res.json({
                    success: true,
                    stats: stats
                });
            }
        } catch (error) {
            console.error('Error getting department stats:', error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    /**
     * Generate AI chat response
     */
    async getChatResponse(req, res) {
        try {
            const { message, department = 'general' } = req.body;
            
            console.log('🔵 AI Chat API endpoint called:');
            console.log('  📝 Message:', message);
            console.log('  🏢 Department:', department);
            console.log('  👤 User:', req.user?.username || 'anonymous');
            
            if (!message) {
                console.log('❌ No message provided');
                return res.status(400).json({
                    success: false,
                    message: 'Message is required'
                });
            }

            if (!OpenAIService.isReady()) {
                console.log('❌ OpenAI service not ready');
                console.log('  🔧 Status:', OpenAIService.getStatus());
                return res.status(503).json({
                    success: false,
                    message: 'AI service not configured. Please configure OpenAI API key first.'
                });
            }

            console.log('🚀 Calling OpenAI service...');
            const aiResponse = await OpenAIService.getChatResponse(message, department);
            
            console.log('✅ Sending response to client:', aiResponse.message.substring(0, 100) + '...');
            
            res.json({
                success: true,
                response: aiResponse.message,
                department: department,
                usage: aiResponse.usage
            });

        } catch (error) {
            console.error('Error generating AI response:', error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
}

module.exports = new AIConfigController();