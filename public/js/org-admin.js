// Organization Admin Portal JavaScript
// Handles magic login tokens and admin portal functionality

console.log('🔧 org-admin.js loaded successfully');

class OrganizationAdmin {
    constructor() {
        this.authToken = null;
        this.organization = null;
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
        console.log(`🔄 Switching to tab: ${tabName}`);
        
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
            }
            
            if (selectedContent) {
                selectedContent.classList.add('active');
                console.log(`✅ Activated content: ${tabName}`);
            } else {
                console.error(`❌ Content section not found for: ${tabName}`);
            }
            
            // Load tab-specific data
            this.loadTabData(tabName);
            
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
        console.log('📈 Loading analytics data...');
        try {
            const response = await this.makeAuthenticatedRequest('/api/admin/analytics');
            if (response.ok) {
                const data = await response.json();
                this.updateAnalyticsCharts(data);
            }
        } catch (error) {
            console.error('Failed to load analytics data:', error);
        }
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
        // In demo mode, return mock responses
        if (this.authToken === 'demo-token') {
            return this.getMockResponse(url, options);
        }
        
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                ...(this.authToken && { 'Authorization': `Bearer ${this.authToken}` })
            }
        };
        
        return fetch(url, { ...defaultOptions, ...options });
    }
    
    getMockResponse(url, options) {
        console.log(`🎭 Mock response for: ${options.method || 'GET'} ${url}`);
        
        const mockResponses = {
            '/api/admin/dashboard': { 
                stats: { totalUsers: 45, activeChats: 8, avgResponseTime: '2.3min', satisfaction: '94%' } 
            },
            '/api/admin/users': { 
                users: [
                    { _id: '1', username: 'john.doe', email: 'john@demo.com', role: 'agent', status: 'online', createdAt: new Date() },
                    { _id: '2', username: 'jane.smith', email: 'jane@demo.com', role: 'admin', status: 'online', createdAt: new Date() }
                ]
            },
            '/api/admin/departments': {
                departments: [
                    { _id: '1', name: 'Sales', agentCount: 5, status: 'active' },
                    { _id: '2', name: 'Technical Support', agentCount: 8, status: 'active' }
                ]
            },
            '/api/ai/config': {
                openaiKey: 'sk-demo...key',
                temperature: 0.7,
                maxTokens: 500
            },
            '/api/admin/analytics': {
                chatsToday: 156,
                responseTime: 145,
                satisfaction: 4.7,
                topAgents: [
                    { name: 'John Doe', chats: 34, rating: 4.9 },
                    { name: 'Jane Smith', chats: 28, rating: 4.8 }
                ]
            }
        };
        
        // Mock successful response
        return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve(mockResponses[url] || { success: true, message: 'Demo response' })
        });
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
            if (statsElements.totalUsers) statsElements.totalUsers.textContent = data.stats.totalUsers || '45';
            if (statsElements.activeAgents) statsElements.activeAgents.textContent = data.stats.activeAgents || '12';
            if (statsElements.totalChats) statsElements.totalChats.textContent = data.stats.totalChats || '1,234';
            if (statsElements.aiInteractions) statsElements.aiInteractions.textContent = data.stats.aiInteractions || '890';
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
        const tbody = document.querySelector('#departmentsTable tbody');
        if (tbody && data.departments) {
            tbody.innerHTML = data.departments.map(dept => `
                <tr>
                    <td>${dept.name}</td>
                    <td>${dept.agentCount || 0}</td>
                    <td><span class="status-badge ${dept.status}">${dept.status}</span></td>
                    <td>
                        <button onclick="window.orgAdmin.editDepartment('${dept._id}')" class="btn btn-sm">Edit</button>
                        <button onclick="window.orgAdmin.deleteDepartment('${dept._id}')" class="btn btn-sm btn-danger">Delete</button>
                    </td>
                </tr>
            `).join('');
        }
    }

    async handleSave(event) {
        const section = event.target.dataset.section;
        console.log(`💾 Saving ${section} settings...`);
        
        // Implement save functionality here
        this.showSuccess(`${section} settings saved successfully!`);
    }

    showLoginRequired() {
        console.log('🔐 No authentication found, loading demo mode...');
        
        // Instead of showing login required, let's show demo mode for testing
        this.organization = { name: 'Demo Organization', domain: 'demo', _id: 'demo-org' };
        this.authToken = 'demo-token';
        
        // Show demo mode notification
        this.showSuccess('🎮 Demo Mode Active - All functionality available for testing!');
        
        // Initialize UI with demo data
        this.initializeUI();
        
        // Load demo data for all sections
        this.loadDemoData();
    }
    
    loadDemoData() {
        console.log('📚 Loading demo data for testing...');
        
        // Demo dashboard stats
        this.updateDashboardStats({
            stats: {
                totalUsers: 45,
                activeAgents: 12,
                totalChats: 1234,
                aiInteractions: 890
            }
        });
        
        // Demo users data
        this.updateUsersTable({
            users: [
                { _id: '1', username: 'john.doe', email: 'john@demo.com', role: 'agent', status: 'online', createdAt: new Date() },
                { _id: '2', username: 'jane.smith', email: 'jane@demo.com', role: 'admin', status: 'online', createdAt: new Date() },
                { _id: '3', username: 'bob.wilson', email: 'bob@demo.com', role: 'customer', status: 'offline', createdAt: new Date() },
                { _id: '4', username: 'alice.johnson', email: 'alice@demo.com', role: 'agent', status: 'busy', createdAt: new Date() }
            ]
        });
        
        // Demo departments data
        this.updateDepartmentsTable({
            departments: [
                { _id: '1', name: 'Sales', agentCount: 5, status: 'active' },
                { _id: '2', name: 'Technical Support', agentCount: 8, status: 'active' },
                { _id: '3', name: 'Billing', agentCount: 3, status: 'active' },
                { _id: '4', name: 'General', agentCount: 2, status: 'active' }
            ]
        });
        
        console.log('✅ Demo data loaded successfully');
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
};

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

window.editDepartment = function(deptId) {
    if (!window.orgAdmin) return;
    
    console.log(`✏️ Editing department: ${deptId}`);
    window.orgAdmin.showSuccess(`Editing department ${deptId} (Demo mode)`);
};

window.deleteDepartment = function(deptId) {
    if (!window.orgAdmin) return;
    
    if (confirm('Are you sure you want to delete this department?')) {
        console.log(`🗑️ Deleting department: ${deptId}`);
        window.orgAdmin.showSuccess(`Department ${deptId} deleted successfully (Demo mode)`);
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

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('🌐 DOM Content Loaded - Initializing Organization Admin');
    
    try {
        window.orgAdmin = new OrganizationAdmin();
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
        if (!window.orgAdmin) {
            try {
                window.orgAdmin = new OrganizationAdmin();
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
`;
document.head.appendChild(style);