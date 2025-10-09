class DepartmentRouter {
    constructor() {
        this.departments = new Map();
        this.setupDefaultDepartments();
        this.routingRules = new Map();
        this.setupDefaultRouting();
    }

    /**
     * Setup default department structure
     */
    setupDefaultDepartments() {
        // Main organization: Lightwave - The central hub
        this.departments.set('lightwave', {
            name: 'Lightwave',
            type: 'organization',
            path: '/lightwave',
            description: 'Main organization - All chats start here',
            children: ['general', 'sales', 'technical', 'support', 'billing'],
            aiEnabled: true,
            centralHub: true, // This is the main entry point
            agents: [], // General agents who can handle any department
            queue: [] // All chats initially go here
        });

        // General chat - Main entry point for all customers
        this.departments.set('general', {
            name: 'General Chat',
            type: 'department',
            path: '/lightwave/general',
            parent: 'lightwave',
            description: 'Main chat entry point - routes to specialized departments',
            aiEnabled: true,
            isMainEntry: true, // All chats start here
            agents: [], // General agents
            queue: [],
            aiPersonality: 'general_router' // Special AI for routing
        });

        // Specialized departments - customers get routed here from general
        this.departments.set('sales', {
            name: 'Sales Department',
            type: 'department',
            path: '/lightwave/sales',
            parent: 'lightwave',
            description: 'Product sales, pricing, and quotes',
            aiEnabled: true,
            specialization: 'sales',
            agents: [],
            queue: [],
            aiPersonality: 'sales_specialist'
        });

        this.departments.set('technical', {
            name: 'Technical Support',
            type: 'department',
            path: '/lightwave/technical',
            parent: 'lightwave',
            description: 'Technical support and troubleshooting',
            aiEnabled: true,
            specialization: 'technical',
            agents: [],
            queue: [],
            aiPersonality: 'technical_specialist'
        });

        this.departments.set('support', {
            name: 'Customer Support',
            type: 'department',
            path: '/lightwave/support',
            parent: 'lightwave',
            description: 'General customer support',
            aiEnabled: true,
            specialization: 'support',
            agents: [],
            queue: [],
            aiPersonality: 'support_specialist'
        });

        this.departments.set('billing', {
            name: 'Billing Department',
            type: 'department',
            path: '/lightwave/billing',
            parent: 'lightwave',
            description: 'Billing and payment support',
            aiEnabled: true,
            specialization: 'billing',
            agents: [],
            queue: [],
            aiPersonality: 'billing_specialist'
        });
    }

    /**
     * Setup default routing rules
     */
    setupDefaultRouting() {
        // Keyword-based routing
        this.routingRules.set('sales', {
            keywords: ['buy', 'purchase', 'price', 'cost', 'quote', 'product', 'demo', 'trial', 'pricing', 'payment plan'],
            department: 'sales',
            priority: 0.8
        });

        this.routingRules.set('technical', {
            keywords: ['bug', 'error', 'issue', 'problem', 'not working', 'broken', 'technical', 'support', 'help', 'troubleshoot'],
            department: 'technical',
            priority: 0.9
        });

        this.routingRules.set('billing', {
            keywords: ['bill', 'invoice', 'payment', 'refund', 'subscription', 'charge', 'account', 'billing'],
            department: 'billing',
            priority: 0.85
        });

        this.routingRules.set('general', {
            keywords: ['hello', 'hi', 'information', 'general', 'question'],
            department: 'general',
            priority: 0.3
        });
    }

    /**
     * Add or update a department
     */
    addDepartment(id, config) {
        this.departments.set(id, {
            name: config.name,
            type: config.type || 'department',
            path: config.path,
            parent: config.parent,
            description: config.description,
            aiEnabled: config.aiEnabled !== false,
            agents: config.agents || [],
            queue: config.queue || [],
            ...config
        });
        
        console.log(`✅ Department added: ${config.name} (${config.path})`);
    }

    /**
     * Get department by ID
     */
    getDepartment(id) {
        return this.departments.get(id);
    }

    /**
     * Get all departments
     */
    getAllDepartments() {
        return Object.fromEntries(this.departments);
    }

    /**
     * Get departments by parent
     */
    getDepartmentsByParent(parentId) {
        return Array.from(this.departments.entries())
            .filter(([_, dept]) => dept.parent === parentId)
            .map(([id, dept]) => ({ id, ...dept }));
    }

    /**
     * Route message to appropriate department
     */
    routeMessage(message, currentDepartment = 'general') {
        const text = message.toLowerCase();
        let bestMatch = { department: 'general', score: 0, reasons: [] };

        // Check routing rules
        for (const [ruleId, rule] of this.routingRules) {
            let score = 0;
            const matchedKeywords = [];

            for (const keyword of rule.keywords) {
                if (text.includes(keyword)) {
                    score += rule.priority;
                    matchedKeywords.push(keyword);
                }
            }

            if (score > bestMatch.score) {
                bestMatch = {
                    department: rule.department,
                    score: score,
                    reasons: [`Matched keywords: ${matchedKeywords.join(', ')}`],
                    confidence: Math.min(score, 1.0)
                };
            }
        }

        // If no strong match and not already in a specific department, suggest routing
        if (bestMatch.score < 0.7 && currentDepartment === 'general') {
            bestMatch.suggestions = this.getSuggestedDepartments();
        }

        console.log(`🎯 Routing analysis for "${message.substring(0, 50)}...":`, bestMatch);
        return bestMatch;
    }

    /**
     * Get suggested departments for user selection
     */
    getSuggestedDepartments() {
        return Array.from(this.departments.entries())
            .filter(([_, dept]) => dept.type === 'department' && dept.parent === 'lightwave')
            .map(([id, dept]) => ({
                id,
                name: dept.name,
                description: dept.description,
                path: dept.path
            }));
    }

    /**
     * Add agent to department
     */
    addAgentToDepartment(departmentId, agentId, agentData) {
        const department = this.departments.get(departmentId);
        if (!department) {
            throw new Error(`Department ${departmentId} not found`);
        }

        if (!department.agents) {
            department.agents = [];
        }

        // Remove agent from other departments first
        this.removeAgentFromAllDepartments(agentId);

        // Add to new department
        department.agents.push({
            id: agentId,
            ...agentData,
            joinedAt: new Date()
        });

        console.log(`👤 Agent ${agentData.name} joined ${department.name}`);
        return true;
    }

    /**
     * Remove agent from department
     */
    removeAgentFromDepartment(departmentId, agentId) {
        const department = this.departments.get(departmentId);
        if (!department || !department.agents) return false;

        department.agents = department.agents.filter(agent => agent.id !== agentId);
        console.log(`👤 Agent ${agentId} left ${department.name}`);
        return true;
    }

    /**
     * Remove agent from all departments
     */
    removeAgentFromAllDepartments(agentId) {
        for (const [_, department] of this.departments) {
            if (department.agents) {
                department.agents = department.agents.filter(agent => agent.id !== agentId);
            }
        }
    }

    /**
     * Get available agents for department
     */
    getAvailableAgents(departmentId) {
        const department = this.departments.get(departmentId);
        if (!department || !department.agents) return [];

        return department.agents.filter(agent => agent.status === 'available');
    }

    /**
     * Add chat to department queue
     */
    addToQueue(departmentId, chatData) {
        const department = this.departments.get(departmentId);
        if (!department) {
            throw new Error(`Department ${departmentId} not found`);
        }

        if (!department.queue) {
            department.queue = [];
        }

        department.queue.push({
            ...chatData,
            queuedAt: new Date(),
            department: departmentId
        });

        console.log(`📋 Chat added to ${department.name} queue. Queue size: ${department.queue.length}`);
        return department.queue.length;
    }

    /**
     * Get next chat from department queue
     */
    getNextFromQueue(departmentId) {
        const department = this.departments.get(departmentId);
        if (!department || !department.queue || department.queue.length === 0) {
            return null;
        }

        return department.queue.shift();
    }

    /**
     * Get department statistics
     */
    getDepartmentStats(departmentId) {
        const department = this.departments.get(departmentId);
        if (!department) return null;

        return {
            name: department.name,
            agentsOnline: department.agents ? department.agents.filter(a => a.status === 'available').length : 0,
            totalAgents: department.agents ? department.agents.length : 0,
            queueSize: department.queue ? department.queue.length : 0,
            aiEnabled: department.aiEnabled
        };
    }

    /**
     * Get organizational overview
     */
    getOrganizationOverview() {
        const overview = {
            organization: this.departments.get('lightwave'),
            departments: {},
            totalAgents: 0,
            totalQueue: 0
        };

        for (const [id, dept] of this.departments) {
            if (dept.type === 'department') {
                const stats = this.getDepartmentStats(id);
                overview.departments[id] = stats;
                overview.totalAgents += stats.totalAgents;
                overview.totalQueue += stats.queueSize;
            }
        }

        return overview;
    }
}

module.exports = new DepartmentRouter();