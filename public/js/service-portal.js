/**
 * ConvoAI Service Portal JavaScript Controller
 * Handles organization and plan management for service agents
 */

class ServicePortal {
    constructor() {
        this.baseURL = '/api/service-portal';
        this.currentTab = 'dashboard';
        this.organizations = [];
        this.plans = [];
        this.editingOrgId = null;
        this.editingPlanId = null;
        
        this.init();
    }

    async init() {
        console.log('🚀 Initializing Service Portal...');
        
        // Show loading overlay
        this.showAuthLoading();
        
        // Check authentication
        await this.checkAuth();
        
        // Hide loading overlay
        this.hideAuthLoading();
        
        // Load initial data
        await this.loadDashboard();
        
        // Set up event listeners
        this.setupEventListeners();
        
        console.log('✅ Service Portal initialized');
    }

    async checkAuth() {
        try {
            const token = localStorage.getItem('servicePortalToken');
            if (!token) {
                console.log('❌ No authentication token found');
                this.showAuthError('Authentication Required', 'Please login to access the service portal.');
                setTimeout(() => this.redirectToLogin(), 2000);
                return;
            }

            const response = await this.makeRequest('/auth/verify', 'GET');
            if (!response.success) {
                console.log('❌ Authentication verification failed');
                this.showAuthError('Invalid Session', 'Your session has expired. Redirecting to login...');
                setTimeout(() => this.redirectToLogin(), 2000);
                return;
            }

            // Update user info
            document.getElementById('currentUser').textContent = response.user.username || 'Service Agent';
            
        } catch (error) {
            console.error('❌ Auth check failed:', error);
            this.showAuthError('Authentication Error', 'Unable to verify authentication. Redirecting to login...');
            setTimeout(() => this.redirectToLogin(), 2000);
        }
    }

    redirectToLogin() {
        window.location.href = '/service-portal';
    }

    showAuthLoading() {
        const loadingElement = document.getElementById('authLoading');
        if (loadingElement) {
            loadingElement.classList.remove('hidden');
        }
    }

    hideAuthLoading() {
        const loadingElement = document.getElementById('authLoading');
        if (loadingElement) {
            loadingElement.classList.add('hidden');
        }
    }

    showAuthError(title, message) {
        const loadingElement = document.getElementById('authLoading');
        if (loadingElement) {
            loadingElement.innerHTML = `
                <div class="loading-content">
                    <div style="font-size: 48px; margin-bottom: 20px;">
                        <i class="fas fa-exclamation-triangle"></i>
                    </div>
                    <h3>${title}</h3>
                    <p>${message}</p>
                    <div style="margin-top: 20px;">
                        <i class="fas fa-spinner fa-spin"></i> Redirecting...
                    </div>
                </div>
            `;
        }
    }

    setupEventListeners() {
        // Organization form submission
        document.getElementById('orgForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveOrganization();
        });

        // Plan form submission
        document.getElementById('planForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.savePlan();
        });

        // Organization name to slug generation
        document.getElementById('orgName').addEventListener('input', (e) => {
            const slug = this.generateSlug(e.target.value);
            document.getElementById('orgSlug').value = slug;
        });

        // Plan name to internal name generation
        document.getElementById('planDisplayName').addEventListener('input', (e) => {
            const internalName = this.generateSlug(e.target.value);
            document.getElementById('planName').value = internalName;
        });
    }

    generateSlug(text) {
        return text
            .toLowerCase()
            .replace(/[^a-z0-9 -]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trim('-');
    }

    async makeRequest(endpoint, method = 'GET', data = null) {
        const token = localStorage.getItem('servicePortalToken');
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        };

        const config = {
            method,
            headers
        };

        if (data && (method === 'POST' || method === 'PUT')) {
            config.body = JSON.stringify(data);
        }

        try {
            const response = await fetch(this.baseURL + endpoint, config);
            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.message || 'Request failed');
            }
            
            return result;
        } catch (error) {
            console.error('❌ Request failed:', error);
            this.showNotification(error.message, 'error');
            throw error;
        }
    }

    showNotification(message, type = 'info') {
        // Create or update notification element
        let notification = document.getElementById('service-notification');
        if (!notification) {
            notification = document.createElement('div');
            notification.id = 'service-notification';
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
    }

    // ============================
    // TAB MANAGEMENT
    // ============================

    showTab(tabName) {
        console.log(`🔄 Switching to tab: ${tabName}`);
        
        // Hide all tab contents
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.remove('active');
        });
        
        // Remove active class from all nav tabs
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        
        // Show selected tab content
        document.getElementById(tabName).classList.add('active');
        
        // Add active class to selected nav tab
        document.querySelector(`[onclick="showTab('${tabName}')"]`).classList.add('active');
        
        this.currentTab = tabName;
        
        // Load tab-specific data
        switch (tabName) {
            case 'dashboard':
                this.loadDashboard();
                break;
            case 'organizations':
                this.loadOrganizations();
                break;
            case 'plans':
                this.loadPlans();
                break;
            case 'analytics':
                this.loadAnalytics();
                break;
        }
    }

    // ============================
    // DASHBOARD
    // ============================

    async loadDashboard() {
        try {
            console.log('📊 Loading dashboard...');
            
            const response = await this.makeRequest('/dashboard');
            const stats = response.data;
            
            // Update stat cards
            document.getElementById('totalOrgs').textContent = stats.totalOrganizations || 0;
            document.getElementById('activeSubscriptions').textContent = stats.activeSubscriptions || 0;
            document.getElementById('monthlyRevenue').textContent = `$${(stats.monthlyRevenue || 0).toLocaleString()}`;
            document.getElementById('supportTickets').textContent = stats.supportTickets || 0;
            
            // Load recent activities
            this.loadRecentActivities();
            
        } catch (error) {
            console.error('❌ Failed to load dashboard:', error);
        }
    }

    async loadRecentActivities() {
        try {
            const response = await this.makeRequest('/dashboard/activities');
            const activities = response.data || [];
            
            const container = document.getElementById('recentActivities');
            
            if (activities.length === 0) {
                container.innerHTML = '<div style="padding: 40px; text-align: center; color: #64748b;">No recent activities</div>';
                return;
            }
            
            container.innerHTML = `
                <table>
                    <thead>
                        <tr>
                            <th>Activity</th>
                            <th>Organization</th>
                            <th>User</th>
                            <th>Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${activities.map(activity => `
                            <tr>
                                <td>${activity.description}</td>
                                <td>${activity.organization || 'N/A'}</td>
                                <td>${activity.user || 'System'}</td>
                                <td>${new Date(activity.createdAt).toLocaleDateString()}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
            
        } catch (error) {
            console.error('❌ Failed to load activities:', error);
            document.getElementById('recentActivities').innerHTML = '<div style="padding: 40px; text-align: center; color: #ef4444;">Failed to load activities</div>';
        }
    }

    async refreshDashboard() {
        this.showNotification('Refreshing dashboard...', 'info');
        await this.loadDashboard();
        this.showNotification('Dashboard refreshed', 'success');
    }

    // ============================
    // ORGANIZATION MANAGEMENT
    // ============================

    async loadOrganizations() {
        try {
            console.log('🏢 Loading organizations...');
            
            const container = document.getElementById('organizationsTableContainer');
            container.innerHTML = '<div class="loading"><div class="spinner"></div>Loading organizations...</div>';
            
            const response = await this.makeRequest('/organizations');
            this.organizations = response.data || [];
            
            this.renderOrganizationsTable();
            
        } catch (error) {
            console.error('❌ Failed to load organizations:', error);
            document.getElementById('organizationsTableContainer').innerHTML = '<div style="padding: 40px; text-align: center; color: #ef4444;">Failed to load organizations</div>';
        }
    }

    renderOrganizationsTable() {
        const container = document.getElementById('organizationsTableContainer');
        
        if (this.organizations.length === 0) {
            container.innerHTML = `
                <div style="padding: 40px; text-align: center; color: #64748b;">
                    <i class="fas fa-building" style="font-size: 48px; margin-bottom: 16px; opacity: 0.5;"></i>
                    <p>No organizations found</p>
                    <button class="btn btn-primary" onclick="servicePortal.showCreateOrgModal()" style="margin-top: 16px;">
                        <i class="fas fa-plus"></i> Create First Organization
                    </button>
                </div>
            `;
            return;
        }
        
        container.innerHTML = `
            <table>
                <thead>
                    <tr>
                        <th>Organization</th>
                        <th>Plan</th>
                        <th>Status</th>
                        <th>Created</th>
                        <th>Contact</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${this.organizations.map(org => `
                        <tr>
                            <td>
                                <div style="font-weight: 600;">${org.name}</div>
                                <div style="font-size: 12px; color: #64748b;">${org.slug}</div>
                            </td>
                            <td>
                                <span class="plan-badge plan-${org.subscription?.plan || 'free'}">
                                    ${(org.subscription?.plan || 'free').toUpperCase()}
                                </span>
                            </td>
                            <td>
                                <span class="status-badge status-${org.subscription?.status || 'active'}">
                                    ${(org.subscription?.status || 'active').toUpperCase()}
                                </span>
                            </td>
                            <td>${new Date(org.createdAt).toLocaleDateString()}</td>
                            <td>
                                <div>${org.contactEmail || 'N/A'}</div>
                                ${org.contactPhone ? `<div style="font-size: 12px; color: #64748b;">${org.contactPhone}</div>` : ''}
                            </td>
                            <td>
                                <div class="action-buttons">
                                    <button class="action-btn action-edit" onclick="servicePortal.editOrganization('${org._id}')" title="Edit">
                                        <i class="fas fa-edit"></i>
                                    </button>
                                    <button class="action-btn action-delete" onclick="servicePortal.deleteOrganization('${org._id}')" title="Delete">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </div>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    showCreateOrgModal() {
        console.log('➕ Opening create organization modal');
        
        this.editingOrgId = null;
        document.getElementById('orgModalTitle').textContent = 'Create Organization';
        
        // Reset form
        document.getElementById('orgForm').reset();
        
        // Show modal
        document.getElementById('orgModal').classList.add('active');
    }

    async editOrganization(orgId) {
        console.log(`✏️ Editing organization: ${orgId}`);
        
        const org = this.organizations.find(o => o._id === orgId);
        if (!org) {
            this.showNotification('Organization not found', 'error');
            return;
        }
        
        this.editingOrgId = orgId;
        document.getElementById('orgModalTitle').textContent = 'Edit Organization';
        
        // Populate form
        document.getElementById('orgName').value = org.name || '';
        document.getElementById('orgSlug').value = org.slug || '';
        document.getElementById('orgEmail').value = org.contactEmail || '';
        document.getElementById('orgPhone').value = org.contactPhone || '';
        document.getElementById('orgDescription').value = org.description || '';
        document.getElementById('orgPlan').value = org.subscription?.plan || 'free';
        document.getElementById('orgStatus').value = org.subscription?.status || 'active';
        
        // Show modal
        document.getElementById('orgModal').classList.add('active');
    }

    async saveOrganization() {
        try {
            console.log('💾 Saving organization...');
            
            const formData = {
                name: document.getElementById('orgName').value,
                slug: document.getElementById('orgSlug').value,
                contactEmail: document.getElementById('orgEmail').value,
                contactPhone: document.getElementById('orgPhone').value,
                description: document.getElementById('orgDescription').value,
                subscription: {
                    plan: document.getElementById('orgPlan').value,
                    status: document.getElementById('orgStatus').value
                }
            };
            
            // Validation
            if (!formData.name || !formData.slug || !formData.contactEmail) {
                this.showNotification('Please fill in all required fields', 'error');
                return;
            }
            
            this.showNotification('Saving organization...', 'info');
            
            let response;
            if (this.editingOrgId) {
                // Update existing organization
                response = await this.makeRequest(`/organizations/${this.editingOrgId}`, 'PUT', formData);
                this.showNotification('Organization updated successfully', 'success');
            } else {
                // Create new organization
                response = await this.makeRequest('/organizations', 'POST', formData);
                this.showNotification('Organization created successfully', 'success');
            }
            
            // Close modal and reload data
            this.closeOrgModal();
            await this.loadOrganizations();
            
        } catch (error) {
            console.error('❌ Failed to save organization:', error);
        }
    }

    async deleteOrganization(orgId) {
        const org = this.organizations.find(o => o._id === orgId);
        if (!org) {
            this.showNotification('Organization not found', 'error');
            return;
        }
        
        if (!confirm(`Are you sure you want to delete "${org.name}"? This action cannot be undone.`)) {
            return;
        }
        
        try {
            console.log(`🗑️ Deleting organization: ${orgId}`);
            
            this.showNotification('Deleting organization...', 'info');
            
            await this.makeRequest(`/organizations/${orgId}`, 'DELETE');
            
            this.showNotification('Organization deleted successfully', 'success');
            await this.loadOrganizations();
            
        } catch (error) {
            console.error('❌ Failed to delete organization:', error);
        }
    }

    closeOrgModal() {
        document.getElementById('orgModal').classList.remove('active');
        this.editingOrgId = null;
    }

    filterOrganizations() {
        const searchTerm = document.getElementById('orgSearchInput').value.toLowerCase();
        const rows = document.querySelectorAll('#organizationsTableContainer tbody tr');
        
        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            row.style.display = text.includes(searchTerm) ? '' : 'none';
        });
    }

    async exportOrganizations() {
        try {
            this.showNotification('Preparing export...', 'info');
            
            const response = await this.makeRequest('/organizations/export');
            const blob = new Blob([response.data], { type: 'text/csv' });
            
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `organizations-${new Date().toISOString().split('T')[0]}.csv`;
            a.click();
            
            window.URL.revokeObjectURL(url);
            this.showNotification('Export downloaded', 'success');
            
        } catch (error) {
            console.error('❌ Export failed:', error);
        }
    }

    // ============================
    // PLAN MANAGEMENT
    // ============================

    async loadPlans() {
        try {
            console.log('📋 Loading plans...');
            
            const container = document.getElementById('plansTableContainer');
            container.innerHTML = '<div class="loading"><div class="spinner"></div>Loading plans...</div>';
            
            const response = await this.makeRequest('/plans');
            this.plans = response.data || [];
            
            this.renderPlansTable();
            
        } catch (error) {
            console.error('❌ Failed to load plans:', error);
            document.getElementById('plansTableContainer').innerHTML = '<div style="padding: 40px; text-align: center; color: #ef4444;">Failed to load plans</div>';
        }
    }

    renderPlansTable() {
        const container = document.getElementById('plansTableContainer');
        
        if (this.plans.length === 0) {
            container.innerHTML = `
                <div style="padding: 40px; text-align: center; color: #64748b;">
                    <i class="fas fa-layer-group" style="font-size: 48px; margin-bottom: 16px; opacity: 0.5;"></i>
                    <p>No plans found</p>
                    <button class="btn btn-primary" onclick="servicePortal.showCreatePlanModal()" style="margin-top: 16px;">
                        <i class="fas fa-plus"></i> Create First Plan
                    </button>
                </div>
            `;
            return;
        }
        
        container.innerHTML = `
            <table>
                <thead>
                    <tr>
                        <th>Plan</th>
                        <th>Price</th>
                        <th>Limits</th>
                        <th>Features</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${this.plans.map(plan => `
                        <tr>
                            <td>
                                <div style="font-weight: 600;">${plan.displayName}</div>
                                <div style="font-size: 12px; color: #64748b;">${plan.name}</div>
                            </td>
                            <td>
                                <div style="font-weight: 600;">$${plan.price}</div>
                                <div style="font-size: 12px; color: #64748b;">/${plan.billingCycle}</div>
                            </td>
                            <td>
                                <div style="font-size: 12px;">
                                    <div>👥 ${plan.maxAgents} agents</div>
                                    <div>💾 ${plan.knowledgeBaseSize}MB storage</div>
                                    <div>💬 ${plan.monthlyConversations} conversations</div>
                                </div>
                            </td>
                            <td>
                                <div style="font-size: 12px; max-width: 200px;">
                                    ${(plan.features || []).slice(0, 3).join(', ')}
                                    ${plan.features && plan.features.length > 3 ? '...' : ''}
                                </div>
                            </td>
                            <td>
                                <span class="status-badge status-${plan.isActive ? 'active' : 'inactive'}">
                                    ${plan.isActive ? 'ACTIVE' : 'INACTIVE'}
                                </span>
                            </td>
                            <td>
                                <div class="action-buttons">
                                    <button class="action-btn action-edit" onclick="servicePortal.editPlan('${plan._id}')" title="Edit">
                                        <i class="fas fa-edit"></i>
                                    </button>
                                    <button class="action-btn action-delete" onclick="servicePortal.deletePlan('${plan._id}')" title="Delete">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </div>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    showCreatePlanModal() {
        console.log('➕ Opening create plan modal');
        
        this.editingPlanId = null;
        document.getElementById('planModalTitle').textContent = 'Create Plan';
        
        // Reset form
        document.getElementById('planForm').reset();
        
        // Populate features checkboxes
        this.populatePlanFeatures();
        
        // Show modal
        document.getElementById('planModal').classList.add('active');
    }

    populatePlanFeatures() {
        const featuresContainer = document.getElementById('planFeatures');
        const availableFeatures = [
            'Basic Analytics',
            'Email Support',
            'Priority Support',
            '24/7 Phone Support',
            'Custom Branding',
            'API Access',
            'Data Export',
            'Advanced AI Features',
            'Role-based Permissions',
            'Advanced Analytics',
            'White-label Solution',
            'Dedicated Account Manager'
        ];
        
        featuresContainer.innerHTML = availableFeatures.map(feature => `
            <div class="checkbox-item">
                <input type="checkbox" id="feature-${this.generateSlug(feature)}" value="${feature}">
                <label for="feature-${this.generateSlug(feature)}">${feature}</label>
            </div>
        `).join('');
    }

    async editPlan(planId) {
        console.log(`✏️ Editing plan: ${planId}`);
        
        const plan = this.plans.find(p => p._id === planId);
        if (!plan) {
            this.showNotification('Plan not found', 'error');
            return;
        }
        
        this.editingPlanId = planId;
        document.getElementById('planModalTitle').textContent = 'Edit Plan';
        
        // Populate form
        document.getElementById('planName').value = plan.name || '';
        document.getElementById('planDisplayName').value = plan.displayName || '';
        document.getElementById('planPrice').value = plan.price || 0;
        document.getElementById('planBillingCycle').value = plan.billingCycle || 'monthly';
        document.getElementById('planMaxAgents').value = plan.maxAgents || 1;
        document.getElementById('planKnowledgeBaseSize').value = plan.knowledgeBaseSize || 50;
        document.getElementById('planMonthlyConversations').value = plan.monthlyConversations || 100;
        document.getElementById('planDescription').value = plan.description || '';
        
        // Populate features
        this.populatePlanFeatures();
        if (plan.features) {
            plan.features.forEach(feature => {
                const checkbox = document.getElementById(`feature-${this.generateSlug(feature)}`);
                if (checkbox) {
                    checkbox.checked = true;
                }
            });
        }
        
        // Show modal
        document.getElementById('planModal').classList.add('active');
    }

    async savePlan() {
        try {
            console.log('💾 Saving plan...');
            
            // Get selected features
            const selectedFeatures = [];
            document.querySelectorAll('#planFeatures input[type="checkbox"]:checked').forEach(checkbox => {
                selectedFeatures.push(checkbox.value);
            });
            
            const formData = {
                name: document.getElementById('planName').value,
                displayName: document.getElementById('planDisplayName').value,
                price: parseFloat(document.getElementById('planPrice').value),
                billingCycle: document.getElementById('planBillingCycle').value,
                maxAgents: parseInt(document.getElementById('planMaxAgents').value),
                knowledgeBaseSize: parseInt(document.getElementById('planKnowledgeBaseSize').value),
                monthlyConversations: parseInt(document.getElementById('planMonthlyConversations').value),
                features: selectedFeatures,
                description: document.getElementById('planDescription').value,
                isActive: true
            };
            
            // Validation
            if (!formData.name || !formData.displayName || formData.price < 0) {
                this.showNotification('Please fill in all required fields', 'error');
                return;
            }
            
            this.showNotification('Saving plan...', 'info');
            
            let response;
            if (this.editingPlanId) {
                // Update existing plan
                response = await this.makeRequest(`/plans/${this.editingPlanId}`, 'PUT', formData);
                this.showNotification('Plan updated successfully', 'success');
            } else {
                // Create new plan
                response = await this.makeRequest('/plans', 'POST', formData);
                this.showNotification('Plan created successfully', 'success');
            }
            
            // Close modal and reload data
            this.closePlanModal();
            await this.loadPlans();
            
        } catch (error) {
            console.error('❌ Failed to save plan:', error);
        }
    }

    async deletePlan(planId) {
        const plan = this.plans.find(p => p._id === planId);
        if (!plan) {
            this.showNotification('Plan not found', 'error');
            return;
        }
        
        if (!confirm(`Are you sure you want to delete the "${plan.displayName}" plan? This action cannot be undone.`)) {
            return;
        }
        
        try {
            console.log(`🗑️ Deleting plan: ${planId}`);
            
            this.showNotification('Deleting plan...', 'info');
            
            await this.makeRequest(`/plans/${planId}`, 'DELETE');
            
            this.showNotification('Plan deleted successfully', 'success');
            await this.loadPlans();
            
        } catch (error) {
            console.error('❌ Failed to delete plan:', error);
        }
    }

    closePlanModal() {
        document.getElementById('planModal').classList.remove('active');
        this.editingPlanId = null;
    }

    filterPlans() {
        const searchTerm = document.getElementById('planSearchInput').value.toLowerCase();
        const rows = document.querySelectorAll('#plansTableContainer tbody tr');
        
        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            row.style.display = text.includes(searchTerm) ? '' : 'none';
        });
    }

    // ============================
    // ANALYTICS
    // ============================

    async loadAnalytics() {
        try {
            console.log('📈 Loading analytics...');
            
            const response = await this.makeRequest('/analytics');
            const analytics = response.data;
            
            // Update plan distribution
            document.getElementById('freePlansCount').textContent = analytics.planDistribution?.free || 0;
            document.getElementById('proPlansCourt').textContent = analytics.planDistribution?.professional || 0;
            document.getElementById('businessPlansCount').textContent = analytics.planDistribution?.business || 0;
            
        } catch (error) {
            console.error('❌ Failed to load analytics:', error);
        }
    }

    async exportAnalytics() {
        try {
            this.showNotification('Preparing analytics export...', 'info');
            
            const response = await this.makeRequest('/analytics/export');
            const blob = new Blob([response.data], { type: 'text/csv' });
            
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `analytics-${new Date().toISOString().split('T')[0]}.csv`;
            a.click();
            
            window.URL.revokeObjectURL(url);
            this.showNotification('Analytics export downloaded', 'success');
            
        } catch (error) {
            console.error('❌ Analytics export failed:', error);
        }
    }

    // ============================
    // UTILITY FUNCTIONS
    // ============================

    logout() {
        if (confirm('Are you sure you want to logout?')) {
            localStorage.removeItem('servicePortalToken');
            window.location.href = '/admin-login';
        }
    }
}

// Global functions for HTML onclick handlers
window.showTab = function(tabName) {
    if (window.servicePortal) {
        window.servicePortal.showTab(tabName);
    }
};

window.logout = function() {
    if (window.servicePortal) {
        window.servicePortal.logout();
    }
};

window.refreshDashboard = function() {
    if (window.servicePortal) {
        window.servicePortal.refreshDashboard();
    }
};

window.exportOrganizations = function() {
    if (window.servicePortal) {
        window.servicePortal.exportOrganizations();
    }
};

window.exportAnalytics = function() {
    if (window.servicePortal) {
        window.servicePortal.exportAnalytics();
    }
};

window.filterOrganizations = function() {
    if (window.servicePortal) {
        window.servicePortal.filterOrganizations();
    }
};

window.filterPlans = function() {
    if (window.servicePortal) {
        window.servicePortal.filterPlans();
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    window.servicePortal = new ServicePortal();
});