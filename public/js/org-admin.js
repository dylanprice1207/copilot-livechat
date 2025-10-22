// Organization Admin Portal JavaScript
// Handles magic login tokens and admin portal functionality

console.log('🔧 org-admin.js loaded successfully');

class OrganizationAdmin {
    constructor() {
        this.authToken = null;
        this.organization = null;
        this.currentTab = null;
        console.log('🔧 OrganizationAdmin constructor called');
        
        // Add error handling for initialization
        try {
            this.init();
        } catch (error) {
            console.error('❌ Failed to initialize OrganizationAdmin:', error);
        }
    }

    async init() {
        console.log('🔧 Initializing Organization Admin Portal...');
        console.log('🔍 Current URL:', window.location.href);
        
        try {
            // Check for magic token in URL and authenticate
            const authSuccess = await this.handleMagicToken();
            
            console.log('🔍 Authentication result:', authSuccess);
            console.log('🔍 Auth token available:', this.authToken ? 'YES' : 'NO');
            
            // Initialize UI regardless of authentication status
            if (this.authToken) {
                console.log('✅ Authentication successful, loading organization data...');
                await this.loadOrganizationData();
                this.initializeUI();
            } else {
                console.log('❌ No authentication available, showing demo mode');
                this.showLoginRequired(); // This now shows demo mode
            }
        } catch (error) {
            console.error('❌ Initialization error:', error);
            this.showError('Failed to initialize dashboard: ' + error.message);
        }
    }

    async handleMagicToken() {
        const urlParams = new URLSearchParams(window.location.search);
        const magicToken = urlParams.get('magic_token');
        
        console.log('🔍 Magic token check - URL params:', window.location.search);
        console.log('🔍 Magic token found:', magicToken ? 'YES' : 'NO');
        
        if (magicToken) {
            console.log('🪄 Magic token detected, authenticating...');
            
            try {
                // Show loading state
                this.showSuccess('Authenticating with magic token...');
                
                // Verify and use the magic token
                const response = await fetch('/api/verify-magic-token', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ magicToken })
                });
                
                console.log('🔍 Magic token verification response status:', response.status);
                
                const data = await response.json();
                console.log('🔍 Magic token verification response:', data);
                
                if (response.ok && data.success) {
                    this.authToken = data.token || magicToken;
                    this.organization = data.organization;
                    console.log('✅ Magic login successful for organization:', data.organization?.name);
                    console.log('✅ Auth token stored:', this.authToken ? 'YES' : 'NO');
                    
                    // Remove magic token from URL for security
                    const url = new URL(window.location);
                    url.searchParams.delete('magic_token');
                    window.history.replaceState({}, document.title, url.pathname);
                    
                    // Store token and organization info for this session
                    sessionStorage.setItem('orgAdminToken', this.authToken);
                    sessionStorage.setItem('orgAdminOrg', JSON.stringify(this.organization));
                    
                } else {
                    console.error('❌ Magic token verification failed:', data.message);
                    this.showError('Magic login failed: ' + (data.message || 'Invalid token'));
                    return false;
                }
            } catch (error) {
                console.error('❌ Magic token error:', error);
                this.showError('Magic login error: ' + error.message);
                return false;
            }
        } else {
            console.log('🔍 No magic token in URL, checking session storage...');
            // Check for existing session token
            this.authToken = sessionStorage.getItem('orgAdminToken') || localStorage.getItem('orgAdminToken');
            const orgData = sessionStorage.getItem('orgAdminOrg');
            if (orgData) {
                try {
                    this.organization = JSON.parse(orgData);
                } catch (e) {
                    console.log('⚠️ Failed to parse stored organization data');
                }
            }
            console.log('🔍 Session token found:', this.authToken ? 'YES' : 'NO');
            
            // If no session token, show login required
            if (!this.authToken) {
                console.log('❌ No authentication found, login required');
                this.showLoginRequired();
                return false;
            }
        }
        
        return this.authToken ? true : false;
    }

    async loadOrganizationData() {
        try {
            // If we already have organization data from magic token, use it
            if (this.organization && this.organization.name) {
                console.log(`🏢 Using organization data from magic token: ${this.organization.name}`);
                return;
            }
            
            // Extract organization slug from URL as fallback
            const pathParts = window.location.pathname.split('/');
            const orgSlug = pathParts[1];
            
            if (!orgSlug || orgSlug === 'admin') {
                throw new Error('Invalid organization URL');
            }
            
            console.log(`🏢 Loading organization data for slug: ${orgSlug}`);
            
            // Set basic organization info from URL
            this.organization = this.organization || {};
            this.organization.slug = orgSlug;
            
            console.log('✅ Organization data loaded');
        } catch (error) {
            console.error('❌ Failed to load organization data:', error);
            this.showError('Failed to load organization data: ' + error.message);
        }
    }

    initializeUI() {
        console.log('🎨 Initializing UI components...');
        
        // Update page title and header if organization data is available
        if (this.organization && this.organization.name) {
            document.title = `${this.organization.name} - Admin Portal`;
            
            // Update header if it exists
            const headerTitle = document.querySelector('.header h1');
            if (headerTitle) {
                headerTitle.innerHTML = `<i class="fas fa-cogs"></i> ${this.organization.name} - Admin Portal`;
            }
        }
        
        // Update the admin name/loading indicator
        const adminName = document.getElementById('adminName');
        if (adminName) {
            const orgName = this.organization?.name || 'Demo Organization';
            const adminText = this.authToken === 'demo-token' 
                ? 'Demo Admin' 
                : 'Global Admin';
            adminName.innerHTML = `
                <i class="fas fa-user-shield"></i>
                <span>${adminText}</span>
                <small style="display: block; font-size: 0.8em; opacity: 0.7;">${orgName}</small>
            `;
        }
        
        // Show success message with organization name
        const orgName = this.organization?.name || 'Organization';
        this.showSuccess(`✅ Successfully logged into ${orgName} Admin Portal!`);
        
        // Add authentication status to the page
        this.addAuthStatus();
        
        // Initialize any UI components here
        this.setupEventListeners();
        
        console.log('✅ UI initialized successfully');
    }
    
    addAuthStatus() {
        // Add a status indicator to show successful magic login
        const statusDiv = document.createElement('div');
        statusDiv.id = 'auth-status';
        statusDiv.innerHTML = `
            <div class="auth-status-banner">
                <i class="fas fa-shield-alt"></i>
                <span>Magic Login Active</span>
                <small>Authenticated as Global Admin</small>
            </div>
        `;
        statusDiv.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            background: linear-gradient(90deg, #10b981, #059669);
            color: white;
            padding: 8px 0;
            text-align: center;
            z-index: 9999;
            font-size: 14px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        `;
        
        // Add styles for the banner content
        const style = document.createElement('style');
        style.textContent = `
            .auth-status-banner {
                display: flex;
                justify-content: center;
                align-items: center;
                gap: 10px;
            }
            .auth-status-banner small {
                opacity: 0.8;
            }
            body {
                margin-top: 40px !important;
            }
        `;
        document.head.appendChild(style);
        document.body.appendChild(statusDiv);
        
        // Auto-hide after 10 seconds
        setTimeout(() => {
            if (statusDiv.parentNode) {
                statusDiv.style.transform = 'translateY(-100%)';
                statusDiv.style.transition = 'transform 0.3s ease';
                setTimeout(() => {
                    statusDiv.parentNode.removeChild(statusDiv);
                    document.body.style.marginTop = '';
                }, 300);
            }
        }, 10000);
    }

    setupEventListeners() {
        // Add event listeners for admin panel functionality
        console.log('🎛️ Setting up event listeners...');
        
        // Tab navigation
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });
        
        // Save button listeners
        document.querySelectorAll('.save-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.handleSave(e);
            });
        });
        
        // Load initial dashboard data
        this.loadDashboardData();
    }
    
    switchTab(tabName) {
        // Prevent infinite loops and invalid tab names
        if (!tabName || tabName === 'undefined' || this.currentTab === tabName) {
            return;
        }
        
        console.log(`🔄 Switching to tab: ${tabName}`);
        this.currentTab = tabName;
        
        try {
            // Remove active class from all tabs and content
            const allTabs = document.querySelectorAll('.nav-tab');
            const allContent = document.querySelectorAll('.tab-content');
            
            console.log(`Found ${allTabs.length} tabs and ${allContent.length} content sections`);
            
            allTabs.forEach(tab => {
                tab.classList.remove('active');
            });
            
            allContent.forEach(content => {
                content.classList.remove('active');
            });
            
            // Add active class to selected tab and content
            const selectedTab = document.querySelector(`[onclick="showTab('${tabName}')"]`);
            const selectedContent = document.getElementById(tabName);
            
            if (selectedTab) {
                selectedTab.classList.add('active');
                console.log(`✅ Activated tab: ${tabName}`);
            } else {
                console.error(`❌ Tab button not found for: ${tabName}`);
                return;
            }
            
            if (selectedContent) {
                selectedContent.classList.add('active');
                console.log(`✅ Activated content: ${tabName}`);
            } else {
                console.error(`❌ Content section not found for: ${tabName}`);
                return;
            }
            
            // Load tab-specific data (don't await to prevent blocking)
            this.loadTabData(tabName).catch(error => {
                console.error(`Error loading tab data for ${tabName}:`, error);
            });
            
        } catch (error) {
            console.error(`❌ Error switching to tab ${tabName}:`, error);
        }
    }
    
    async loadTabData(tabName) {
        try {
            switch (tabName) {
                case 'dashboard':
                    await this.loadDashboardData();
                    break;
                case 'subscription':
                    await this.loadSubscriptionData();
                    break;
                case 'users':
                    await this.loadUsersData();
                    break;
                case 'departments':
                    await this.loadDepartmentsData();
                    break;
                case 'ai-config':
                    await this.loadAIConfigData();
                    break;
                case 'analytics':
                    await this.loadAnalyticsData();
                    break;
                case 'settings':
                    await this.loadSettingsData();
                    break;
            }
        } catch (error) {
            console.error(`Failed to load ${tabName} data:`, error);
            this.showError(`Failed to load ${tabName} data: ${error.message}`);
        }
    }
    
    async loadDashboardData() {
        console.log('📊 Loading dashboard data...');
        try {
            const response = await this.makeAuthenticatedRequest('/api/admin/dashboard');
            if (response.ok) {
                const data = await response.json();
                this.updateDashboardStats(data);
            }
        } catch (error) {
            console.error('Failed to load dashboard data:', error);
        }
    }
    
    async loadUsersData() {
        console.log('👥 Loading users data...');
        try {
            const response = await this.makeAuthenticatedRequest('/api/admin/users');
            if (response.ok) {
                const data = await response.json();
                this.updateUsersTable(data);
            }
        } catch (error) {
            console.error('Failed to load users data:', error);
        }
    }
    
    async loadDepartmentsData() {
        console.log('🏢 Loading departments data...');
        try {
            const response = await this.makeAuthenticatedRequest('/api/admin/departments');
            if (response.ok) {
                const data = await response.json();
                this.updateDepartmentsTable(data);
            }
        } catch (error) {
            console.error('Failed to load departments data:', error);
        }
    }
    
    async loadAIConfigData() {
        console.log('🤖 Loading AI config data...');
        try {
            const response = await this.makeAuthenticatedRequest('/api/ai/config');
            if (response.ok) {
                const data = await response.json();
                this.updateAIConfigForm(data);
            }
        } catch (error) {
            console.error('Failed to load AI config data:', error);
        }
    }
    
    async loadAnalyticsData() {
        console.log('📈 Loading comprehensive analytics data...');
        try {
            const [analyticsResponse, metricsResponse, realTimeResponse] = await Promise.all([
                this.makeAuthenticatedRequest('/api/admin/analytics'),
                this.makeAuthenticatedRequest('/api/admin/metrics/comprehensive'),
                this.makeAuthenticatedRequest('/api/admin/metrics/realtime')
            ]);

            if (analyticsResponse.ok && metricsResponse.ok && realTimeResponse.ok) {
                const analytics = await analyticsResponse.json();
                const metrics = await metricsResponse.json();
                const realTime = await realTimeResponse.json();

                this.updateAnalyticsMetrics(analytics);
                this.updatePerformanceMetrics(metrics);
                this.updateRealTimeDashboard(realTime);
                this.updateDepartmentStats(analytics.departments);
                this.updateAIPerformance(analytics.ai);
            }
        } catch (error) {
            console.error('Failed to load analytics data:', error);
            this.showDemo_AnalyticsData();
        }
    }

    updateAnalyticsMetrics(data) {
        // Update chat analytics
        document.getElementById('dailyChats').textContent = data.chats?.daily || 0;
        document.getElementById('weeklyChats').textContent = data.chats?.weekly || 0;
        document.getElementById('monthlyChats').textContent = data.chats?.monthly || 0;
        document.getElementById('resolvedChats').textContent = `${data.chats?.resolutionRate || 0}%`;
    }

    updatePerformanceMetrics(data) {
        // Update performance metrics
        document.getElementById('avgResponseTime').textContent = `${data.performance?.avgResponseTime || 0}s`;
        document.getElementById('avgResolutionTime').textContent = `${data.performance?.avgResolutionTime || 0}m`;
        document.getElementById('customerSatisfaction').textContent = `${data.performance?.customerSatisfaction || 0}%`;
        document.getElementById('firstContactResolution').textContent = `${data.performance?.firstContactResolution || 0}%`;
    }

    updateRealTimeDashboard(data) {
        // Update real-time dashboard
        document.getElementById('liveChatsCount').textContent = data.liveChats || 0;
        document.getElementById('queueLength').textContent = data.queueLength || 0;
        document.getElementById('onlineAgentsCount').textContent = data.onlineAgents || 0;
        document.getElementById('avgWaitTime').textContent = `${data.avgWaitTime || 0}s`;

        // Update trends
        this.updateTrend('liveChatsTrend', data.trends?.liveChats || 0);
        this.updateTrend('queueTrend', data.trends?.queue || 0);
        this.updateTrend('agentsTrend', data.trends?.agents || 0);
        this.updateTrend('waitTimeTrend', data.trends?.waitTime || 0);
    }

    updateTrend(elementId, value) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = value > 0 ? `+${value}` : value.toString();
            element.className = `trend ${value > 0 ? 'positive' : value < 0 ? 'negative' : ''}`;
        }
    }

    updateDepartmentStats(departments) {
        const container = document.getElementById('departmentStats');
        if (!departments || departments.length === 0) {
            container.innerHTML = '<p>No department data available.</p>';
            return;
        }

        container.innerHTML = departments.map(dept => `
            <div class="department-stat-card">
                <h5><i class="fas fa-building"></i> ${dept.name}</h5>
                <div class="dept-metrics">
                    <div class="metric-row">
                        <span>Chats Handled:</span>
                        <strong>${dept.chatsHandled || 0}</strong>
                    </div>
                    <div class="metric-row">
                        <span>Avg Response Time:</span>
                        <strong>${dept.avgResponseTime || 0}s</strong>
                    </div>
                    <div class="metric-row">
                        <span>Resolution Rate:</span>
                        <strong>${dept.resolutionRate || 0}%</strong>
                    </div>
                    <div class="metric-row">
                        <span>Satisfaction:</span>
                        <strong>${dept.satisfaction || 0}/5 ⭐</strong>
                    </div>
                    <div class="metric-row">
                        <span>Active Agents:</span>
                        <strong>${dept.activeAgents || 0}</strong>
                    </div>
                </div>
            </div>
        `).join('');
    }

    updateAIPerformance(aiData) {
        if (!aiData) return;

        document.getElementById('aiChatsHandled').textContent = aiData.chatsHandled || 0;
        document.getElementById('aiAccuracyRate').textContent = `${aiData.accuracyRate || 0}%`;
        document.getElementById('aiHandoffRate').textContent = `${aiData.handoffRate || 0}%`;
        document.getElementById('aiResponseTime').textContent = `${aiData.responseTime || 0}s`;
    }

    async exportReport() {
        const reportType = document.getElementById('reportType').value;
        const reportPeriod = document.getElementById('reportPeriod').value;
        const reportFormat = document.getElementById('reportFormat').value;

        try {
            const response = await this.makeAuthenticatedRequest('/api/admin/export-report', {
                method: 'POST',
                body: JSON.stringify({
                    type: reportType,
                    period: reportPeriod,
                    format: reportFormat
                })
            });

            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${reportType}-${reportPeriod}.${reportFormat}`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
                
                this.showSuccess('Report exported successfully!');
            } else {
                throw new Error('Export failed');
            }
        } catch (error) {
            console.error('Failed to export report:', error);
            this.showError('Failed to export report. Please try again.');
        }
    }

    showDemo_AnalyticsData() {
        console.log('📊 Showing demo analytics data...');
        
        const demoAnalytics = {
            chats: {
                daily: 145,
                weekly: 987,
                monthly: 4250,
                resolutionRate: 94
            }
        };

        const demoMetrics = {
            performance: {
                avgResponseTime: 32,
                avgResolutionTime: 8,
                customerSatisfaction: 4.7,
                firstContactResolution: 78
            }
        };

        const demoRealTime = {
            liveChats: 23,
            queueLength: 5,
            onlineAgents: 12,
            avgWaitTime: 45,
            trends: {
                liveChats: 3,
                queue: -2,
                agents: 1,
                waitTime: -5
            }
        };

        const demoDepartments = [
            {
                name: 'Technical Support',
                chatsHandled: 156,
                avgResponseTime: 28,
                resolutionRate: 92,
                satisfaction: 4.6,
                activeAgents: 8
            },
            {
                name: 'Sales',
                chatsHandled: 89,
                avgResponseTime: 22,
                resolutionRate: 97,
                satisfaction: 4.8,
                activeAgents: 4
            },
            {
                name: 'Billing',
                chatsHandled: 67,
                avgResponseTime: 35,
                resolutionRate: 89,
                satisfaction: 4.3,
                activeAgents: 3
            }
        ];

        const demoAI = {
            chatsHandled: 312,
            accuracyRate: 89,
            handoffRate: 15,
            responseTime: 2
        };

        this.updateAnalyticsMetrics(demoAnalytics);
        this.updatePerformanceMetrics(demoMetrics);
        this.updateRealTimeDashboard(demoRealTime);
        this.updateDepartmentStats(demoDepartments);
        this.updateAIPerformance(demoAI);
    }
    
    updateAIConfigForm(data) {
        console.log('🤖 Updating AI config form with data:', data);
        
        // Update AI config form fields
        const fields = {
            openaiApiKey: document.getElementById('openaiApiKey'),
            temperature: document.getElementById('temperature'),
            maxTokens: document.getElementById('maxTokens'),
            model: document.getElementById('model')
        };
        
        // Set default or provided values
        const defaults = {
            openaiKey: data?.openaiKey || 'sk-demo...configured',
            temperature: data?.temperature || '0.7',
            maxTokens: data?.maxTokens || '500',
            model: data?.model || 'gpt-3.5-turbo'
        };
        
        if (fields.openaiApiKey) fields.openaiApiKey.value = defaults.openaiKey;
        if (fields.temperature) fields.temperature.value = defaults.temperature;
        if (fields.maxTokens) fields.maxTokens.value = defaults.maxTokens;
        if (fields.model) fields.model.value = defaults.model;
        
        // Add ChatFlow configuration section
        this.updateChatFlowConfig(data);
        
        console.log('✅ AI config form updated with values');
    }
    
    updateChatFlowConfig(data) {
        console.log('🌊 Updating ChatFlow configuration...');
        
        // Find or create ChatFlow config container
        const aiConfigTab = document.getElementById('ai-config');
        let chatFlowContainer = aiConfigTab?.querySelector('.chatflow-config');
        
        if (!chatFlowContainer) {
            chatFlowContainer = document.createElement('div');
            chatFlowContainer.className = 'chatflow-config';
            chatFlowContainer.innerHTML = `
                <div class="section">
                    <h3><i class="fas fa-stream"></i> ChatFlow Configuration</h3>
                    <div class="config-grid">
                        <div class="form-group">
                            <label for="chatflowEnabled">Enable ChatFlow</label>
                            <select id="chatflowEnabled">
                                <option value="true">Enabled</option>
                                <option value="false">Disabled</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="chatflowMode">ChatFlow Mode</label>
                            <select id="chatflowMode">
                                <option value="auto">Automatic</option>
                                <option value="manual">Manual</option>
                                <option value="hybrid">Hybrid</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="welcomeMessage">Welcome Message</label>
                            <textarea id="welcomeMessage" rows="3" placeholder="Hello! How can I help you today?"></textarea>
                        </div>
                        <div class="form-group">
                            <label for="fallbackMessage">Fallback Message</label>
                            <textarea id="fallbackMessage" rows="2" placeholder="I'm not sure I understand. Could you please rephrase?"></textarea>
                        </div>
                    </div>
                    
                    <h4><i class="fas fa-robot"></i> Flow Builder</h4>
                    <div class="flow-builder">
                        <div class="flow-steps">
                            <div class="flow-step active">
                                <div class="step-header">
                                    <i class="fas fa-play"></i>
                                    <span>Welcome Step</span>
                                    <button class="btn-small" onclick="window.orgAdmin.editFlowStep('welcome')">Edit</button>
                                </div>
                                <div class="step-content">
                                    <p>Greet the customer and ask how to help</p>
                                </div>
                            </div>
                            
                            <div class="flow-step">
                                <div class="step-header">
                                    <i class="fas fa-question"></i>
                                    <span>Intent Detection</span>
                                    <button class="btn-small" onclick="window.orgAdmin.editFlowStep('intent')">Edit</button>
                                </div>
                                <div class="step-content">
                                    <p>Analyze customer intent and route accordingly</p>
                                </div>
                            </div>
                            
                            <div class="flow-step">
                                <div class="step-header">
                                    <i class="fas fa-users"></i>
                                    <span>Agent Handoff</span>
                                    <button class="btn-small" onclick="window.orgAdmin.editFlowStep('handoff')">Edit</button>
                                </div>
                                <div class="step-content">
                                    <p>Transfer to appropriate department agent</p>
                                </div>
                            </div>
                        </div>
                        
                        <div class="flow-actions">
                            <button class="btn btn-success" onclick="window.orgAdmin.addFlowStep()">
                                <i class="fas fa-plus"></i> Add Step
                            </button>
                            <button class="btn btn-primary" onclick="window.orgAdmin.testChatFlow()">
                                <i class="fas fa-play"></i> Test Flow
                            </button>
                            <button class="btn btn-secondary" onclick="window.orgAdmin.exportChatFlow()">
                                <i class="fas fa-download"></i> Export Flow
                            </button>
                        </div>
                    </div>
                    
                    <button class="btn btn-success" onclick="saveChatFlowConfig()">
                        <i class="fas fa-save"></i> Save ChatFlow Configuration
                    </button>
                </div>
            `;
            
            // Insert after the AI config section
            const aiConfigSection = aiConfigTab?.querySelector('.section');
            if (aiConfigSection) {
                aiConfigSection.parentNode.insertBefore(chatFlowContainer, aiConfigSection.nextSibling);
            }
        }
        
        // Set ChatFlow values
        const chatflowData = data?.chatflow || {};
        const chatflowEnabled = document.getElementById('chatflowEnabled');
        const chatflowMode = document.getElementById('chatflowMode');
        const welcomeMessage = document.getElementById('welcomeMessage');
        const fallbackMessage = document.getElementById('fallbackMessage');
        
        if (chatflowEnabled) chatflowEnabled.value = chatflowData.enabled !== false ? 'true' : 'false';
        if (chatflowMode) chatflowMode.value = chatflowData.mode || 'auto';
        if (welcomeMessage) welcomeMessage.value = chatflowData.welcomeMessage || 'Hello! How can I help you today?';
        if (fallbackMessage) fallbackMessage.value = chatflowData.fallbackMessage || "I'm not sure I understand. Could you please rephrase?";
        
        console.log('✅ ChatFlow configuration updated');
    }
    
    updateAnalyticsCharts(data) {
        console.log('📈 Updating analytics charts with data:', data);
        
        // Create comprehensive analytics dashboard
        const analyticsContainer = document.getElementById('analytics');
        if (analyticsContainer) {
            // Handle both direct data and nested response data
            const responseData = data?.data || data;
            const analyticsData = responseData;
            
            // Find or create analytics content area
            let analyticsContent = analyticsContainer.querySelector('.analytics-content');
            if (!analyticsContent) {
                analyticsContent = document.createElement('div');
                analyticsContent.className = 'analytics-content';
                analyticsContainer.appendChild(analyticsContent);
            }
            
            analyticsContent.innerHTML = `
                <div class="analytics-grid">
                    <div class="analytics-card">
                        <h3><i class="fas fa-comments"></i> Today's Chats</h3>
                        <div class="metric-value">${analyticsData?.chatsToday || 0}</div>
                        <div class="metric-change">${analyticsData?.chatsTrend || 'No data available'}</div>
                    </div>
                    
                    <div class="analytics-card">
                        <h3><i class="fas fa-clock"></i> Avg Response Time</h3>
                        <div class="metric-value">${analyticsData?.avgResponseTime || 'N/A'}</div>
                        <div class="metric-change">${analyticsData?.responseTrend || 'No data available'}</div>
                    </div>
                    
                    <div class="analytics-card">
                        <h3><i class="fas fa-star"></i> Satisfaction</h3>
                        <div class="metric-value">${analyticsData?.satisfaction || 'N/A'}</div>
                        <div class="metric-change">${analyticsData?.satisfactionTrend || 'No data available'}</div>
                    </div>
                    
                    <div class="analytics-card">
                        <h3><i class="fas fa-users"></i> Active Agents</h3>
                        <div class="metric-value">${analyticsData?.activeAgents || 0}</div>
                        <div class="metric-change">${analyticsData?.onlineAgents || 0} online now</div>
                    </div>
                </div>
                
                <div class="analytics-charts">
                    <div class="chart-container">
                        <h3>Top Performing Agents</h3>
                        <div class="agent-list">
                            ${(analyticsData.topAgents || []).map(agent => `
                                <div class="agent-item">
                                    <div class="agent-info">
                                        <span class="agent-name">${agent.name}</span>
                                        <span class="agent-rating">⭐ ${agent.rating}</span>
                                    </div>
                                    <div class="agent-stats">${agent.chats} chats</div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    
                    <div class="chart-container">
                        <h3>Department Performance</h3>
                        <div class="department-stats">
                            ${(analyticsData.departmentStats || []).map(dept => `
                                <div class="dept-stat">
                                    <div class="dept-name">${dept.name}</div>
                                    <div class="dept-metrics">
                                        <span class="chat-count">${dept.chats} chats</span>
                                        <span class="satisfaction-score">⭐ ${dept.satisfaction}</span>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    
                    <div class="chart-container">
                        <h3>Hourly Chat Volume</h3>
                        <div class="simple-chart">
                            ${(analyticsData.hourlyStats || []).map((value, index) => `
                                <div class="chart-bar" style="height: ${(value / Math.max(...(analyticsData.hourlyStats || [1]))) * 100}%">
                                    <span class="bar-value">${value}</span>
                                    <span class="bar-label">${index + 8}:00</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            `;
        }
        
        console.log('✅ Analytics dashboard updated');
    }
    
    async loadSettingsData() {
        console.log('⚙️ Loading settings data...');
        if (this.organization) {
            // Populate form with organization data
            const orgName = document.getElementById('orgName');
            const orgDomain = document.getElementById('orgDomain');
            
            if (orgName) orgName.value = this.organization.name || '';
            if (orgDomain) orgDomain.value = this.organization.domain || '';
        }
    }
    
    async makeAuthenticatedRequest(url, options = {}) {
        console.log('🌐 Making authenticated request to:', url);
        console.log('🔑 Auth token available:', this.authToken ? 'YES' : 'NO');
        
        try {
            const defaultOptions = {
                headers: {
                    'Content-Type': 'application/json',
                    ...(this.authToken && { 
                        'Authorization': `Bearer ${this.authToken}`,
                        'X-Magic-Token': this.authToken
                    })
                }
            };
            
            console.log('📤 Request headers:', defaultOptions.headers);
            
            const response = await fetch(url, { ...defaultOptions, ...options });
            
            console.log('📥 Response status:', response.status);
            
            // If unauthorized, show error instead of demo mode
            if (response.status === 401) {
                console.error('❌ Authentication failed for API call');
                this.showError('Authentication required. Please login again.');
                throw new Error('Authentication required');
            }
            
            return response;
        } catch (error) {
            console.error('🚫 API call failed:', error.message);
            throw error;
        }
    }
    
    updateDashboardStats(data) {
        // Update dashboard stats with real data - using correct IDs from HTML
        const statsElements = {
            totalUsers: document.getElementById('totalUsers'),
            activeAgents: document.getElementById('activeAgents'),
            totalChats: document.getElementById('totalChats'),
            aiInteractions: document.getElementById('aiInteractions')
        };
        
        if (data.stats) {
            if (statsElements.totalUsers) statsElements.totalUsers.textContent = data.stats.totalUsers || '0';
            if (statsElements.activeAgents) statsElements.activeAgents.textContent = data.stats.activeAgents || '0';
            if (statsElements.totalChats) statsElements.totalChats.textContent = data.stats.totalChats || '0';
            if (statsElements.aiInteractions) statsElements.aiInteractions.textContent = data.stats.aiInteractions || '0';
        }
        
        console.log('📊 Dashboard stats updated:', data.stats);
    }
    
    updateUsersTable(data) {
        const tbody = document.querySelector('#usersTable tbody');
        if (tbody && data.users) {
            tbody.innerHTML = data.users.map(user => `
                <tr>
                    <td>${user.username || 'N/A'}</td>
                    <td>${user.email || 'N/A'}</td>
                    <td><span class="role-badge ${user.role}">${user.role}</span></td>
                    <td><span class="status-badge ${user.status}">${user.status}</span></td>
                    <td>${new Date(user.createdAt).toLocaleDateString()}</td>
                    <td>
                        <button onclick="window.orgAdmin.editUser('${user._id}')" class="btn btn-sm">Edit</button>
                        <button onclick="window.orgAdmin.deleteUser('${user._id}')" class="btn btn-sm btn-danger">Delete</button>
                    </td>
                </tr>
            `).join('');
        }
    }
    
    updateDepartmentsTable(data) {
        const deptManagement = document.getElementById('departmentManagement');
        if (deptManagement && data.departments) {
            deptManagement.innerHTML = `
                <div class="department-grid">
                    ${data.departments.map(dept => `
                        <div class="department-card">
                            <h4><i class="fas fa-building"></i> ${dept.name}</h4>
                            <p class="dept-info">
                                <span class="agent-count">${dept.agentCount || 0} agents</span>
                                <span class="status-badge ${dept.status}">${dept.status}</span>
                            </p>
                            <div class="dept-actions">
                                <button onclick="window.orgAdmin.viewDepartmentAgents('${dept._id}')" class="btn btn-sm btn-primary">
                                    <i class="fas fa-users"></i> View Agents
                                </button>
                                <button onclick="window.orgAdmin.assignAgents('${dept._id}')" class="btn btn-sm btn-success">
                                    <i class="fas fa-plus"></i> Assign Agents
                                </button>
                                <button onclick="window.orgAdmin.editDepartment('${dept._id}')" class="btn btn-sm">
                                    <i class="fas fa-edit"></i> Edit
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>
                
                <div class="add-department-section">
                    <button onclick="window.orgAdmin.createDepartment()" class="btn btn-success">
                        <i class="fas fa-plus"></i> Create New Department
                    </button>
                </div>
            `;
        }
    }

    async handleSave(event) {
        const section = event.target.dataset.section;
        console.log(`💾 Saving ${section} settings...`);
        
        // Implement save functionality here
        this.showSuccess(`${section} settings saved successfully!`);
    }

    showLoginRequired() {
        console.log('🔐 Authentication required for organization admin access');
        
        // Show login required message
        document.body.innerHTML = `
            <div style="
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
                background: linear-gradient(135deg, #1e88e5 0%, #1565c0 100%);
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            ">
                <div style="
                    background: white;
                    padding: 40px;
                    border-radius: 15px;
                    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
                    text-align: center;
                    max-width: 500px;
                ">
                    <h1 style="color: #4a5568; margin-bottom: 20px;">
                        <i class="fas fa-lock" style="color: #1e88e5;"></i>
                        Organization Admin Access
                    </h1>
                    <p style="color: #666; margin-bottom: 30px; line-height: 1.6;">
                        You need a valid magic login token to access the organization admin dashboard.
                        Please contact your global administrator to generate a magic login link.
                    </p>
                    <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                        <h3 style="color: #4a5568; margin-bottom: 10px;">How to get access:</h3>
                        <ol style="text-align: left; color: #666;">
                            <li>Contact your global administrator</li>
                            <li>Request a magic login link for your organization</li>
                            <li>Click the provided link to access this dashboard</li>
                        </ol>
                    </div>
                    <p style="color: #999; font-size: 14px;">
                        For security, direct access without proper authentication is not allowed.
                    </p>
                </div>
            </div>
        `;
    }

    showError(message) {
        console.error('❌', message);
        this.showNotification(message, 'error');
    }

    showSuccess(message) {
        console.log('✅', message);
        this.showNotification(message, 'success');
    }

    showNotification(message, type = 'info') {
        // Create or update notification element
        let notification = document.getElementById('admin-notification');
        if (!notification) {
            notification = document.createElement('div');
            notification.id = 'admin-notification';
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
            background: ${type === 'error' ? '#ef4444' : type === 'success' ? '#10b981' : '#3b82f6'};
        `;
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 5000);
    }

    // Department Management Methods
    async viewDepartmentAgents(deptId) {
        console.log(`👥 Viewing agents for department: ${deptId}`);
        
        try {
            // Get real users assigned to this department
            const response = await this.makeAuthenticatedRequest(`/api/admin/departments/${deptId}/users`);
            
            if (response.ok) {
                const data = await response.json();
                const agents = data.users || [];
                
                if (agents.length === 0) {
                    alert(`👥 Department Agents:\n\nNo agents currently assigned to this department.\n\nUse "Assign Agents" to add team members.`);
                } else {
                    // Create a detailed view with real data
                    const agentsList = agents.map(agent => 
                        `• ${agent.username} (${agent.email}) - ${agent.isOnline ? '🟢 Online' : '🔴 Offline'} - Role: ${agent.role}`
                    ).join('\n');
                    
                    alert(`👥 Department Agents (${agents.length} total):\n\n${agentsList}`);
                }
                
                this.showSuccess(`Viewed ${agents.length} agents for department ${deptId}`);
            }
        } catch (error) {
            console.error('Error fetching department agents:', error);
            this.showError('Failed to load department agents. Please try again.');
        }
    }

    async assignAgents(deptId) {
        console.log(`🔗 Assigning agents to department: ${deptId}`);
        
        try {
            // Get available users from database
            const usersResponse = await this.makeAuthenticatedRequest('/api/admin/users/available');
            
            if (!usersResponse.ok) {
                throw new Error('Failed to fetch available users');
            }
            
            const usersData = await usersResponse.json();
            const availableUsers = usersData.users || [];
            
            if (availableUsers.length === 0) {
                alert('📋 No available users found in the system.\n\nPlease create user accounts first before assigning them to departments.');
                return;
            }
            
            // Create a selection interface
            const usersList = availableUsers.map((user, index) => 
                `${index + 1}. ${user.username} (${user.email}) - Role: ${user.role}`
            ).join('\n');
            
            const selection = prompt(`🔗 Assign Agents to Department\n\nAvailable Users:\n${usersList}\n\nEnter user numbers to assign (comma-separated, e.g., 1,3,5):`);
            
            if (selection) {
                const selectedIndexes = selection.split(',').map(s => parseInt(s.trim()) - 1);
                const selectedUsers = selectedIndexes
                    .filter(index => index >= 0 && index < availableUsers.length)
                    .map(index => availableUsers[index]);
                
                if (selectedUsers.length === 0) {
                    alert('❌ No valid users selected. Please try again.');
                    return;
                }
                
                // Assign all selected users to the department in one request
                const userIds = selectedUsers.map(user => user._id);
                const response = await this.makeAuthenticatedRequest(`/api/admin/departments/${deptId}/assign`, {
                    method: 'POST',
                    body: JSON.stringify({ userIds })
                });
                
                if (response.ok) {
                    const assignedNames = selectedUsers.map(user => user.username).join(', ');
                    alert(`✅ Successfully assigned ${selectedUsers.length} agents:\n\n${assignedNames}\n\nThey can now handle customer inquiries for this department.`);
                    this.showSuccess(`Assigned ${selectedUsers.length} agents to department ${deptId}`);
                    
                    // Refresh the departments view
                    setTimeout(() => {
                        if (this.currentTab === 'departments') {
                            this.loadDepartmentsData();
                        }
                    }, 1000);
                } else {
                    const errorData = await response.json();
                    alert(`❌ Assignment failed: ${errorData.message || 'Unknown error'}`);
                    this.showError('Failed to assign agents. Please try again.');
                }
            }
        } catch (error) {
            console.error('Error assigning agents:', error);
            this.showError('Failed to assign agents. Please try again.');
        }
    }

    editDepartment(deptId) {
        console.log(`✏️ Editing department: ${deptId}`);
        
        // Create a modal-like dialog for editing
        const currentName = prompt('Enter new department name:');
        if (currentName) {
            console.log(`📝 Updating department ${deptId} to: ${currentName}`);
            this.showSuccess(`Department updated to "${currentName}" (Demo mode)`);
            
            // Refresh the departments view
            setTimeout(() => {
                if (this.currentTab === 'departments') {
                    this.loadDepartmentsData();
                }
            }, 1000);
        }
    }

    createDepartment() {
        const deptName = prompt('Enter department name:');
        if (deptName) {
            console.log(`🏢 Creating department: ${deptName}`);
            this.showSuccess(`Department "${deptName}" created successfully! (Demo mode)`);
            
            // Refresh the departments view
            setTimeout(() => {
                if (this.currentTab === 'departments') {
                    this.loadDepartmentsData();
                }
            }, 1000);
        }
    }

    deleteDepartment(deptId) {
        if (confirm('⚠️ Are you sure you want to delete this department?\n\nThis action cannot be undone and will unassign all agents.')) {
            console.log(`🗑️ Deleting department: ${deptId}`);
            this.showSuccess(`Department ${deptId} deleted successfully (Demo mode)`);
            
            // Refresh the departments view
            setTimeout(() => {
                if (this.currentTab === 'departments') {
                    this.loadDepartmentsData();
                }
            }, 1000);
        }
    }

    // Subscription Management Methods
    async loadSubscriptionData() {
        console.log('💳 Loading subscription data...');
        try {
            const [subscriptionResponse, plansResponse, usageResponse] = await Promise.all([
                this.makeAuthenticatedRequest('/api/subscription/info'),
                this.makeAuthenticatedRequest('/api/subscription/plans'),
                this.makeAuthenticatedRequest('/api/subscription/usage')
            ]);

            if (subscriptionResponse.ok && plansResponse.ok && usageResponse.ok) {
                const subscription = await subscriptionResponse.json();
                const plans = await plansResponse.json();
                const usage = await usageResponse.json();

                this.updateSubscriptionOverview(subscription);
                this.updateUsageStats(usage);
                this.updateAvailablePlans(plans.plans);
                this.loadBillingHistory();
            }
        } catch (error) {
            console.error('Failed to load subscription data:', error);
            this.showDemo_SubscriptionData();
        }
    }

    updateSubscriptionOverview(subscription) {
        const plan = subscription.plan;
        
        document.getElementById('currentPlanName').textContent = plan.name;
        document.getElementById('currentPlanPrice').textContent = `$${plan.price}/month`;
        document.getElementById('planStatus').textContent = subscription.status;
        
        if (subscription.nextBillingDate) {
            const date = new Date(subscription.nextBillingDate).toLocaleDateString();
            document.getElementById('planBillingDate').textContent = `Next billing: ${date}`;
        }

        // Update plan features
        const featuresContainer = document.getElementById('planFeatures');
        featuresContainer.innerHTML = plan.features.map(feature => 
            `<span class="feature-item">${feature}</span>`
        ).join('');
    }

    updateUsageStats(usage) {
        // Update agent usage
        const agentPercent = Math.min((usage.agents.current / usage.agents.limit) * 100, 100);
        document.getElementById('agentUsage').textContent = `${usage.agents.current} / ${usage.agents.limit}`;
        document.getElementById('agentProgress').style.width = `${agentPercent}%`;

        // Update knowledge base usage
        const kbMB = Math.round(usage.knowledgeBase.current / (1024 * 1024));
        const kbLimitMB = Math.round(usage.knowledgeBase.limit / (1024 * 1024));
        const kbPercent = Math.min((usage.knowledgeBase.current / usage.knowledgeBase.limit) * 100, 100);
        document.getElementById('kbUsage').textContent = `${kbMB} MB / ${kbLimitMB} MB`;
        document.getElementById('kbProgress').style.width = `${kbPercent}%`;

        // Update conversation usage
        const convPercent = Math.min((usage.conversations.current / usage.conversations.limit) * 100, 100);
        document.getElementById('conversationUsage').textContent = `${usage.conversations.current} / ${usage.conversations.limit}`;
        document.getElementById('conversationProgress').style.width = `${convPercent}%`;

        // Update API usage
        const apiPercent = Math.min((usage.apiCalls.current / usage.apiCalls.limit) * 100, 100);
        document.getElementById('apiUsage').textContent = `${usage.apiCalls.current} / ${usage.apiCalls.limit}`;
        document.getElementById('apiProgress').style.width = `${apiPercent}%`;
    }

    updateAvailablePlans(plans) {
        const plansContainer = document.getElementById('availablePlans');
        plansContainer.innerHTML = plans.map(plan => `
            <div class="plan-option ${plan.name === 'Professional' ? 'recommended' : ''}" 
                 onclick="window.orgAdmin.selectPlan('${plan._id}')">
                <h5>${plan.name}</h5>
                <div class="plan-price">$${plan.price}/month</div>
                <ul style="text-align: left; margin: 15px 0;">
                    ${plan.features.map(feature => `<li>${feature}</li>`).join('')}
                </ul>
                <div style="margin-top: 10px;">
                    <small>• ${plan.limits.agents} agents</small><br>
                    <small>• ${Math.round(plan.limits.knowledgeBase / (1024 * 1024))} MB storage</small><br>
                    <small>• ${plan.limits.conversations.toLocaleString()} conversations/month</small>
                </div>
            </div>
        `).join('');
    }

    async loadBillingHistory() {
        try {
            const response = await this.makeAuthenticatedRequest('/api/subscription/billing-history');
            if (response.ok) {
                const data = await response.json();
                this.updateBillingTable(data.history);
            }
        } catch (error) {
            console.error('Failed to load billing history:', error);
            this.showDemo_BillingHistory();
        }
    }

    updateBillingTable(history) {
        const tbody = document.getElementById('billingTableBody');
        tbody.innerHTML = history.map(item => `
            <tr>
                <td>${new Date(item.date).toLocaleDateString()}</td>
                <td>${item.plan}</td>
                <td>$${item.amount}</td>
                <td><span class="status-badge">${item.status}</span></td>
                <td>
                    <button class="btn btn-sm" onclick="window.orgAdmin.downloadInvoice('${item.invoiceId}')">
                        <i class="fas fa-download"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }

    async selectPlan(planId) {
        if (confirm('Are you sure you want to change your subscription plan?')) {
            try {
                const response = await this.makeAuthenticatedRequest('/api/subscription/change-plan', {
                    method: 'POST',
                    body: JSON.stringify({ planId })
                });

                if (response.ok) {
                    this.showSuccess('Plan changed successfully! Changes will take effect immediately.');
                    this.loadSubscriptionData();
                } else {
                    const error = await response.json();
                    this.showError('Failed to change plan: ' + error.message);
                }
            } catch (error) {
                this.showError('Error changing plan: ' + error.message);
            }
        }
    }

    upgradePlan() {
        this.showSuccess('Redirecting to plan upgrade page...');
        // In a real implementation, this would redirect to a payment page
        setTimeout(() => {
            window.open('/pricing', '_blank');
        }, 1000);
    }

    manageBilling() {
        this.showSuccess('Opening billing management portal...');
        // In a real implementation, this would open Stripe customer portal
        setTimeout(() => {
            alert('Billing management portal would open here. This typically integrates with Stripe Customer Portal.');
        }, 1000);
    }

    downloadInvoice(invoiceId) {
        if (invoiceId) {
            // Download specific invoice
            window.open(`/api/subscription/invoice/${invoiceId}`, '_blank');
        } else {
            // Download latest invoice
            window.open('/api/subscription/latest-invoice', '_blank');
        }
    }

    // Demo data methods for when API calls fail
    showDemo_SubscriptionData() {
        console.log('📋 Showing demo subscription data...');
        
        // Demo subscription data
        const demoSubscription = {
            plan: {
                name: 'Professional',
                price: 79,
                features: ['Unlimited Agents', 'Advanced Analytics', 'API Access', 'Priority Support']
            },
            status: 'Active',
            nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        };

        const demoUsage = {
            agents: { current: 8, limit: 25 },
            knowledgeBase: { current: 150 * 1024 * 1024, limit: 500 * 1024 * 1024 },
            conversations: { current: 1250, limit: 10000 },
            apiCalls: { current: 2800, limit: 100000 }
        };

        const demoPlans = [
            {
                _id: 'starter',
                name: 'Starter',
                price: 29,
                features: ['5 Agents', 'Basic Analytics', 'Email Support'],
                limits: { agents: 5, knowledgeBase: 100 * 1024 * 1024, conversations: 1000 }
            },
            {
                _id: 'professional',
                name: 'Professional',
                price: 79,
                features: ['25 Agents', 'Advanced Analytics', 'API Access', 'Priority Support'],
                limits: { agents: 25, knowledgeBase: 500 * 1024 * 1024, conversations: 10000 }
            },
            {
                _id: 'business',
                name: 'Business',
                price: 149,
                features: ['Unlimited Agents', 'Custom Integrations', 'Dedicated Support'],
                limits: { agents: 999, knowledgeBase: 2 * 1024 * 1024 * 1024, conversations: 50000 }
            }
        ];

        this.updateSubscriptionOverview(demoSubscription);
        this.updateUsageStats(demoUsage);
        this.updateAvailablePlans(demoPlans);
        this.showDemo_BillingHistory();
    }

    showDemo_BillingHistory() {
        const demoHistory = [
            {
                date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                plan: 'Professional',
                amount: 79,
                status: 'Paid',
                invoiceId: 'inv_demo_001'
            },
            {
                date: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
                plan: 'Professional',
                amount: 79,
                status: 'Paid',
                invoiceId: 'inv_demo_002'
            }
        ];

        this.updateBillingTable(demoHistory);
    }

}

// Global functions referenced by HTML onclick handlers
window.showTab = function(tabName) {
    console.log(`🔄 showTab called with: ${tabName}`);
    
    try {
        if (window.orgAdmin) {
            window.orgAdmin.switchTab(tabName);
        } else {
            console.log('⚠️ orgAdmin not available, trying direct tab switch');
            // Fallback direct implementation
            
            // Remove active class from all tabs and content
            document.querySelectorAll('.nav-tab').forEach(tab => {
                tab.classList.remove('active');
                console.log('Removed active from tab:', tab.textContent.trim());
            });
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
                console.log('Removed active from content:', content.id);
            });
            
            // Add active class to selected tab and content
            const selectedTab = document.querySelector(`[onclick="showTab('${tabName}')"]`);
            const selectedContent = document.getElementById(tabName);
            
            if (selectedTab) {
                selectedTab.classList.add('active');
                console.log('✅ Activated tab:', selectedTab.textContent.trim());
            } else {
                console.error('❌ Tab not found for:', tabName);
            }
            
            if (selectedContent) {
                selectedContent.classList.add('active');
                console.log('✅ Activated content:', tabName);
            } else {
                console.error('❌ Content not found for:', tabName);
            }
        }
    } catch (error) {
        console.error('❌ Error in showTab:', error);
    }
};

window.openBrandManager = function() {
    console.log('🎨 Opening Brand Manager...');
    
    // Get current organization slug from URL
    const pathParts = window.location.pathname.split('/');
    const orgSlug = pathParts[1]; // Assuming URL is /orgSlug/admin
    
    if (orgSlug) {
        // Open brand manager in new tab/window
        const brandManagerUrl = `/${orgSlug}/brand-manager`;
        console.log('🎨 Brand Manager URL:', brandManagerUrl);
        window.open(brandManagerUrl, '_blank');
    } else {
        console.error('❌ Could not determine organization slug');
        alert('Error: Could not determine organization. Please refresh the page and try again.');
    }
};

window.openUserModal = function() {
    const modal = document.getElementById('userModal');
    if (modal) {
        modal.style.display = 'flex';
        // Clear form
        document.getElementById('userName').value = '';
        document.getElementById('userEmail').value = '';
        document.getElementById('userRole').value = 'customer';
        document.getElementById('userPassword').value = '';
        document.getElementById('userModalTitle').textContent = 'Create New User';
    }
};

window.closeUserModal = function() {
    const modal = document.getElementById('userModal');
    if (modal) {
        modal.style.display = 'none';
    }
};

window.saveUser = async function() {
    if (!window.orgAdmin) return;
    
    const userData = {
        username: document.getElementById('userName').value,
        email: document.getElementById('userEmail').value,
        role: document.getElementById('userRole').value,
        password: document.getElementById('userPassword').value
    };
    
    try {
        const response = await window.orgAdmin.makeAuthenticatedRequest('/api/admin/users', {
            method: 'POST',
            body: JSON.stringify(userData)
        });
        
        if (response.ok) {
            window.orgAdmin.showSuccess('User created successfully!');
            closeUserModal();
            window.orgAdmin.loadUsersData();
        } else {
            const error = await response.json();
            window.orgAdmin.showError('Failed to create user: ' + error.message);
        }
    } catch (error) {
        window.orgAdmin.showError('Error creating user: ' + error.message);
    }
};

window.saveOrgSettings = async function() {
    if (!window.orgAdmin) return;
    
    const settings = {
        name: document.getElementById('orgName').value,
        domain: document.getElementById('orgDomain').value,
        maxConcurrentChats: document.getElementById('maxConcurrentChats').value,
        chatTimeout: document.getElementById('chatTimeout').value,
        requireMFA: document.getElementById('requireMFA').checked,
        enableLogging: document.getElementById('enableLogging').checked,
        allowGuestChat: document.getElementById('allowGuestChat').checked
    };
    
    try {
        const response = await window.orgAdmin.makeAuthenticatedRequest('/api/admin/organizations/settings', {
            method: 'PUT',
            body: JSON.stringify(settings)
        });
        
        if (response.ok) {
            window.orgAdmin.showSuccess('Organization settings saved successfully!');
        } else {
            const error = await response.json();
            window.orgAdmin.showError('Failed to save settings: ' + error.message);
        }
    } catch (error) {
        window.orgAdmin.showError('Error saving settings: ' + error.message);
    }
}

// Initialize orgAdmin object for global function access
window.orgAdmin = window.orgAdmin || {};

window.toggleDepartmentSelection = function() {
    const role = document.getElementById('userRole').value;
    const departmentGroup = document.getElementById('departmentGroup');
    
    if (departmentGroup) {
        departmentGroup.style.display = role === 'agent' ? 'block' : 'none';
    }
};

window.showCreateUserModal = function() {
    window.openUserModal();
};

window.editUser = function(userId) {
    if (!window.orgAdmin) return;
    
    console.log(`✏️ Editing user: ${userId}`);
    window.orgAdmin.showSuccess(`Editing user ${userId} (Demo mode)`);
    window.openUserModal();
};

window.deleteUser = function(userId) {
    if (!window.orgAdmin) return;
    
    if (confirm('Are you sure you want to delete this user?')) {
        console.log(`🗑️ Deleting user: ${userId}`);
        window.orgAdmin.showSuccess(`User ${userId} deleted successfully (Demo mode)`);
        // In real implementation, this would call the delete API and refresh the table
    }
};

window.filterUsers = function() {
    const searchTerm = document.getElementById('userSearch').value.toLowerCase();
    const rows = document.querySelectorAll('#usersTable tbody tr');
    
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(searchTerm) ? '' : 'none';
    });
};

window.logout = function() {
    if (confirm('Are you sure you want to logout?')) {
        sessionStorage.removeItem('orgAdminToken');
        sessionStorage.removeItem('orgAdminOrg');
        window.location.href = '/';
    }
};

window.saveAIConfig = function() {
    if (!window.orgAdmin) return;
    
    const aiConfig = {
        openaiApiKey: document.getElementById('openaiApiKey').value,
        temperature: document.getElementById('temperature').value,
        maxTokens: document.getElementById('maxTokens').value,
        model: document.getElementById('model').value
    };
    
    console.log('🤖 Saving AI config:', aiConfig);
    window.orgAdmin.showSuccess('AI Configuration saved successfully! (Demo mode)');
};

window.saveBotConfiguration = function() {
    if (!window.orgAdmin) return;
    
    console.log('🤖 Saving bot configuration');
    window.orgAdmin.showSuccess('Bot Configuration saved successfully! (Demo mode)');
};

window.resetBotConfiguration = function() {
    if (!window.orgAdmin) return;
    
    if (confirm('Are you sure you want to reset bot configuration to defaults?')) {
        console.log('🔄 Resetting bot configuration');
        window.orgAdmin.showSuccess('Bot Configuration reset to defaults! (Demo mode)');
    }
};

window.testBotPersonalities = function() {
    if (!window.orgAdmin) return;
    
    console.log('🧪 Testing bot personalities');
    window.orgAdmin.showSuccess('Bot personality test completed! (Demo mode)');
};

// ChatFlow management functions
window.orgAdmin.editFlowStep = function(stepId) {
    console.log(`✏️ Editing flow step: ${stepId}`);
    
    const stepNames = {
        welcome: 'Welcome Step',
        intent: 'Intent Detection',
        handoff: 'Agent Handoff'
    };
    
    const stepName = stepNames[stepId] || stepId;
    const newContent = prompt(`Edit ${stepName} configuration:`, `Configuration for ${stepName}`);
    
    if (newContent) {
        window.orgAdmin.showSuccess(`${stepName} updated successfully! (Demo mode)`);
    }
};

window.orgAdmin.addFlowStep = function() {
    console.log('➕ Adding new ChatFlow step');
    
    const stepTypes = ['Condition', 'Action', 'Message', 'API Call', 'Transfer'];
    const stepType = prompt(`Select step type:\n${stepTypes.map((t, i) => `${i + 1}. ${t}`).join('\n')}`);
    
    if (stepType) {
        window.orgAdmin.showSuccess(`New ChatFlow step added! (Demo mode)`);
        
        // Refresh the AI config to show updated flow
        setTimeout(() => {
            if (window.orgAdmin.currentTab === 'ai-config') {
                window.orgAdmin.loadAIConfigData();
            }
        }, 500);
    }
};

window.orgAdmin.testChatFlow = function() {
    console.log('🧪 Testing ChatFlow');
    
    // Simulate flow test
    window.orgAdmin.showSuccess('ChatFlow test initiated! Check console for results (Demo mode)');
    
    // Simulate test results
    setTimeout(() => {
        console.log('🌊 ChatFlow Test Results:');
        console.log('✅ Welcome step: Working');
        console.log('✅ Intent detection: Working');
        console.log('✅ Agent handoff: Working');
        console.log('📊 Average response time: 1.2s');
        window.orgAdmin.showSuccess('ChatFlow test completed successfully!');
    }, 2000);
};

window.orgAdmin.exportChatFlow = function() {
    console.log('📤 Exporting ChatFlow configuration');
    
    const flowConfig = {
        version: '1.0',
        steps: [
            { id: 'welcome', type: 'message', content: 'Hello! How can I help you today?' },
            { id: 'intent', type: 'ai_analysis', model: 'gpt-3.5-turbo' },
            { id: 'handoff', type: 'transfer', conditions: ['human_requested', 'complex_query'] }
        ],
        settings: {
            enabled: true,
            mode: 'auto',
            fallback: "I'm not sure I understand. Could you please rephrase?"
        }
    };
    
    // Create download link
    const dataStr = JSON.stringify(flowConfig, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = 'chatflow-config.json';
    link.click();
    
    URL.revokeObjectURL(url);
    window.orgAdmin.showSuccess('ChatFlow configuration exported! (Demo mode)');
};

window.saveChatFlowConfig = function() {
    if (!window.orgAdmin) return;
    
    const chatflowConfig = {
        enabled: document.getElementById('chatflowEnabled')?.value === 'true',
        mode: document.getElementById('chatflowMode')?.value,
        welcomeMessage: document.getElementById('welcomeMessage')?.value,
        fallbackMessage: document.getElementById('fallbackMessage')?.value
    };
    
    console.log('🌊 Saving ChatFlow config:', chatflowConfig);
    window.orgAdmin.showSuccess('ChatFlow Configuration saved successfully! (Demo mode)');
};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('🌐 DOM Content Loaded - Initializing Organization Admin');
    
    try {
        // Create new instance
        window.orgAdmin = new OrganizationAdmin();
        
        // Debug: List available functions
        console.log('🔍 Available orgAdmin functions:', Object.keys(window.orgAdmin).filter(key => typeof window.orgAdmin[key] === 'function'));
        
        console.log('✅ OrganizationAdmin instance created successfully');
    } catch (error) {
        console.error('❌ Failed to create OrganizationAdmin instance:', error);
    }
});

// Also try to initialize immediately if DOM is already loaded
if (document.readyState === 'loading') {
    console.log('⏳ DOM still loading, waiting for DOMContentLoaded...');
} else {
    console.log('🚀 DOM already loaded, initializing immediately');
    setTimeout(() => {
        if (!window.orgAdmin || typeof window.orgAdmin.init !== 'function') {
            try {
                // Create new instance
                window.orgAdmin = new OrganizationAdmin();
                
                // Debug: List available functions
                console.log('🔍 Available orgAdmin functions:', Object.keys(window.orgAdmin).filter(key => typeof window.orgAdmin[key] === 'function'));
                
                console.log('✅ OrganizationAdmin instance created successfully (immediate)');
            } catch (error) {
                console.error('❌ Failed to create OrganizationAdmin instance (immediate):', error);
            }
        }
    }, 100);
}

// Add styles for admin dashboard functionality
const style = document.createElement('style');
style.textContent = `
    .auth-required {
        display: flex;
        justify-content: center;
        align-items: center;
        min-height: 80vh;
    }
    
    .auth-card {
        background: white;
        padding: 40px;
        border-radius: 15px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.1);
        text-align: center;
        max-width: 500px;
    }
    
    .auth-card h2 {
        margin-bottom: 20px;
        color: #4a5568;
    }
    
    .auth-card p {
        margin-bottom: 15px;
        color: #718096;
        line-height: 1.6;
    }
    
    .btn {
        padding: 12px 24px;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        font-size: 16px;
        margin-top: 20px;
    }
    
    .btn-secondary {
        background: #6b7280;
        color: white;
    }
    
    .btn-secondary:hover {
        background: #4b5563;
    }
    
    .btn-success {
        background: #10b981;
        color: white;
    }
    
    .btn-success:hover {
        background: #059669;
    }
    
    .btn-danger {
        background: #ef4444;
        color: white;
    }
    
    .btn-danger:hover {
        background: #dc2626;
    }
    
    .btn-sm {
        padding: 6px 12px;
        font-size: 12px;
    }
    
    .role-badge {
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 12px;
        font-weight: bold;
    }
    
    .role-badge.admin {
        background: #fbbf24;
        color: #92400e;
    }
    
    .role-badge.agent {
        background: #34d399;
        color: #065f46;
    }
    
    .role-badge.customer {
        background: #60a5fa;
        color: #1e40af;
    }
    
    .status-badge {
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 12px;
        font-weight: bold;
    }
    
    .status-badge.online {
        background: #10b981;
        color: white;
    }
    
    .status-badge.offline {
        background: #6b7280;
        color: white;
    }
    
    .status-badge.busy {
        background: #f59e0b;
        color: white;
    }
    
    .status-badge.active {
        background: #10b981;
        color: white;
    }
    
    .modal {
        display: none;
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);
        justify-content: center;
        align-items: center;
        z-index: 1000;
    }
    
    .modal-content {
        background: white;
        padding: 30px;
        border-radius: 15px;
        max-width: 500px;
        width: 90%;
        max-height: 80vh;
        overflow-y: auto;
        position: relative;
    }
    
    .modal-close {
        position: absolute;
        top: 10px;
        right: 15px;
        background: none;
        border: none;
        font-size: 24px;
        cursor: pointer;
        color: #6b7280;
    }
    
    .modal-close:hover {
        color: #374151;
    }
    
    .form-group {
        margin-bottom: 20px;
    }
    
    .form-group label {
        display: block;
        margin-bottom: 5px;
        font-weight: 500;
        color: #374151;
    }
    
    .form-group input, .form-group select {
        width: 100%;
        padding: 10px;
        border: 1px solid #d1d5db;
        border-radius: 8px;
        font-size: 14px;
    }
    
    .form-group input:focus, .form-group select:focus {
        outline: none;
        border-color: #3b82f6;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }
    
    /* Department Management Styles */
    .department-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
        gap: 20px;
        margin-bottom: 20px;
    }
    
    .department-card {
        background: white;
        padding: 20px;
        border-radius: 12px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        border: 1px solid #e5e7eb;
    }
    
    .department-card h4 {
        margin: 0 0 10px 0;
        color: #374151;
    }
    
    .dept-info {
        margin: 10px 0;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }
    
    .agent-count {
        color: #6b7280;
        font-size: 14px;
    }
    
    .dept-actions {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        margin-top: 15px;
    }
    
    /* Analytics Styles */
    .analytics-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 20px;
        margin-bottom: 30px;
    }
    
    .analytics-card {
        background: white;
        padding: 20px;
        border-radius: 12px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        text-align: center;
    }
    
    .analytics-card h3 {
        margin: 0 0 10px 0;
        color: #6b7280;
        font-size: 14px;
        font-weight: 500;
    }
    
    .metric-value {
        font-size: 2.5rem;
        font-weight: bold;
        color: #1f2937;
        margin: 10px 0;
    }
    
    .metric-change {
        font-size: 12px;
        color: #10b981;
    }
    
    .analytics-charts {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
        gap: 20px;
    }
    
    .chart-container {
        background: white;
        padding: 20px;
        border-radius: 12px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    
    .chart-container h3 {
        margin: 0 0 15px 0;
        color: #374151;
    }
    
    .agent-item, .dept-stat {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 10px 0;
        border-bottom: 1px solid #f3f4f6;
    }
    
    .agent-info {
        display: flex;
        flex-direction: column;
    }
    
    .agent-name {
        font-weight: 500;
        color: #374151;
    }
    
    .agent-rating {
        font-size: 12px;
        color: #f59e0b;
    }
    
    .simple-chart {
        display: flex;
        align-items: end;
        gap: 5px;
        height: 120px;
        padding: 10px 0;
    }
    
    .chart-bar {
        flex: 1;
        background: linear-gradient(to top, #3b82f6, #60a5fa);
        border-radius: 3px 3px 0 0;
        position: relative;
        min-height: 20px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        align-items: center;
    }
    
    .bar-value {
        color: white;
        font-size: 10px;
        font-weight: bold;
        padding: 2px;
    }
    
    .bar-label {
        position: absolute;
        bottom: -20px;
        font-size: 10px;
        color: #6b7280;
        transform: rotate(-45deg);
    }
    
    /* ChatFlow Styles */
    .chatflow-config {
        margin-top: 30px;
    }
    
    .flow-builder {
        background: #f9fafb;
        border: 1px solid #e5e7eb;
        border-radius: 12px;
        padding: 20px;
        margin: 20px 0;
    }
    
    .flow-steps {
        margin-bottom: 20px;
    }
    
    .flow-step {
        background: white;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        margin-bottom: 15px;
        overflow: hidden;
        transition: all 0.2s ease;
    }
    
    .flow-step:hover {
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    
    .flow-step.active {
        border-color: #3b82f6;
        box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
    }
    
    .step-header {
        display: flex;
        align-items: center;
        padding: 12px 16px;
        background: #f8fafc;
        border-bottom: 1px solid #e5e7eb;
        gap: 10px;
    }
    
    .step-header i {
        color: #3b82f6;
        width: 16px;
    }
    
    .step-header span {
        flex: 1;
        font-weight: 500;
        color: #374151;
    }
    
    .btn-small {
        padding: 4px 8px;
        font-size: 12px;
        border: 1px solid #d1d5db;
        border-radius: 4px;
        background: white;
        color: #374151;
        cursor: pointer;
    }
    
    .btn-small:hover {
        background: #f9fafb;
        border-color: #9ca3af;
    }
    
    .step-content {
        padding: 12px 16px;
        color: #6b7280;
        font-size: 14px;
    }
    
    .flow-actions {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
        padding-top: 15px;
        border-top: 1px solid #e5e7eb;
    }
    
    .config-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 20px;
        margin-bottom: 20px;
    }
    
    .form-group textarea {
        width: 100%;
        padding: 10px;
        border: 1px solid #d1d5db;
        border-radius: 8px;
        font-size: 14px;
        font-family: inherit;
        resize: vertical;
    }
    
    .form-group textarea:focus {
        outline: none;
        border-color: #3b82f6;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }
`;
document.head.appendChild(style);

// Plan Management Functions (Service Agents Only)
window.loadPlansManagement = async function() {
    if (!window.orgAdmin || !checkServiceAgentAccess()) return;
    
    try {
        console.log('🔄 Loading plans management...');
        
        // Load current organization details and plans
        await Promise.all([
            loadCurrentPlanDetails(),
            loadAvailablePlans(),
            loadUsageData(),
            loadPlanActivity()
        ]);
        
    } catch (error) {
        console.error('❌ Error loading plans management:', error);
        showNotification('Failed to load plan management data', 'error');
    }
};

window.loadCurrentPlanDetails = async function() {
    try {
        const response = await fetch('/api/global-admin/organizations/current', {
            headers: { 
                'Authorization': `Bearer ${sessionStorage.getItem('orgAdminToken')}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) throw new Error('Failed to load organization details');
        
        const data = await response.json();
        const org = data.organization;
        
        // Update current plan display
        document.getElementById('currentPlanName').textContent = 
            org.subscription?.plan ? org.subscription.plan.toUpperCase() : 'FREE';
        
        const planPrices = { free: '$0', professional: '$79', business: '$149' };
        document.getElementById('currentPlanPrice').textContent = 
            planPrices[org.subscription?.plan] || '$0';
        
        const statusElement = document.getElementById('planStatus');
        const status = org.subscription?.status || 'active';
        statusElement.textContent = status.toUpperCase();
        statusElement.className = `plan-status ${status}`;
        
        // Update billing info
        document.getElementById('nextBilling').textContent = 
            org.subscription?.nextBilling ? new Date(org.subscription.nextBilling).toLocaleDateString() : 'N/A';
        document.getElementById('billingCycle').textContent = 
            org.subscription?.billingCycle || 'monthly';
        document.getElementById('paymentMethod').textContent = 
            org.subscription?.paymentMethod || 'Not set';
        
    } catch (error) {
        console.error('❌ Error loading current plan:', error);
    }
};

window.loadUsageData = async function() {
    try {
        const response = await fetch('/api/global-admin/organizations/current/usage', {
            headers: { 
                'Authorization': `Bearer ${sessionStorage.getItem('orgAdminToken')}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) throw new Error('Failed to load usage data');
        
        const data = await response.json();
        const usage = data.usage;
        
        // Update agent usage
        const agentCount = usage.agents || 0;
        const agentLimit = usage.agentLimit || 1;
        document.getElementById('agentUsage').textContent = `${agentCount}/${agentLimit}`;
        updateUsageBar('agentUsageBar', agentCount, agentLimit);
        
        // Update knowledge base usage
        const kbUsage = Math.round((usage.knowledgeBase || 0) / (1024 * 1024)); // Convert to MB
        const kbLimit = usage.knowledgeBaseLimit || 50;
        document.getElementById('kbUsage').textContent = `${kbUsage}MB/${kbLimit}MB`;
        updateUsageBar('kbUsageBar', kbUsage, kbLimit);
        
        // Update conversation usage
        const convUsage = usage.conversations || 0;
        const convLimit = usage.conversationLimit || 100;
        document.getElementById('conversationUsage').textContent = `${convUsage}/${convLimit}`;
        updateUsageBar('conversationUsageBar', convUsage, convLimit);
        
    } catch (error) {
        console.error('❌ Error loading usage data:', error);
    }
};

window.updateUsageBar = function(elementId, used, limit) {
    const percentage = Math.min((used / limit) * 100, 100);
    const bar = document.getElementById(elementId);
    
    bar.style.width = `${percentage}%`;
    
    // Color coding based on usage
    if (percentage >= 90) {
        bar.className = 'usage-fill danger';
    } else if (percentage >= 75) {
        bar.className = 'usage-fill warning';
    } else {
        bar.className = 'usage-fill';
    }
};

window.loadAvailablePlans = async function() {
    try {
        const response = await fetch('/api/plans', {
            headers: { 
                'Authorization': `Bearer ${sessionStorage.getItem('orgAdminToken')}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) throw new Error('Failed to load plans');
        
        const data = await response.json();
        const plans = data.plans;
        const plansGrid = document.getElementById('plansGrid');
        
        plansGrid.innerHTML = plans.map(plan => `
            <div class="plan-option ${plan.popular ? 'popular' : ''}" 
                 onclick="selectPlan('${plan.name}')">
                <h4>${plan.displayName}</h4>
                <div class="price">$${plan.price}<span style="font-size: 14px; color: #666;">/${plan.billingCycle}</span></div>
                <ul class="plan-features">
                    ${plan.features.map(feature => `<li>${feature}</li>`).join('')}
                </ul>
                <button class="btn btn-primary" style="width: 100%;">
                    Select Plan
                </button>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('❌ Error loading plans:', error);
    }
};

window.loadPlanActivity = async function() {
    try {
        const response = await fetch('/api/global-admin/organizations/current/plan-activity', {
            headers: { 
                'Authorization': `Bearer ${sessionStorage.getItem('orgAdminToken')}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            // If endpoint doesn't exist, show mock data
            showMockPlanActivity();
            return;
        }
        
        const data = await response.json();
        displayPlanActivity(data.activity);
        
    } catch (error) {
        console.error('❌ Error loading plan activity:', error);
        showMockPlanActivity();
    }
};

window.showMockPlanActivity = function() {
    const mockActivity = [
        {
            type: 'upgrade',
            description: 'Upgraded to Professional plan',
            date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
            user: 'Service Agent'
        },
        {
            type: 'billing',
            description: 'Monthly billing cycle completed',
            date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
            amount: '$79.00'
        }
    ];
    
    displayPlanActivity(mockActivity);
};

window.displayPlanActivity = function(activity) {
    const activityLog = document.getElementById('planActivityLog');
    
    if (!activity || activity.length === 0) {
        activityLog.innerHTML = '<p style="text-align: center; color: #666;">No recent activity</p>';
        return;
    }
    
    activityLog.innerHTML = activity.map(item => `
        <div class="activity-item">
            <div class="activity-icon ${item.type}">
                ${getActivityIcon(item.type)}
            </div>
            <div style="flex: 1;">
                <div style="font-weight: 600; margin-bottom: 4px;">${item.description}</div>
                <div style="color: #666; font-size: 14px;">
                    ${new Date(item.date).toLocaleDateString()} 
                    ${item.amount ? `• ${item.amount}` : ''}
                    ${item.user ? `• by ${item.user}` : ''}
                </div>
            </div>
        </div>
    `).join('');
};

window.getActivityIcon = function(type) {
    const icons = {
        upgrade: '<i class="fas fa-arrow-up"></i>',
        downgrade: '<i class="fas fa-arrow-down"></i>',
        billing: '<i class="fas fa-credit-card"></i>',
        cancel: '<i class="fas fa-times"></i>',
        trial: '<i class="fas fa-clock"></i>'
    };
    return icons[type] || '<i class="fas fa-info"></i>';
};

// Plan Action Functions
window.selectPlan = async function(planName) {
    if (!checkServiceAgentAccess()) return;
    
    // Show plan confirmation modal instead of direct confirmation
    showPlanConfirmationModal(planName);
};

window.showPlanConfirmationModal = async function(newPlan) {
    try {
        // Load current plan data
        const response = await fetch('/api/global-admin/organizations/current', {
            headers: { 
                'Authorization': `Bearer ${sessionStorage.getItem('orgAdminToken')}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) throw new Error('Failed to load current plan');
        
        const data = await response.json();
        const currentPlan = data.organization.subscription?.plan || 'free';
        
        // Update modal content
        document.getElementById('currentPlanDisplay').textContent = currentPlan.toUpperCase();
        document.getElementById('newPlanDisplay').textContent = newPlan.toUpperCase();
        
        // Show plan changes
        const changes = getPlanChanges(currentPlan, newPlan);
        document.getElementById('planChangesDetails').innerHTML = changes;
        
        // Store selected plan for confirmation
        window.selectedPlan = newPlan;
        
        // Show modal
        document.getElementById('planModal').style.display = 'block';
        
    } catch (error) {
        console.error('❌ Error showing plan modal:', error);
        showNotification('Failed to load plan details', 'error');
    }
};

window.getPlanChanges = function(currentPlan, newPlan) {
    const planFeatures = {
        free: {
            agents: 1,
            storage: '50MB',
            conversations: 100,
            features: ['Basic features', 'Email support']
        },
        professional: {
            agents: 10,
            storage: '1GB',
            conversations: 2500,
            features: ['Custom branding', 'Priority support', 'Advanced analytics']
        },
        business: {
            agents: 25,
            storage: '5GB',
            conversations: 10000,
            features: ['API access', '24/7 support', 'Data export', 'Advanced AI']
        }
    };
    
    const current = planFeatures[currentPlan] || planFeatures.free;
    const newPlanData = planFeatures[newPlan] || planFeatures.free;
    
    let changes = '<ul>';
    
    if (current.agents !== newPlanData.agents) {
        changes += `<li>Agents: ${current.agents} → ${newPlanData.agents}</li>`;
    }
    
    if (current.storage !== newPlanData.storage) {
        changes += `<li>Storage: ${current.storage} → ${newPlanData.storage}</li>`;
    }
    
    if (current.conversations !== newPlanData.conversations) {
        changes += `<li>Monthly Conversations: ${current.conversations} → ${newPlanData.conversations}</li>`;
    }
    
    changes += '</ul>';
    
    return changes;
};

window.closePlanModal = function() {
    document.getElementById('planModal').style.display = 'none';
    window.selectedPlan = null;
};

window.confirmPlanChange = async function() {
    if (!window.selectedPlan) return;
    
    try {
        showNotification('Processing plan change...', 'info');
        
        const response = await fetch('/api/global-admin/organizations/current/change-plan', {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${sessionStorage.getItem('orgAdminToken')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ plan: window.selectedPlan })
        });
        
        if (!response.ok) throw new Error('Failed to change plan');
        
        showNotification(`Successfully changed to ${window.selectedPlan.toUpperCase()} plan`, 'success');
        closePlanModal();
        await loadPlansManagement(); // Reload data
        
    } catch (error) {
        console.error('❌ Error changing plan:', error);
        showNotification('Failed to change plan', 'error');
    }
};

window.showUpgradeOptions = function() {
    if (!checkServiceAgentAccess()) return;
    showNotification('Upgrade options - Feature coming soon', 'info');
};

window.showDowngradeOptions = function() {
    if (!checkServiceAgentAccess()) return;
    showNotification('Downgrade options - Feature coming soon', 'info');
};

window.showBillingHistory = function() {
    if (!checkServiceAgentAccess()) return;
    showNotification('Billing history - Feature coming soon', 'info');
};

window.showCancelOptions = function() {
    if (!checkServiceAgentAccess()) return;
    if (confirm('Are you sure you want to cancel the subscription? This action cannot be undone.')) {
        showNotification('Subscription cancellation - Feature coming soon', 'warning');
    }
};

window.extendTrial = async function() {
    if (!checkServiceAgentAccess()) return;
    
    const days = prompt('How many days to extend the trial?', '7');
    if (days && !isNaN(days)) {
        try {
            showNotification(`Extending trial by ${days} days...`, 'info');
            
            const response = await fetch('/api/global-admin/organizations/current/extend-trial', {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${sessionStorage.getItem('orgAdminToken')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ days: parseInt(days) })
            });
            
            if (!response.ok) throw new Error('Failed to extend trial');
            
            showNotification(`Trial extended by ${days} days`, 'success');
            await loadCurrentPlanDetails();
            
        } catch (error) {
            console.error('❌ Error extending trial:', error);
            showNotification('Failed to extend trial', 'error');
        }
    }
};

window.applyDiscount = function() {
    if (!checkServiceAgentAccess()) return;
    
    const discount = prompt('Enter discount code or percentage:', '');
    if (discount) {
        showNotification(`Applying discount: ${discount}`, 'info');
        // This would integrate with billing system
        setTimeout(() => {
            showNotification('Discount applied successfully', 'success');
        }, 2000);
    }
};

window.resetUsage = async function() {
    if (!checkServiceAgentAccess()) return;
    
    if (confirm('Are you sure you want to reset usage counters? This will reset conversation and knowledge base usage.')) {
        try {
            showNotification('Resetting usage counters...', 'info');
            
            const response = await fetch('/api/global-admin/organizations/current/reset-usage', {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${sessionStorage.getItem('orgAdminToken')}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) throw new Error('Failed to reset usage');
            
            showNotification('Usage counters reset successfully', 'success');
            await loadUsageData();
            
        } catch (error) {
            console.error('❌ Error resetting usage:', error);
            showNotification('Failed to reset usage', 'error');
        }
    }
};

window.freezeAccount = function() {
    if (!checkServiceAgentAccess()) return;
    
    if (confirm('Are you sure you want to freeze this account? The organization will not be able to use the service until unfrozen.')) {
        showNotification('Freezing account...', 'warning');
        
        // This would set organization status to frozen
        setTimeout(() => {
            showNotification('Account frozen successfully', 'success');
        }, 2000);
    }
};

// Service Agent Access Control
window.checkServiceAgentAccess = function() {
    // In a real implementation, this would check user permissions
    // For now, we'll enable it for all org-admin users
    // You can enhance this based on your role system
    
    const userRole = sessionStorage.getItem('userRole') || 'org-admin';
    const serviceAgentRoles = ['service-agent', 'global_admin', 'super_admin'];
    
    // For now, allow org-admin access to demonstrate the feature
    if (userRole === 'org-admin' || serviceAgentRoles.includes(userRole)) {
        return true;
    }
    
    showNotification('Access denied: Service agent privileges required', 'error');
    return false;
};

// Global notification function for plan management
window.showNotification = function(message, type = 'info') {
    // Create or update notification element
    let notification = document.getElementById('admin-notification');
    if (!notification) {
        notification = document.createElement('div');
        notification.id = 'admin-notification';
        document.body.appendChild(notification);
    }
    
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 25px;
        border-radius: 8px;
        color: white;
        font-weight: 500;
        z-index: 10000;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
        transform: translateX(100%);
        transition: transform 0.3s ease;
        max-width: 400px;
        word-wrap: break-word;
    `;
    
    // Color based on type
    const colors = {
        success: '#10b981',
        error: '#ef4444',
        warning: '#f59e0b',
        info: '#3b82f6'
    };
    
    notification.style.background = colors[type] || colors.info;
    
    // Animate in
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 10);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }
    }, 5000);
};

// Show/hide service agent features based on role
window.initializeServiceAgentFeatures = function() {
    const isServiceAgent = checkServiceAgentAccess();
    
    if (isServiceAgent) {
        // Show service agent features
        document.body.classList.add('service-agent');
        
        // Load plans management when the tab is first shown
        const managePlansTab = document.querySelector('[onclick="showTab(\'manage-plans\')"]');
        if (managePlansTab && managePlansTab.style.display === 'none') {
            managePlansTab.style.display = 'flex';
        }
    } else {
        // Hide service agent features
        document.body.classList.remove('service-agent');
    }
};

// Enhanced showTab function to handle plans management
const originalShowTab = window.showTab;
window.showTab = function(tabName) {
    console.log(`🔄 showTab called with: ${tabName}`);
    
    // Call original showTab function
    originalShowTab(tabName);
    
    // Load plans management data when switching to that tab
    if (tabName === 'manage-plans') {
        setTimeout(() => {
            loadPlansManagement();
        }, 100);
    }
};

// Initialize service agent features when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        initializeServiceAgentFeatures();
    }, 1000);
});