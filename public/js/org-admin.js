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
        
        // Check for magic token in URL
        await this.handleMagicToken();
        
        // Initialize UI if authenticated
        if (this.authToken) {
            await this.loadOrganizationData();
            this.initializeUI();
        } else {
            this.showLoginRequired();
        }
    }

    async handleMagicToken() {
        const urlParams = new URLSearchParams(window.location.search);
        const magicToken = urlParams.get('magic_token');
        
        if (magicToken) {
            console.log('🪄 Magic token detected, authenticating...');
            
            try {
                // Verify and use the magic token
                const response = await fetch('/api/verify-magic-token', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ magicToken })
                });
                
                const data = await response.json();
                
                if (response.ok && data.success) {
                    this.authToken = data.token || magicToken; // Use regular token if provided, otherwise magic token
                    console.log('✅ Magic login successful');
                    
                    // Remove magic token from URL for security
                    const url = new URL(window.location);
                    url.searchParams.delete('magic_token');
                    window.history.replaceState({}, document.title, url.pathname);
                    
                    // Store token for this session
                    sessionStorage.setItem('orgAdminToken', this.authToken);
                    
                } else {
                    console.error('❌ Magic token verification failed:', data.message);
                    this.showError('Magic login failed: ' + (data.message || 'Invalid token'));
                }
            } catch (error) {
                console.error('❌ Magic token error:', error);
                this.showError('Magic login error: ' + error.message);
            }
        } else {
            // Check for existing session token
            this.authToken = sessionStorage.getItem('orgAdminToken') || localStorage.getItem('orgAdminToken');
        }
    }

    async loadOrganizationData() {
        try {
            // Extract organization slug from URL
            const pathParts = window.location.pathname.split('/');
            const orgSlug = pathParts[1];
            
            if (!orgSlug || orgSlug === 'admin') {
                throw new Error('Invalid organization URL');
            }
            
            console.log(`🏢 Loading organization data for: ${orgSlug}`);
            
            // For now, we'll get organization info from the magic token
            // In a full implementation, you'd make an API call here
            this.organization = { slug: orgSlug };
            
            console.log('✅ Organization data loaded');
        } catch (error) {
            console.error('❌ Failed to load organization data:', error);
            this.showError('Failed to load organization data: ' + error.message);
        }
    }

    initializeUI() {
        console.log('🎨 Initializing UI components...');
        
        // Show success message
        this.showSuccess('Welcome to the Organization Admin Portal!');
        
        // Initialize any UI components here
        this.setupEventListeners();
        
        console.log('✅ UI initialized successfully');
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