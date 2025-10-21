// Agent Dashboard JavaScript
// Comprehensive agent portal with full API integration

console.log('🎯 agent-dashboard.js loaded successfully');

class AgentDashboard {
    constructor() {
        this.authToken = null;
        this.agentInfo = null;
        this.currentTab = null;
        this.agentStatus = 'online';
        this.refreshInterval = null;
        
        console.log('🎯 AgentDashboard constructor called');
        this.init();
    }

    async init() {
        console.log('🎯 Initializing Agent Dashboard...');
        
        try {
            // Check authentication
            await this.authenticate();
            
            // Load agent data
            await this.loadAgentInfo();
            
            // Initialize UI
            this.initializeUI();
            
            // Setup real-time updates
            this.setupRealTimeUpdates();
            
            console.log('✅ Agent Dashboard initialized successfully');
        } catch (error) {
            console.error('❌ Failed to initialize Agent Dashboard:', error);
            this.showError('Failed to initialize dashboard: ' + error.message);
        }
    }

    async authenticate() {
        // Try to get token from session storage first
        this.authToken = sessionStorage.getItem('agentToken') || localStorage.getItem('agentToken');
        
        if (!this.authToken) {
            // Check for magic token in URL
            const urlParams = new URLSearchParams(window.location.search);
            const magicToken = urlParams.get('token');
            
            if (magicToken) {
                try {
                    const response = await fetch('/api/verify-agent-token', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ token: magicToken })
                    });
                    
                    if (response.ok) {
                        const data = await response.json();
                        this.authToken = data.token;
                        sessionStorage.setItem('agentToken', this.authToken);
                        
                        // Remove token from URL
                        const url = new URL(window.location);
                        url.searchParams.delete('token');
                        window.history.replaceState({}, document.title, url.pathname);
                    }
                } catch (error) {
                    console.error('Magic token verification failed:', error);
                }
            }
        }
        
        if (!this.authToken) {
            this.showLoginRequired();
            throw new Error('Authentication required');
        }
    }

    async loadAgentInfo() {
        try {
            const response = await this.makeAuthenticatedRequest('/api/agent/profile');
            if (response.ok) {
                this.agentInfo = await response.json();
                console.log('Agent info loaded:', this.agentInfo);
            } else {
                throw new Error('Failed to load agent profile');
            }
        } catch (error) {
            console.error('Failed to load agent info:', error);
            // Use demo data
            this.agentInfo = {
                name: 'Demo Agent',
                email: 'agent@demo.com',
                department: 'General Support',
                role: 'agent'
            };
        }
    }

    initializeUI() {
        // Update agent name
        const agentNameEl = document.getElementById('agentName');
        if (agentNameEl) {
            agentNameEl.textContent = this.agentInfo.name || 'Demo Agent';
        }

        // Load initial data for all tabs
        this.loadDashboardData();
        this.loadChatQueue();
        this.loadActiveChats();
        this.loadKnowledgeBase();
        this.loadPerformanceData();
        this.loadQuickResponses();
        
        // Setup event listeners
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Knowledge base search
        const kbSearch = document.getElementById('kbSearch');
        if (kbSearch) {
            kbSearch.addEventListener('input', (e) => {
                this.searchKnowledgeBase(e.target.value);
            });
        }

        // Auto-refresh every 30 seconds
        this.refreshInterval = setInterval(() => {
            this.refreshData();
        }, 30000);
    }

    setupRealTimeUpdates() {
        // Setup Socket.IO connection for real-time updates
        if (typeof io !== 'undefined') {
            this.socket = io();
            
            this.socket.on('queue-update', (data) => {
                this.updateQueueDisplay(data);
            });
            
            this.socket.on('chat-assigned', (data) => {
                this.handleChatAssignment(data);
            });
            
            this.socket.on('chat-ended', (data) => {
                this.handleChatEnd(data);
            });
        }
    }

    async refreshData() {
        if (this.currentTab === 'dashboard') {
            this.loadDashboardData();
        } else if (this.currentTab === 'queue') {
            this.loadChatQueue();
        } else if (this.currentTab === 'active-chats') {
            this.loadActiveChats();
        } else if (this.currentTab === 'performance') {
            this.loadPerformanceData();
        }
    }

    async loadDashboardData() {
        try {
            const response = await this.makeAuthenticatedRequest('/api/agent/dashboard');
            if (response.ok) {
                const data = await response.json();
                this.updateDashboardStats(data);
            }
        } catch (error) {
            console.error('Failed to load dashboard data:', error);
            this.showDemoDashboardData();
        }
    }

    updateDashboardStats(data) {
        const elements = {
            chatsToday: document.getElementById('chatsToday'),
            avgResponseTime: document.getElementById('avgResponseTime'),
            customerRating: document.getElementById('customerRating'),
            resolvedChats: document.getElementById('resolvedChats'),
            queueLength: document.getElementById('queueLength'),
            activeChatsCount: document.getElementById('activeChatsCount'),
            waitingTime: document.getElementById('waitingTime'),
            resolutionRate: document.getElementById('resolutionRate')
        };

        if (elements.chatsToday) elements.chatsToday.textContent = data.chatsToday || 0;
        if (elements.avgResponseTime) elements.avgResponseTime.textContent = `${data.avgResponseTime || 0}s`;
        if (elements.customerRating) elements.customerRating.textContent = data.customerRating || '0.0';
        if (elements.resolvedChats) elements.resolvedChats.textContent = data.resolvedChats || 0;
        if (elements.queueLength) elements.queueLength.textContent = data.queueLength || 0;
        if (elements.activeChatsCount) elements.activeChatsCount.textContent = data.activeChats || 0;
        if (elements.waitingTime) elements.waitingTime.textContent = `${data.avgWaitTime || 0}m`;
        if (elements.resolutionRate) elements.resolutionRate.textContent = `${data.resolutionRate || 0}%`;
    }

    async loadChatQueue() {
        try {
            const response = await this.makeAuthenticatedRequest('/api/agent/queue');
            if (response.ok) {
                const data = await response.json();
                this.updateQueueDisplay(data.queue);
            }
        } catch (error) {
            console.error('Failed to load chat queue:', error);
            this.showDemoQueueData();
        }
    }

    updateQueueDisplay(queueData) {
        const queueContainer = document.getElementById('chatQueue');
        if (!queueContainer) return;

        if (!queueData || queueData.length === 0) {
            queueContainer.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #6c757d;">
                    <i class="fas fa-inbox" style="font-size: 3em; margin-bottom: 15px;"></i>
                    <p>No chats in queue</p>
                </div>
            `;
            return;
        }

        queueContainer.innerHTML = queueData.map(chat => `
            <div class="queue-item">
                <div class="customer-info">
                    <div class="customer-avatar">
                        ${chat.customerName ? chat.customerName.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <div class="chat-details">
                        <strong>${chat.customerName || 'Anonymous User'}</strong>
                        <div>${chat.message || 'New chat request'}</div>
                        <small>Waiting: ${chat.waitTime || '0m'}</small>
                    </div>
                </div>
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span class="chat-priority priority-${chat.priority || 'normal'}">
                        ${(chat.priority || 'normal').toUpperCase()}
                    </span>
                    <button class="btn btn-success" onclick="window.agentDash.acceptChat('${chat.id}')">
                        <i class="fas fa-phone"></i> Accept
                    </button>
                </div>
            </div>
        `).join('');
    }

    async loadActiveChats() {
        try {
            const response = await this.makeAuthenticatedRequest('/api/agent/active-chats');
            if (response.ok) {
                const data = await response.json();
                this.updateActiveChatsDisplay(data.chats);
            }
        } catch (error) {
            console.error('Failed to load active chats:', error);
            this.showDemoActiveChatsData();
        }
    }

    updateActiveChatsDisplay(chatsData) {
        const chatsContainer = document.getElementById('activeChats');
        if (!chatsContainer) return;

        if (!chatsData || chatsData.length === 0) {
            chatsContainer.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #6c757d;">
                    <i class="fas fa-comments" style="font-size: 3em; margin-bottom: 15px;"></i>
                    <p>No active chats</p>
                </div>
            `;
            return;
        }

        chatsContainer.innerHTML = chatsData.map(chat => `
            <div class="queue-item">
                <div class="customer-info">
                    <div class="customer-avatar">
                        ${chat.customerName ? chat.customerName.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <div class="chat-details">
                        <strong>${chat.customerName || 'Anonymous User'}</strong>
                        <div>Department: ${chat.department || 'General'}</div>
                        <small>Duration: ${chat.duration || '0m'}</small>
                    </div>
                </div>
                <div style="display: flex; align-items: center; gap: 10px;">
                    <button class="btn" onclick="window.agentDash.openChat('${chat.id}')">
                        <i class="fas fa-external-link-alt"></i> Open
                    </button>
                    <button class="btn btn-warning" onclick="window.agentDash.transferChat('${chat.id}')">
                        <i class="fas fa-exchange-alt"></i> Transfer
                    </button>
                    <button class="btn btn-danger" onclick="window.agentDash.endChat('${chat.id}')">
                        <i class="fas fa-phone-slash"></i> End
                    </button>
                </div>
            </div>
        `).join('');
    }

    async loadKnowledgeBase() {
        try {
            const response = await this.makeAuthenticatedRequest('/api/knowledge-base/articles');
            if (response.ok) {
                const data = await response.json();
                this.updateKnowledgeBaseDisplay(data.articles);
            }
        } catch (error) {
            console.error('Failed to load knowledge base:', error);
            this.showDemoKnowledgeBaseData();
        }
    }

    updateKnowledgeBaseDisplay(articles) {
        const kbContainer = document.getElementById('kbArticles');
        if (!kbContainer) return;

        if (!articles || articles.length === 0) {
            kbContainer.innerHTML = '<p>No articles found.</p>';
            return;
        }

        kbContainer.innerHTML = articles.map(article => `
            <div class="kb-article" onclick="window.agentDash.openArticle('${article.id}')">
                <h5>${article.title}</h5>
                <p>${article.summary || article.content?.substring(0, 100) + '...'}</p>
                <small>Category: ${article.category || 'General'}</small>
            </div>
        `).join('');
    }

    async searchKnowledgeBase(query) {
        if (!query || query.length < 2) {
            this.loadKnowledgeBase();
            return;
        }

        try {
            const response = await this.makeAuthenticatedRequest(`/api/knowledge-base/search?q=${encodeURIComponent(query)}`);
            if (response.ok) {
                const data = await response.json();
                this.updateKnowledgeBaseDisplay(data.articles);
            }
        } catch (error) {
            console.error('Search failed:', error);
        }
    }

    async loadPerformanceData() {
        try {
            const response = await this.makeAuthenticatedRequest('/api/agent/performance');
            if (response.ok) {
                const data = await response.json();
                this.updatePerformanceDisplay(data);
            }
        } catch (error) {
            console.error('Failed to load performance data:', error);
            this.showDemoPerformanceData();
        }
    }

    updatePerformanceDisplay(data) {
        const elements = {
            weeklyChats: document.getElementById('weeklyChats'),
            monthlyChats: document.getElementById('monthlyChats'),
            avgSatisfaction: document.getElementById('avgSatisfaction'),
            responseTimeWeek: document.getElementById('responseTimeWeek')
        };

        if (elements.weeklyChats) elements.weeklyChats.textContent = data.weeklyChats || 0;
        if (elements.monthlyChats) elements.monthlyChats.textContent = data.monthlyChats || 0;
        if (elements.avgSatisfaction) elements.avgSatisfaction.textContent = data.avgSatisfaction || '0.0';
        if (elements.responseTimeWeek) elements.responseTimeWeek.textContent = `${data.avgResponseTime || 0}s`;
    }

    async loadQuickResponses() {
        try {
            const response = await this.makeAuthenticatedRequest('/api/agent/quick-responses');
            if (response.ok) {
                const data = await response.json();
                this.updateQuickResponsesDisplay(data.responses);
            }
        } catch (error) {
            console.error('Failed to load quick responses:', error);
            this.showDemoQuickResponses();
        }
    }

    updateQuickResponsesDisplay(responses) {
        const responsesContainer = document.getElementById('quickResponsesGrid');
        if (!responsesContainer) return;

        if (!responses || responses.length === 0) {
            responses = this.getDefaultQuickResponses();
        }

        responsesContainer.innerHTML = responses.map(response => `
            <div class="response-card" onclick="window.agentDash.useQuickResponse('${response.id}')">
                <h5>${response.title}</h5>
                <p>${response.content}</p>
                <small>Category: ${response.category || 'General'}</small>
            </div>
        `).join('');
    }

    getDefaultQuickResponses() {
        return [
            {
                id: 'greeting',
                title: 'Greeting',
                content: 'Hello! Welcome to our support chat. How can I help you today?',
                category: 'Greetings'
            },
            {
                id: 'thanks',
                title: 'Thank You',
                content: 'Thank you for contacting us. Is there anything else I can help you with?',
                category: 'Closing'
            },
            {
                id: 'hold',
                title: 'Please Hold',
                content: 'Thank you for your patience. I\'m looking into this for you right now.',
                category: 'Waiting'
            },
            {
                id: 'transfer',
                title: 'Transfer Notice',
                content: 'I\'m going to transfer you to a specialist who can better assist you with this request.',
                category: 'Transfer'
            }
        ];
    }

    // Agent Actions
    async acceptChat(chatId) {
        try {
            const response = await this.makeAuthenticatedRequest(`/api/agent/accept-chat/${chatId}`, {
                method: 'POST'
            });

            if (response.ok) {
                this.showSuccess('Chat accepted successfully!');
                this.loadChatQueue();
                this.loadActiveChats();
                // Open chat window
                window.open(`/chat-window?chatId=${chatId}`, '_blank', 'width=400,height=600');
            } else {
                throw new Error('Failed to accept chat');
            }
        } catch (error) {
            this.showError('Failed to accept chat: ' + error.message);
        }
    }

    async openChat(chatId) {
        // Open chat in new window
        window.open(`/chat-window?chatId=${chatId}`, '_blank', 'width=400,height=600');
    }

    async transferChat(chatId) {
        const department = prompt('Enter department to transfer to:');
        if (!department) return;

        try {
            const response = await this.makeAuthenticatedRequest(`/api/agent/transfer-chat/${chatId}`, {
                method: 'POST',
                body: JSON.stringify({ department })
            });

            if (response.ok) {
                this.showSuccess('Chat transferred successfully!');
                this.loadActiveChats();
            } else {
                throw new Error('Failed to transfer chat');
            }
        } catch (error) {
            this.showError('Failed to transfer chat: ' + error.message);
        }
    }

    async endChat(chatId) {
        if (!confirm('Are you sure you want to end this chat?')) return;

        try {
            const response = await this.makeAuthenticatedRequest(`/api/agent/end-chat/${chatId}`, {
                method: 'POST'
            });

            if (response.ok) {
                this.showSuccess('Chat ended successfully!');
                this.loadActiveChats();
                this.loadDashboardData();
            } else {
                throw new Error('Failed to end chat');
            }
        } catch (error) {
            this.showError('Failed to end chat: ' + error.message);
        }
    }

    async toggleStatus() {
        const newStatus = this.agentStatus === 'online' ? 'offline' : 'online';
        
        try {
            const response = await this.makeAuthenticatedRequest('/api/agent/status', {
                method: 'POST',
                body: JSON.stringify({ status: newStatus })
            });

            if (response.ok) {
                this.agentStatus = newStatus;
                this.updateStatusDisplay();
                this.showSuccess(`Status changed to ${newStatus}`);
            } else {
                throw new Error('Failed to update status');
            }
        } catch (error) {
            this.showError('Failed to update status: ' + error.message);
        }
    }

    updateStatusDisplay() {
        const statusEl = document.getElementById('agentStatus');
        const statusTextEl = document.getElementById('statusText');
        
        if (statusEl) {
            statusEl.className = `status-indicator status-${this.agentStatus}`;
        }
        
        if (statusTextEl) {
            statusTextEl.textContent = this.agentStatus.charAt(0).toUpperCase() + this.agentStatus.slice(1);
        }
    }

    openArticle(articleId) {
        window.open(`/knowledge-base/article/${articleId}`, '_blank');
    }

    useQuickResponse(responseId) {
        // Copy response to clipboard
        const responses = this.getDefaultQuickResponses();
        const response = responses.find(r => r.id === responseId);
        
        if (response) {
            navigator.clipboard.writeText(response.content).then(() => {
                this.showSuccess('Response copied to clipboard!');
            });
        }
    }

    // Utility Methods
    async makeAuthenticatedRequest(url, options = {}) {
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                ...(this.authToken && { 'Authorization': `Bearer ${this.authToken}` })
            }
        };

        return fetch(url, { ...defaultOptions, ...options });
    }

    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    showNotification(message, type = 'info') {
        let notification = document.getElementById('agent-notification');
        if (!notification) {
            notification = document.createElement('div');
            notification.id = 'agent-notification';
            document.body.appendChild(notification);
        }
        
        notification.className = `notification ${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 8px;
            color: white;
            z-index: 10000;
            max-width: 400px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            background: ${type === 'error' ? '#f56565' : type === 'success' ? '#48bb78' : '#4299e1'};
        `;
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 5000);
    }

    showLoginRequired() {
        document.body.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; min-height: 100vh; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                <div style="background: white; padding: 40px; border-radius: 15px; text-align: center; max-width: 400px; box-shadow: 0 8px 32px rgba(0,0,0,0.1);">
                    <h2>Authentication Required</h2>
                    <p>Please login to access the agent dashboard.</p>
                    <button onclick="window.location.href='/'" style="background: #4299e1; color: white; border: none; padding: 12px 24px; border-radius: 8px; margin-top: 20px; cursor: pointer;">
                        Go to Login
                    </button>
                </div>
            </div>
        `;
    }

    // Demo Data Methods
    showDemoDashboardData() {
        const demoData = {
            chatsToday: 12,
            avgResponseTime: 45,
            customerRating: '4.8',
            resolvedChats: 10,
            queueLength: 3,
            activeChats: 2,
            avgWaitTime: 2,
            resolutionRate: 95
        };
        this.updateDashboardStats(demoData);
    }

    showDemoQueueData() {
        const demoQueue = [
            {
                id: 'demo1',
                customerName: 'John Smith',
                message: 'I need help with my account',
                waitTime: '2m',
                priority: 'normal'
            },
            {
                id: 'demo2',
                customerName: 'Sarah Johnson',
                message: 'Billing question',
                waitTime: '5m',
                priority: 'high'
            }
        ];
        this.updateQueueDisplay(demoQueue);
    }

    showDemoActiveChatsData() {
        const demoChats = [
            {
                id: 'active1',
                customerName: 'Mike Wilson',
                department: 'Technical Support',
                duration: '8m'
            }
        ];
        this.updateActiveChatsDisplay(demoChats);
    }

    showDemoKnowledgeBaseData() {
        const demoArticles = [
            {
                id: 'kb1',
                title: 'Password Reset Procedure',
                summary: 'How to help customers reset their passwords',
                category: 'Account Management'
            },
            {
                id: 'kb2',
                title: 'Billing Inquiries',
                summary: 'Common billing questions and solutions',
                category: 'Billing'
            },
            {
                id: 'kb3',
                title: 'Technical Troubleshooting',
                summary: 'Basic technical issue resolution steps',
                category: 'Technical'
            }
        ];
        this.updateKnowledgeBaseDisplay(demoArticles);
    }

    showDemoPerformanceData() {
        const demoPerformance = {
            weeklyChats: 67,
            monthlyChats: 289,
            avgSatisfaction: '4.7',
            avgResponseTime: 42
        };
        this.updatePerformanceDisplay(demoPerformance);
    }

    showDemoQuickResponses() {
        this.updateQuickResponsesDisplay(this.getDefaultQuickResponses());
    }
}

// Global function for tab switching
window.showTab = function(tabName) {
    // Remove active class from all tabs and content
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    // Add active class to selected tab and content
    const selectedTab = document.querySelector(`[onclick="showTab('${tabName}')"]`);
    const selectedContent = document.getElementById(tabName);
    
    if (selectedTab) selectedTab.classList.add('active');
    if (selectedContent) selectedContent.classList.add('active');
    
    // Update current tab
    if (window.agentDash) {
        window.agentDash.currentTab = tabName;
        window.agentDash.refreshData();
    }
};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('🎯 DOM Content Loaded - Initializing Agent Dashboard');
    
    try {
        window.agentDash = new AgentDashboard();
        console.log('✅ Agent Dashboard instance created successfully');
    } catch (error) {
        console.error('❌ Failed to create Agent Dashboard:', error);
    }
});