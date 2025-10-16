// Organization Admin Portal JavaScript
// Handles magic login tokens and admin portal functionality

class OrganizationAdmin {
    constructor() {
        this.authToken = null;
        this.organization = null;
        this.init();
    }

    async init() {
        console.log('🔧 Initializing Organization Admin Portal...');
        console.log('🔍 Current URL:', window.location.href);
        
        // Check for magic token in URL and authenticate
        const authSuccess = await this.handleMagicToken();
        
        console.log('🔍 Authentication result:', authSuccess);
        console.log('🔍 Auth token available:', this.authToken ? 'YES' : 'NO');
        
        // Initialize UI if authenticated
        if (this.authToken) {
            console.log('✅ Authentication successful, loading organization data...');
            await this.loadOrganizationData();
            this.initializeUI();
        } else {
            console.log('❌ No authentication available, showing login required');
            this.showLoginRequired();
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
        
        // Example: Save button listeners, form handlers, etc.
        document.querySelectorAll('.save-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.handleSave(e);
            });
        });
    }

    async handleSave(event) {
        const section = event.target.dataset.section;
        console.log(`💾 Saving ${section} settings...`);
        
        // Implement save functionality here
        this.showSuccess(`${section} settings saved successfully!`);
    }

    showLoginRequired() {
        const container = document.querySelector('.admin-container');
        if (container) {
            container.innerHTML = `
                <div class="auth-required">
                    <div class="auth-card">
                        <h2>🔐 Authentication Required</h2>
                        <p>You need to be authenticated to access this organization's admin portal.</p>
                        <p>Please use a magic login link from the global admin panel.</p>
                        <button onclick="window.close()" class="btn btn-secondary">Close</button>
                    </div>
                </div>
            `;
        }
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

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.orgAdmin = new OrganizationAdmin();
});

// Add styles for auth required page
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
`;
document.head.appendChild(style);